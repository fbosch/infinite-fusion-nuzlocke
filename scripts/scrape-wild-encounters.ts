#!/usr/bin/env node

import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ProcessedPokemonData } from './fetch-pokemon-data';
import { ConsoleFormatter } from './console-utils';

const WILD_ENCOUNTERS_CLASSIC_URL = 'https://infinitefusion.fandom.com/wiki/Wild_Encounters';
const WILD_ENCOUNTERS_REMIX_URL = 'https://infinitefusion.fandom.com/wiki/Wild_Encounters/Remix';

interface RouteEncounters {
  routeName: string;
  routeId?: number;
  pokemonIds: number[]; // These are custom Infinite Fusion IDs
}

// Pre-compile regex patterns for better performance
const ROUTE_PATTERN = /^(Route \d+|Viridian Forest|Secret Garden|Hidden Forest|Viridian River)/i;
const ROUTE_ID_PATTERN = /\(ID\s+(\d+)\)/i;
const ROUTE_CLEAN_PATTERN = /\s*\(ID\s+\d+\)\s*$/i;

// Global Pokemon data cache - load once, use twice
let globalPokemonNameToId: Map<string, number> | null = null;

// Load Pokemon data once and cache it globally
async function getOrLoadPokemonData(): Promise<Map<string, number>> {
  if (globalPokemonNameToId) {
    return globalPokemonNameToId;
  }

  try {
    const dataPath = path.join(process.cwd(), 'data', 'pokemon-data.json');
    const data = await fs.readFile(dataPath, 'utf8');
    const pokemonArray: ProcessedPokemonData[] = JSON.parse(data);

    const nameToIdMap = new Map<string, number>();

    for (const pokemon of pokemonArray) {
      // Store various name formats for matching (keep original simple approach)
      const cleanName = pokemon.name.toLowerCase().replace(/[^a-z]/g, '');
      nameToIdMap.set(pokemon.name, pokemon.id);
      nameToIdMap.set(pokemon.name.toLowerCase(), pokemon.id);
      nameToIdMap.set(cleanName, pokemon.id);

      // Also handle special characters and variations
      const variations = [
        pokemon.name.replace(/♀/g, 'F').replace(/♂/g, 'M'),
        pokemon.name.replace(/♀/g, '').replace(/♂/g, ''),
        pokemon.name.replace(/\./g, ''),
        pokemon.name.replace(/'/g, ''),
        pokemon.name.replace(/\s+/g, '')
      ];

      variations.forEach(variation => {
        nameToIdMap.set(variation, pokemon.id);
        nameToIdMap.set(variation.toLowerCase(), pokemon.id);
        nameToIdMap.set(variation.toLowerCase().replace(/[^a-z]/g, ''), pokemon.id);
      });
    }

    globalPokemonNameToId = nameToIdMap;
    ConsoleFormatter.success(`Loaded ${pokemonArray.length} Pokemon for name lookup (cached globally)`);
    return nameToIdMap;
  } catch (error) {
    ConsoleFormatter.error(`Error loading Pokemon data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

// Function to clean route names for deduplication
function cleanRouteName(routeName: string): string {
  return routeName.replace(ROUTE_CLEAN_PATTERN, '').trim();
}

// Function to extract route ID from text like "Route 1 (ID 78)"
function extractRouteId(routeName: string): number | undefined {
  const match = routeName.match(ROUTE_ID_PATTERN);
  return match ? parseInt(match[1], 10) : undefined;
}

// Function to find Pokemon custom ID by name with fuzzy matching (keep original simple approach)
function findPokemonId(text: string, nameToIdMap: Map<string, number>): number | null {
  // Try different variations of the text
  const variations = [
    text,                                     // Original: "Pidgey"
    text.toLowerCase(),                       // Lowercase: "pidgey"
    text.toLowerCase().replace(/[^a-z]/g, ''), // Clean: "pidgey"
    text.trim(),                             // Trimmed
    text.trim().toLowerCase(),               // Trimmed lowercase
    text.replace(/♀/g, 'F').replace(/♂/g, 'M'), // Gender symbols to letters
    text.replace(/♀/g, '').replace(/♂/g, ''), // Remove gender symbols
    text.replace(/\./g, ''),                 // Remove dots
    text.replace(/'/g, ''),                  // Remove apostrophes
    text.replace(/\s+/g, '')                 // Remove spaces
  ];

  for (const variation of variations) {
    if (nameToIdMap.has(variation)) {
      return nameToIdMap.get(variation)!;
    }

    // Also try lowercase version of each variation
    const lowerVariation = variation.toLowerCase();
    if (nameToIdMap.has(lowerVariation)) {
      return nameToIdMap.get(lowerVariation)!;
    }

    // And clean version
    const cleanVariation = lowerVariation.replace(/[^a-z]/g, '');
    if (nameToIdMap.has(cleanVariation)) {
      return nameToIdMap.get(cleanVariation)!;
    }
  }

  return null;
}

async function scrapeWildEncounters(url: string, isRemix: boolean = false): Promise<RouteEncounters[]> {
  try {
    const modeType = isRemix ? 'Remix' : 'Classic';

    // Fetch the webpage
    const response = await ConsoleFormatter.withSpinner(
      `Fetching ${modeType} Wild Encounters page...`,
      () => fetch(url)
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await ConsoleFormatter.withSpinner(
      'Parsing HTML content...',
      () => response.text()
    );

    const $ = cheerio.load(html);
    const pokemonNameToId = await getOrLoadPokemonData(); // Use cached data

    // Focus on main content area
    const mainContent = $('.mw-parser-output');
    const routes: RouteEncounters[] = [];
    const routesSeen = new Set<string>(); // Track cleaned route names

    // Find route headings - back to original approach but with pre-compiled regex
    const allElements = mainContent.find('*');

    let routesProcessed = 0;
    const progressBar = ConsoleFormatter.createMiniProgressBar(allElements.length, 'Scanning for routes...');

    allElements.each((index: number, element: any) => {
      const $element = $(element);
      const fullText = $element.text().trim();

      // Update progress periodically
      if (index % 100 === 0) {
        progressBar.update(index, { status: `Scanning elements... (${routesProcessed} routes found)` });
      }

      // Look for route patterns - use pre-compiled regex
      if (ROUTE_PATTERN.test(fullText)) {
        // Make sure this isn't deeply nested content (allow some basic formatting)
        const children = $element.children();
        if (children.length <= 2) {

          const cleanedRouteName = cleanRouteName(fullText);
          const routeId = extractRouteId(fullText);

          // Skip if we've already processed this route
          if (routesSeen.has(cleanedRouteName)) {
            return;
          }
          routesSeen.add(cleanedRouteName);

          routesProcessed++;
          progressBar.update(index, { status: `Processing: ${cleanedRouteName}` });

          // Find Pokemon data near this route
          const pokemonIds = new Set<number>();
          let current = $element;
          let steps = 0;
          const maxSteps = 25;

          // Search through next siblings
          while (steps < maxSteps && current.next().length > 0) {
            current = current.next();
            const currentText = current.text().trim();

            // Stop if we hit another route - use pre-compiled regex
            if (ROUTE_PATTERN.test(currentText)) {
              break;
            }

            // Extract Pokemon from tables
            const tables = current.is('table') ? current : current.find('table');
            if (tables.length > 0) {
              tables.each((tableIndex: number, table: any) => {
                $(table).find('td, th').each((cellIndex: number, cell: any) => {
                  const cellText = $(cell).text().trim();

                  // Skip headers and non-Pokemon content (keep original simple approach)
                  if (cellText &&
                    cellText.length >= 3 &&
                    cellText.length <= 20 &&
                    !cellText.includes('Level') &&
                    !cellText.includes('Rate') &&
                    !cellText.includes('%') &&
                    !cellText.includes('Type') &&
                    !cellText.includes('Pokémon') &&
                    !/^\d+$/.test(cellText) &&
                    !/^\d+-\d+$/.test(cellText) &&
                    !/^\d+%$/.test(cellText)) {

                    // Try to find Pokemon by name (returns custom ID)
                    const pokemonId = findPokemonId(cellText, pokemonNameToId);
                    if (pokemonId) {
                      pokemonIds.add(pokemonId);
                    }
                  }
                });
              });
            }

            steps++;
          }

          const sortedIds = Array.from(pokemonIds).sort((a, b) => a - b);

          const routeData: RouteEncounters = {
            routeName: cleanedRouteName,
            pokemonIds: sortedIds
          };

          if (routeId !== undefined) {
            routeData.routeId = routeId;
          }

          routes.push(routeData);
        }
      }
    });

    progressBar.update(allElements.length, { status: 'Scanning complete!' });
    progressBar.stop();

    ConsoleFormatter.success(`${modeType} scraping complete! Found ${routes.length} unique routes`);

    return routes;

  } catch (error) {
    ConsoleFormatter.error(`Error scraping ${isRemix ? 'Remix' : 'Classic'} encounters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

async function main() {
  const startTime = Date.now();
  ConsoleFormatter.printHeader('Scraping Wild Encounters', 'Scraping wild encounter data from the wiki');

  try {
    const dataDir = path.join(process.cwd(), 'data');
    await fs.mkdir(dataDir, { recursive: true });

    const [classicRoutes, remixRoutes] = await Promise.all([
      (async () => {
        ConsoleFormatter.info('Scraping Classic Mode encounters...');
        return scrapeWildEncounters(WILD_ENCOUNTERS_CLASSIC_URL, false);
      })(),
      (async () => {
        ConsoleFormatter.info('Scraping Remix Mode encounters...');
        return scrapeWildEncounters(WILD_ENCOUNTERS_REMIX_URL, true);
      })()
    ]);

    // Write separate files in parallel
    ConsoleFormatter.info('Saving encounter data to files...');
    const classicPath = path.join(dataDir, 'route-encounters-classic.json');
    const remixPath = path.join(dataDir, 'route-encounters-remix.json');

    await Promise.all([
      fs.writeFile(classicPath, JSON.stringify(classicRoutes, null, 2)),
      fs.writeFile(remixPath, JSON.stringify(remixRoutes, null, 2))
    ]);

    // Get file stats in parallel
    const [classicStats, remixStats] = await Promise.all([
      fs.stat(classicPath),
      fs.stat(remixPath)
    ]);

    const duration = Date.now() - startTime;

    // Calculate totals
    const uniqueClassicPokemon = new Set(classicRoutes.flatMap(route => route.pokemonIds)).size;
    const uniqueRemixPokemon = new Set(remixRoutes.flatMap(route => route.pokemonIds)).size;

    // Success summary
    ConsoleFormatter.printSummary('Wild Encounters Scraping Complete!', [
      { label: 'Unique Classic Pokemon', value: uniqueClassicPokemon, color: 'yellow' },
      { label: 'Classic data saved to', value: classicPath, color: 'cyan' },
      { label: 'Classic file size', value: ConsoleFormatter.formatFileSize(classicStats.size), color: 'cyan' },
      { label: 'Remix data saved to', value: remixPath, color: 'cyan' },
      { label: 'Unique Remix Pokemon', value: uniqueRemixPokemon, color: 'yellow' },
      { label: 'Remix file size', value: ConsoleFormatter.formatFileSize(remixStats.size), color: 'cyan' },
      { label: 'Duration', value: ConsoleFormatter.formatDuration(duration), color: 'yellow' }
    ]);

  } catch (error) {
    ConsoleFormatter.error(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  } finally {
    // Clear global cache to free memory
    globalPokemonNameToId = null;
  }
}

// Check if this script is being run directly
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main();
} 