#!/usr/bin/env node

import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConsoleFormatter } from './console-utils';
import {
  findPokemonId,
  isPotentialPokemonName,
  type PokemonNameMap
} from './utils/pokemon-name-utils';
import {
  isRoutePattern,
  processRouteName
} from './utils/route-utils';
import { loadPokemonNameMap, type DexEntry } from './utils/data-loading-utils';
import type { ProcessedPokemonData } from './fetch-pokemon-data';

const WILD_ENCOUNTERS_CLASSIC_URL = 'https://infinitefusion.fandom.com/wiki/Wild_Encounters';
const WILD_ENCOUNTERS_REMIX_URL = 'https://infinitefusion.fandom.com/wiki/Wild_Encounters/Remix';

interface RouteEncounters {
  routeName: string;
  routeId?: number;
  pokemonIds: number[]; // These are custom Infinite Fusion IDs
}

async function scrapeWildEncounters(url: string, isRemix: boolean = false): Promise<RouteEncounters[]> {
  ConsoleFormatter.printHeader('Scraping Wild Encounters', 'Scraping wild encounter data from the wiki');
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
    const pokemonNameMap = await loadPokemonNameMap(); // Use cached data

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

      // Look for route patterns
      if (isRoutePattern(fullText)) {
        // Make sure this isn't deeply nested content (allow some basic formatting)
        const children = $element.children();
        if (children.length <= 2) {

          const { cleanName: cleanedRouteName, routeId } = processRouteName(fullText);

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

            // Stop if we hit another route
            if (isRoutePattern(currentText)) {
              break;
            }

            // Extract Pokemon from tables
            const tables = current.is('table') ? current : current.find('table');
            if (tables.length > 0) {
              tables.each((tableIndex: number, table: any) => {
                $(table).find('td, th').each((cellIndex: number, cell: any) => {
                  const cellText = $(cell).text().trim();

                  // Skip headers and non-Pokemon content
                  if (isPotentialPokemonName(cellText)) {

                    // Try to find Pokemon by name (returns custom ID)
                    const pokemonId = findPokemonId(cellText, pokemonNameMap);
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
    ConsoleFormatter.success(`${modeType} scraping complete!`);

    return routes;

  } catch (error) {
    ConsoleFormatter.error(`Error scraping ${isRemix ? 'Remix' : 'Classic'} encounters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

async function main() {
  const startTime = Date.now();

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
      { label: 'Unique Remix Pokemon', value: uniqueRemixPokemon, color: 'yellow' },
      { label: 'Remix data saved to', value: remixPath, color: 'cyan' },
      { label: 'Remix file size', value: ConsoleFormatter.formatFileSize(remixStats.size), color: 'cyan' },
      { label: 'Duration', value: ConsoleFormatter.formatDuration(duration), color: 'yellow' }
    ]);

  } catch (error) {
    ConsoleFormatter.error(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Check if this script is being run directly
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main();
} 