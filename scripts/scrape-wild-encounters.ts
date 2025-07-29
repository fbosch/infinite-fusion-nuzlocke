#!/usr/bin/env node

import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { ConsoleFormatter } from './console-utils';
import {
  findPokemonId,
  isPotentialPokemonName,
} from './utils/pokemon-name-utils';
import {
  isRoutePattern,
  processRouteName
} from './utils/route-utils';
import { loadPokemonNameMap } from './utils/data-loading-utils';

const WILD_ENCOUNTERS_CLASSIC_URL = 'https://infinitefusion.fandom.com/wiki/Wild_Encounters';
const WILD_ENCOUNTERS_REMIX_URL = 'https://infinitefusion.fandom.com/wiki/Wild_Encounters/Remix';

interface RouteEncounters {
  routeName: string;
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

          const { cleanName: cleanedRouteName } = processRouteName(fullText);

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
          const maxSteps = 10; // Much more limited search scope

          // Search through next siblings
          while (steps < maxSteps && current.next().length > 0) {
            current = current.next();
            const currentText = current.text().trim();

            // Stop if we hit another route
            if (isRoutePattern(currentText)) {
              break;
            }

            // Look for the first table that appears after this route heading
            const tables = current.is('table') ? current : current.find('table');
            if (tables.length > 0) {
              // Only process the first table we find for this route
              const firstTable = $(tables[0]);
              firstTable.find('td, th').each((cellIndex: number, cell: any) => {
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
              break; // Stop after processing the first table
            }

            steps++;
          }

          const sortedIds = Array.from(pokemonIds).sort((a, b) => a - b);

          const routeData: RouteEncounters = {
            routeName: cleanedRouteName,
            pokemonIds: sortedIds
          };

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
    const classicDir = path.join(dataDir, 'classic');
    const remixDir = path.join(dataDir, 'remix');
    
    // Create directories
    await fs.mkdir(classicDir, { recursive: true });
    await fs.mkdir(remixDir, { recursive: true });

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
    const classicPath = path.join(classicDir, 'encounters.json');
    const remixPath = path.join(remixDir, 'encounters.json');

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

    ConsoleFormatter.success(`Scraping completed successfully!`);
    ConsoleFormatter.info(`Classic encounters: ${classicRoutes.length} routes (${(classicStats.size / 1024).toFixed(1)} KB)`);
    ConsoleFormatter.info(`Remix encounters: ${remixRoutes.length} routes (${(remixStats.size / 1024).toFixed(1)} KB)`);
    ConsoleFormatter.info(`Total duration: ${(duration / 1000).toFixed(2)}s`);

  } catch (error) {
    ConsoleFormatter.error(`Scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 