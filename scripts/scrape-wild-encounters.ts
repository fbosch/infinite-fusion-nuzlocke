#!/usr/bin/env node

import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ProcessedPokemonData } from './fetch-pokemon-data';

const WILD_ENCOUNTERS_CLASSIC_URL = 'https://infinitefusion.fandom.com/wiki/Wild_Encounters';
const WILD_ENCOUNTERS_REMIX_URL = 'https://infinitefusion.fandom.com/wiki/Wild_Encounters/Remix';

interface RouteEncounters {
  routeName: string;
  routeId?: number;
  pokemonIds: number[]; // These are custom Infinite Fusion IDs
}


// Load Pokemon data and create name-to-custom-ID mapping
async function loadPokemonData(): Promise<Map<string, number>> {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'pokemon-data.json');
    const data = await fs.readFile(dataPath, 'utf8');
    const pokemonArray: ProcessedPokemonData[] = JSON.parse(data);

    const nameToIdMap = new Map<string, number>();

    for (const pokemon of pokemonArray) {
      // Store various name formats for matching
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

    console.log(`Loaded ${pokemonArray.length} Pokemon for name lookup`);
    return nameToIdMap;
  } catch (error) {
    console.error('Error loading Pokemon data:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// Function to clean route names for deduplication
function cleanRouteName(routeName: string): string {
  return routeName
    .replace(/\s*\(ID\s+\d+\)\s*$/i, '') // Remove (ID 123) suffix
    .trim();
}

// Function to extract route ID from text like "Route 1 (ID 78)"
function extractRouteId(routeName: string): number | undefined {
  const match = routeName.match(/\(ID\s+(\d+)\)/i);
  return match ? parseInt(match[1], 10) : undefined;
}

// Function to find Pokemon custom ID by name with fuzzy matching
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
    console.log(`Fetching ${modeType} Wild Encounters page...`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    console.log('Page fetched successfully. Parsing HTML...');

    const $ = cheerio.load(html);
    const pokemonNameToId = await loadPokemonData();

    // Focus on main content area
    const mainContent = $('.mw-parser-output');
    const routes: RouteEncounters[] = [];
    const routesSeen = new Set<string>(); // Track cleaned route names

    // Find route headings - look for text patterns
    const allElements = mainContent.find('*');
    console.log(`Scanning ${allElements.length} elements for routes...`);

    allElements.each((index: number, element: any) => {
      const $element = $(element);
      const fullText = $element.text().trim();

      // Look for route patterns
      if (fullText.match(/^(Route \d+|Viridian Forest|Secret Garden|Hidden Forest|Viridian River)/i)) {
        // Make sure this isn't deeply nested content (allow some basic formatting)
        const children = $element.children();
        if (children.length <= 2) {

          const cleanedRouteName = cleanRouteName(fullText);
          const routeId = extractRouteId(fullText);

          // Skip if we've already processed this route
          if (routesSeen.has(cleanedRouteName)) {
            console.log(`Skipping duplicate: ${cleanedRouteName}`);
            return;
          }
          routesSeen.add(cleanedRouteName);

          console.log(`Processing: ${cleanedRouteName}${routeId ? ` (ID: ${routeId})` : ''}`);

          // Find Pokemon data near this route
          const pokemonIds = new Set<number>();
          let current = $element;
          let steps = 0;
          const maxSteps = 25;

          // Search through next siblings
          while (steps < maxSteps && current.next().length > 0) {
            current = current.next();
            const currentText = current.text().trim();

            // Stop if we hit another route
            if (currentText.match(/^(Route \d+|Viridian Forest|Secret Garden|Hidden Forest|Viridian River)/i)) {
              break;
            }

            // Extract Pokemon from tables
            const tables = current.is('table') ? current : current.find('table');
            if (tables.length > 0) {
              console.log(`  Found table(s), extracting Pokemon...`);

              tables.each((tableIndex: number, table: any) => {
                $(table).find('td, th').each((cellIndex: number, cell: any) => {
                  const cellText = $(cell).text().trim();

                  // Skip headers and non-Pokemon content
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
                      console.log(`    Found: ${cellText} (Custom ID: ${pokemonId})`);
                    }
                  }
                });
              });
            }

            steps++;
          }

          const sortedIds = Array.from(pokemonIds).sort((a, b) => a - b);
          console.log(`  ${cleanedRouteName}: ${sortedIds.length} Pokemon found\n`);

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

    console.log(`\n${modeType} scraping complete!`);
    console.log(`Total unique routes: ${routes.length}`);
    console.log(`Total encounters: ${routes.reduce((sum, route) => sum + route.pokemonIds.length, 0)}`);
    console.log(`Unique Pokemon: ${new Set(routes.flatMap(route => route.pokemonIds)).size}`);

    return routes;

  } catch (error) {
    console.error(`❌ Error scraping ${isRemix ? 'Remix' : 'Classic'} encounters:`, error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

async function main() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    await fs.mkdir(dataDir, { recursive: true });

    // Scrape Classic encounters
    console.log('=== SCRAPING CLASSIC ENCOUNTERS ===');
    const classicRoutes = await scrapeWildEncounters(WILD_ENCOUNTERS_CLASSIC_URL, false);

    console.log('\n=== SCRAPING REMIX ENCOUNTERS ===');
    const remixRoutes = await scrapeWildEncounters(WILD_ENCOUNTERS_REMIX_URL, true);

    // Write separate files
    const classicPath = path.join(dataDir, 'route-encounters-classic.json');
    const remixPath = path.join(dataDir, 'route-encounters-remix.json');

    await fs.writeFile(classicPath, JSON.stringify(classicRoutes, null, 2));
    await fs.writeFile(remixPath, JSON.stringify(remixRoutes, null, 2));

    console.log(`\n✅ Successfully scraped wild encounters!`);
    console.log(`📁 Classic: ${classicPath} (${classicRoutes.length} routes)`);
    console.log(`📁 Remix: ${remixPath} (${remixRoutes.length} routes)`);

  } catch (error) {
    console.error('❌ Fatal error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Check if this script is being run directly
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main();
} 