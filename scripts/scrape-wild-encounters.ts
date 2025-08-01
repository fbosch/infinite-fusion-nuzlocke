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

/**
 * Detects encounter type from text content like "Surf", "Old Rod", etc.
 */
function detectEncounterType(text: string): 'grass' | 'surf' | 'fishing' | 'special' | 'cave' | 'rock_smash' | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const normalizedText = text.toLowerCase().trim();

  // Surf encounters - be more specific about surf detection
  if (normalizedText === 'surf' || 
      normalizedText.includes('surfing') ||
      (normalizedText.includes('surf') && !normalizedText.includes('rod'))) {
    return 'surf';
  }

  // Fishing encounters - only specific rod types
  if (normalizedText.includes('old rod') || 
      normalizedText.includes('good rod') ||
      normalizedText.includes('super rod') ||
      normalizedText.includes('fishing rod') ||
      normalizedText.includes('rod fishing')) {
    return 'fishing';
  }

  // Rock Smash encounters
  if (normalizedText.includes('rock smash') ||
      normalizedText.includes('smash rock') ||
      normalizedText.includes('breaking rocks') ||
      normalizedText.includes('break rock')) {
    return 'rock_smash';
  }

  // Cave encounters
  if (normalizedText.includes('cave') ||
      normalizedText.includes('cavern') ||
      normalizedText.includes('underground') ||
      normalizedText.includes('tunnel') ||
      normalizedText.includes('mine') ||
      normalizedText.includes('grotto')) {
    return 'cave';
  }

  // Grass encounters
  if (normalizedText.includes('grass') || 
      normalizedText.includes('walking') ||
      normalizedText.includes('wild grass') ||
      normalizedText.includes('overworld')) {
    return 'grass';
  }

  // Special encounters (gift, trade, etc.)
  if (normalizedText.includes('gift') ||
      normalizedText.includes('trade') ||
      normalizedText.includes('special') ||
      normalizedText.includes('event')) {
    return 'special';
  }

  return null;
}



/**
 * Validates if a potential route name is actually a valid route and not CSS or other content
 */
function isValidRouteName(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const trimmedText = text.trim();

  // Exclude if too long (CSS content is typically very long)
  if (trimmedText.length > 100) {
    return false;
  }

  // Exclude CSS content
  if (trimmedText.includes('display:') ||
      trimmedText.includes('width:') ||
      trimmedText.includes('height:') ||
      trimmedText.includes('margin:') ||
      trimmedText.includes('padding:') ||
      trimmedText.includes('background:') ||
      trimmedText.includes('border:') ||
      trimmedText.includes('.mw-parser-output') ||
      trimmedText.includes('px') ||
      trimmedText.includes('em') ||
      trimmedText.includes('{') ||
      trimmedText.includes('}') ||
      trimmedText.includes(';')) {
    return false;
  }

  // Exclude very short or meaningless text
  if (trimmedText.length < 3) {
    return false;
  }

  // Note: Removed alpha character ratio check as it was filtering out valid location names with ID numbers

  return true;
}

interface PokemonEncounter {
  pokemonId: number; // Custom Infinite Fusion ID
  encounterType: 'grass' | 'surf' | 'fishing' | 'special' | 'cave' | 'rock_smash';
}

interface RouteEncounters {
  routeName: string;
  encounters: PokemonEncounter[];
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
  
  const locationGroups = new Map<string, PokemonEncounter[]>();

  for (const route of routes) {
    // Find if this route is a sub-location of any existing location
    const parentLocation = findParentLocation(route.routeName, existingLocationNames);
    const baseLocation = parentLocation || route.routeName;
    

    
    if (!locationGroups.has(baseLocation)) {
      locationGroups.set(baseLocation, []);
    }
    
    // Add all encounters to the base location (will deduplicate later)
    locationGroups.get(baseLocation)!.push(...route.encounters);
  }

  // Convert back to RouteEncounters format with deduplication
  return Array.from(locationGroups.entries()).map(([routeName, encounters]) => {
    // Deduplicate encounters by creating a unique key for each encounter
    const uniqueEncounters = new Map<string, PokemonEncounter>();
    
    for (const encounter of encounters) {
      const key = `${encounter.pokemonId}-${encounter.encounterType}`;
      if (!uniqueEncounters.has(key)) {
        uniqueEncounters.set(key, encounter);
      }
    }
    
    return {
      routeName,
      encounters: Array.from(uniqueEncounters.values()).sort((a, b) => {
        // Sort by encounter type first, then by pokemon ID
        const typeOrder = { grass: 0, cave: 1, rock_smash: 2, surf: 3, fishing: 4, special: 5 };
        const typeComparison = typeOrder[a.encounterType] - typeOrder[b.encounterType];
        return typeComparison !== 0 ? typeComparison : a.pokemonId - b.pokemonId;
      })
    };
  });
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
      if (isRoutePattern(fullText) && isValidRouteName(fullText)) {
        // Make sure this isn't deeply nested content (allow some basic formatting)
        const children = $element.children();
        if (children.length <= 2) {

          const { cleanName: cleanedRouteName, routeId } = processRouteName(fullText);

          // Additional validation on the cleaned name
          if (!isValidRouteName(cleanedRouteName)) {
            return;
          }

          // Create unique identifier that includes both name and ID for duplicate detection
          const uniqueIdentifier = routeId ? `${cleanedRouteName}#${routeId}` : cleanedRouteName;

          // Skip if we've already processed this exact route (including ID)
          if (routesSeen.has(uniqueIdentifier)) {
            return;
          }
          routesSeen.add(uniqueIdentifier);

          routesProcessed++;
          progressBar.update(index, { status: `Processing: ${cleanedRouteName}` });

          // Find Pokemon data in the immediately following table
          const encounters: PokemonEncounter[] = [];
          let currentEncounterType: 'grass' | 'surf' | 'fishing' | 'special' | 'cave' | 'rock_smash' = 'grass'; // Default to grass

          // Look for the next table with classes 'IFTable encounterTable'
          let nextElement = $element.next();
          while (nextElement.length > 0) {
            if (nextElement.is('table.IFTable.encounterTable')) {
              // Found the encounter table for this route - process it
              $(nextElement).find('tr').each((rowIndex: number, row: any) => {
                const $row = $(row);
                
                // Check if this row contains a header that spans multiple columns (encounter type header)
                const headerCell = $row.find('th[colspan]').first();
                if (headerCell.length > 0) {
                  const headerText = headerCell.text().trim();
                  const detectedType = detectEncounterType(headerText);
                  if (detectedType) {
                    currentEncounterType = detectedType;
                    return; // Skip processing this row for Pokemon
                  }
                }
                
                // Process Pokemon in this row using the current encounter type
                $row.find('td').each((cellIndex: number, cell: any) => {
                  const cellText = $(cell).text().trim();

                  // Skip headers and non-Pokemon content
                  if (isPotentialPokemonName(cellText)) {
                    // Try to find Pokemon by name (returns custom ID)
                    const pokemonId = findPokemonId(cellText, pokemonNameMap);
                    
                    if (pokemonId) {
                      encounters.push({
                        pokemonId,
                        encounterType: currentEncounterType
                      });
                    }
                  }
                });
              });
              
              break; // Found and processed one table, stop looking
            }
            
            // Stop if we hit another route heading
            if (isRoutePattern(nextElement.text().trim()) && isValidRouteName(nextElement.text().trim())) {
              break;
            }
            
            nextElement = nextElement.next();
          }

          const routeData: RouteEncounters = {
            routeName: cleanedRouteName,
            encounters: encounters
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