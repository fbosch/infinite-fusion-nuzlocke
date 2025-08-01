#!/usr/bin/env node

import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import { readFileSync } from 'fs';
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

/**
 * Consolidates sub-locations under their parent locations for Nuzlocke rules.
 * For example: Mt. Moon B1F, Mt. Moon B2F, Mt. Moon Summit -> Mt. Moon
 */
function consolidateSubLocations(routes: RouteEncounters[]): RouteEncounters[] {
  // Load existing locations to use as reference
  const locationsPath = path.join(process.cwd(), 'data', 'shared', 'locations.json');
  const locationsData = JSON.parse(readFileSync(locationsPath, 'utf-8'));
  const existingLocationNames = locationsData.map((loc: any) => loc.name);
  
  const locationGroups = new Map<string, Set<number>>();

  for (const route of routes) {
    // Find if this route is a sub-location of any existing location
    const parentLocation = findParentLocation(route.routeName, existingLocationNames);
    const baseLocation = parentLocation || route.routeName;
    
    if (!locationGroups.has(baseLocation)) {
      locationGroups.set(baseLocation, new Set<number>());
    }
    
    // Add all Pokémon IDs to the base location set (automatically deduplicates)
    for (const pokemonId of route.pokemonIds) {
      locationGroups.get(baseLocation)!.add(pokemonId);
    }
  }

  // Convert back to RouteEncounters format
  return Array.from(locationGroups.entries()).map(([routeName, pokemonIdSet]) => ({
    routeName,
    pokemonIds: Array.from(pokemonIdSet).sort((a, b) => a - b)
  }));
}

/**
 * Finds if a route name is a sub-location of any existing location.
 * Returns the parent location name if found, null otherwise.
 */
function findParentLocation(routeName: string, existingLocations: string[]): string | null {
  // Define valid sub-location suffixes that indicate a real sub-location
  const validSubLocationSuffixes = [
    'B1F', 'B2F', 'B3F', 'B4F', 'B5F',
    '1F', '2F', '3F', '4F', '5F',
    'Summit', 'Square', 'Entrance', 'Exit',
    'Top', 'Bottom', 'Upper', 'Lower',
    'North', 'South', 'East', 'West',
    'Interior', 'Exterior', 'Cave', 'Depths',
    'Hidden', 'Center'
  ];

  // Check if any existing location is a prefix of the route name
  for (const location of existingLocations) {
    if (routeName.startsWith(location) && routeName !== location) {
      // Get the remainder after the location name
      const remainder = routeName.substring(location.length).trim();
      
      // Only consolidate if the remainder is a valid sub-location suffix
      if (remainder.length > 0 && validSubLocationSuffixes.some(suffix => remainder === suffix)) {
        return location;
      }
    }
  }
  
  return null;
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

          // Create unique identifier that includes both name and ID for duplicate detection
          const uniqueIdentifier = routeId ? `${cleanedRouteName}#${routeId}` : cleanedRouteName;

          // Skip if we've already processed this exact route (including ID)
          if (routesSeen.has(uniqueIdentifier)) {
            return;
          }
          routesSeen.add(uniqueIdentifier);

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

            // Look for all tables that appear after this route heading
            const tables = current.is('table') ? current : current.find('table');
            if (tables.length > 0) {
              // Process ALL tables we find for this route (not just the first one)
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
              break; // Stop after processing all tables in this section
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

    // Consolidate sub-locations under parent locations for Nuzlocke rules
    const consolidatedRoutes = consolidateSubLocations(routes);
    ConsoleFormatter.info(`Consolidated ${routes.length} locations into ${consolidatedRoutes.length} unique locations`);

    return consolidatedRoutes;

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