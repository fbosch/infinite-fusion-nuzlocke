#!/usr/bin/env node

import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { ConsoleFormatter } from './utils/console-utils';
import {
  findPokemonId,
  isPotentialPokemonName,
} from './utils/pokemon-name-utils';
import {
  processRouteName
} from './utils/route-utils';
import { loadPokemonNameMap } from './utils/data-loading-utils';

const LEGENDARY_POKEMON_URL = 'https://infinitefusion.fandom.com/wiki/Legendary_Pok%C3%A9mon';

interface LegendaryRoute {
  routeName: string;
  encounters: number[]; // Array of Pokémon IDs
}

async function scrapeLegendaryEncounters(): Promise<LegendaryRoute[]> {
  ConsoleFormatter.printHeader('Scraping Legendary Pokémon', 'Scraping legendary encounter data from the wiki');
  
  try {
    // Fetch the webpage
    const response = await ConsoleFormatter.withSpinner(
      'Fetching Legendary Pokémon page...',
      () => fetch(LEGENDARY_POKEMON_URL)
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await ConsoleFormatter.withSpinner(
      'Parsing HTML content...',
      () => response.text()
    );

    const $ = cheerio.load(html);
    const pokemonNameMap = await loadPokemonNameMap();

    // Focus on main content area
    const mainContent = $('.mw-parser-output');
    const routeMap = new Map<string, number[]>(); // routeName -> array of pokemon IDs

    // Find all h3 headings with mw-headline spans (legendary names)
    const headings = mainContent.find('h3');
    
    ConsoleFormatter.info(`Found ${headings.length} h3 headings`);

    headings.each((index: number, heading: any) => {
      const $heading = $(heading);
      const headlineSpan = $heading.find('span.mw-headline');
      
      if (headlineSpan.length === 0) {
        return; // Skip if no mw-headline span
      }
      
      const pokemonName = headlineSpan.text().trim();
      
      // Skip if it's not a Pokémon name
      if (!isPotentialPokemonName(pokemonName)) {
        return;
      }

      // Handle multiple Pokémon names separated by " / "
      const pokemonNames = pokemonName.split('/').map(name => name.trim());
      
      for (const name of pokemonNames) {
        // Try to find all forms of this Pokémon
        const pokemonIds: number[] = [];
        
        // Look for exact match first
        const exactMatch = findPokemonId(name, pokemonNameMap);
        if (exactMatch) {
          pokemonIds.push(exactMatch);
        }
        
        // Also look for entries that start with the name (for forms)
        for (const [pokemonName, id] of pokemonNameMap.nameToId.entries()) {
          if (pokemonName.startsWith(name + ' ') && pokemonName !== name) {
            pokemonIds.push(id);
          }
        }
        
        if (pokemonIds.length === 0) {
          ConsoleFormatter.warn(`Could not find any forms for legendary: ${name}`);
          continue;
        }

        let nextElement = $heading.next();
        let tablesChecked = 0;
        
        while (nextElement.length > 0 && tablesChecked < 10) {
          if (nextElement.is('table.article-table')) {
            // Process the table - extract route name from first row
            let routeName = '';
            
            $(nextElement).find('tr').each((rowIndex: number, row: any) => {
              const $row = $(row);
              const cells = $row.find('td');
              
              // Get the route name from the first row, first cell
              if (rowIndex === 0 && cells.length >= 1) {
                const $cell = $(cells[0]);
                const anchors = $cell.find('a');
                let rawRouteName = '';
                
                if (anchors.length > 0) {
                  // Use the text from the last anchor tag
                  rawRouteName = anchors.last().text().trim();
                } else {
                  // Fallback to cell text if no anchors found
                  rawRouteName = $cell.text().trim();
                }
                
                const { cleanName } = processRouteName(rawRouteName);
                routeName = cleanName;
              }
            });
            
            // If we have a valid route name, add all pokemon forms to that route
            if (routeName && routeName !== 'Location' && routeName !== '') {
              if (!routeMap.has(routeName)) {
                routeMap.set(routeName, []);
              }
              // Add all forms of this pokemon
              for (const id of pokemonIds) {
                routeMap.get(routeName)!.push(id);
              }
              ConsoleFormatter.success(`Added ${pokemonIds.length} forms of ${name} to route: ${routeName}`);
            }
            
            break; // Found and processed one table, stop looking
          }
          
          // Stop if we hit another h3 heading
          if (nextElement.is('h3')) {
            break;
          }
          
          tablesChecked++;
          nextElement = nextElement.next();
        }
      }
    });

    // Convert map to array format
    const routes: LegendaryRoute[] = Array.from(routeMap.entries()).map(([routeName, encounters]) => ({
      routeName,
      encounters: encounters.sort((a, b) => a - b) // Sort by ID
    }));

    ConsoleFormatter.success(`Scraping complete! Found ${routes.length} routes with legendary encounters`);

    return routes;

  } catch (error) {
    ConsoleFormatter.error(`Error scraping legendary encounters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

async function main() {
  const startTime = Date.now();

  try {
    const dataDir = path.join(process.cwd(), 'data', 'shared');
    
    // Create directory if it doesn't exist
    await fs.mkdir(dataDir, { recursive: true });

    ConsoleFormatter.info('Scraping Legendary Pokémon encounters...');
    const legendaries = await scrapeLegendaryEncounters();

    // Write to file
    ConsoleFormatter.info('Saving legendary encounter data to file...');
    const outputPath = path.join(dataDir, 'legendary-encounters.json');
    await fs.writeFile(outputPath, JSON.stringify(legendaries, null, 2));

    // Get file stats
    const stats = await fs.stat(outputPath);
    const duration = Date.now() - startTime;

    ConsoleFormatter.success(`Legendary scraping completed successfully!`);
    ConsoleFormatter.info(`Legendaries: ${legendaries.length} (${(stats.size / 1024).toFixed(1)} KB)`);
    ConsoleFormatter.info(`Total duration: ${(duration / 1000).toFixed(2)}s`);

  } catch (error) {
    ConsoleFormatter.error(`Legendary scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 