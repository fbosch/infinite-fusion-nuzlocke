#!/usr/bin/env node

import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { ConsoleFormatter } from './utils/console-utils';
import {
  findPokemonId,
  isPotentialPokemonName,
} from './utils/pokemon-name-utils';
import { loadPokemonNameMap } from './utils/data-loading-utils';

// Safari Zone area pages
const SAFARI_ZONE_PAGES = [
  'https://infinitefusion.fandom.com/wiki/Safari_Zone_(Area_1)',
  'https://infinitefusion.fandom.com/wiki/Safari_Zone_(Area_2)', 
  'https://infinitefusion.fandom.com/wiki/Safari_Zone_(Area_3)',
  'https://infinitefusion.fandom.com/wiki/Safari_Zone_(Area_4)',
  'https://infinitefusion.fandom.com/wiki/Safari_Zone_(Area_5)',
];

interface PokemonEncounter {
  pokemonId: number;
  encounterType: 'grass' | 'surf' | 'fishing' | 'special' | 'cave' | 'rock_smash';
}

interface RouteEncounters {
  routeName: string;
  encounters: PokemonEncounter[];
}

/**
 * Detects encounter type from text content like "Surf", "Old Rod", etc.
 */
function detectEncounterType(text: string): 'grass' | 'surf' | 'fishing' | 'special' | 'cave' | 'rock_smash' | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const normalizedText = text.toLowerCase().trim();

  // Surf encounters
  if (normalizedText === 'surf' || 
      normalizedText.includes('surfing') ||
      (normalizedText.includes('surf') && !normalizedText.includes('rod'))) {
    return 'surf';
  }

  // Fishing encounters
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
      normalizedText.includes('headbutt')) {
    return 'rock_smash';
  }

  // Cave encounters
  if (normalizedText.includes('cave') ||
      normalizedText.includes('underground') ||
      normalizedText.includes('depths')) {
    return 'cave';
  }

  // Special encounters (might include gift, trade, etc.)
  if (normalizedText.includes('gift') ||
      normalizedText.includes('trade') ||
      normalizedText.includes('static') ||
      normalizedText.includes('overworld')) {
    return 'special';
  }

  // Default to grass if we can't determine the type
  return 'grass';
}

/**
 * Scrapes encounters from a single Safari Zone area page
 */
async function scrapeSafariAreaPage(url: string): Promise<RouteEncounters | null> {
  const areaName = url.split('/').pop()?.replace(/_/g, ' ').replace('%28', '(').replace('%29', ')') || 'Unknown Safari Area';

  try {
    const response = await fetch(url);
    if (!response.ok) {
      ConsoleFormatter.warn(`Failed to fetch ${areaName}: HTTP ${response.status}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const pokemonNameMap = await loadPokemonNameMap();

    // Get the location name from the page title
    const pageTitle = $('h1.page-header__title, #firstHeading').first().text().trim() || areaName;

    const encounters: PokemonEncounter[] = [];
    let currentEncounterType: 'grass' | 'surf' | 'fishing' | 'special' | 'cave' | 'rock_smash' = 'grass';

    // Find all encounter tables on the page
    $('table.IFTable.encounterTable').each((tableIndex, table) => {
      const $table = $(table);
      
      // Look for encounter type headers in the table
      $table.find('tr').each((rowIndex, row) => {
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
        $row.find('td').each((cellIndex, cell) => {
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
    });

    if (encounters.length > 0) {
      return {
        routeName: pageTitle,
        encounters: encounters
      };
    } else {
      ConsoleFormatter.warn(`No encounters found in ${pageTitle}`);
      return null;
    }

  } catch (error) {
    ConsoleFormatter.error(`Error scraping ${areaName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

/**
 * Main function to scrape all Safari Zone areas
 */
async function main() {
  const startTime = Date.now();

  try {
    ConsoleFormatter.printHeader('Safari Zone Encounter Scraper', 'Scraping Safari Zone area encounters from individual wiki pages');

    const dataDir = path.join(process.cwd(), 'data');
    const classicDir = path.join(dataDir, 'classic');
    const remixDir = path.join(dataDir, 'remix');
    
    // Create directories
    await fs.mkdir(classicDir, { recursive: true });
    await fs.mkdir(remixDir, { recursive: true });

    // Scrape all Safari Zone area pages
    const safariEncounters: RouteEncounters[] = [];
    
    ConsoleFormatter.info(`Scraping ${SAFARI_ZONE_PAGES.length} Safari Zone areas...`);
    
    for (const url of SAFARI_ZONE_PAGES) {
      const encounters = await scrapeSafariAreaPage(url);
      if (encounters) {
        safariEncounters.push(encounters);
        ConsoleFormatter.info(`✓ ${encounters.routeName}: ${encounters.encounters.length} encounters`);
      }
    }

    if (safariEncounters.length === 0) {
      ConsoleFormatter.warn('No Safari Zone encounters found!');
      return;
    }

    const totalEncounters = safariEncounters.reduce((sum, area) => sum + area.encounters.length, 0);
    ConsoleFormatter.success(`Successfully scraped ${safariEncounters.length} areas with ${totalEncounters} total encounters`);

    // Save Safari Zone encounters to separate files
    ConsoleFormatter.info('Saving Safari Zone encounter data...');
    const safariClassicPath = path.join(classicDir, 'safari-encounters.json');
    const safariRemixPath = path.join(remixDir, 'safari-encounters.json');

    await Promise.all([
      fs.writeFile(safariClassicPath, JSON.stringify(safariEncounters, null, 2)),
      fs.writeFile(safariRemixPath, JSON.stringify(safariEncounters, null, 2)) // Same data for both modes for now
    ]);

    // Get file stats
    const [classicStats, remixStats] = await Promise.all([
      fs.stat(safariClassicPath),
      fs.stat(safariRemixPath)
    ]);

    const duration = Date.now() - startTime;

    ConsoleFormatter.success(`Safari Zone scraping completed successfully!`);
    ConsoleFormatter.info(`Safari encounters: ${safariEncounters.length} areas`);
    ConsoleFormatter.info(`Classic file: ${(classicStats.size / 1024).toFixed(1)} KB`);
    ConsoleFormatter.info(`Remix file: ${(remixStats.size / 1024).toFixed(1)} KB`);
    ConsoleFormatter.info(`Total duration: ${(duration / 1000).toFixed(2)}s`);

  } catch (error) {
    ConsoleFormatter.error(`Safari Zone scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}