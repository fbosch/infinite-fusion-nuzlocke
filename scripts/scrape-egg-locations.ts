#!/usr/bin/env node

import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConsoleFormatter } from './console-utils';

const GIFTS_AND_TRADES_URL = 'https://infinitefusion.fandom.com/wiki/List_of_Gift_Pok%C3%A9mon_and_Trades';
const POKEMON_NESTS_URL = 'https://infinitefusion.fandom.com/wiki/Pok%C3%A9mon_Nests';

interface EggLocation {
  routeName: string;
  source: 'gift' | 'nest';
  description: string;
}

/**
 * Cleans location names to match the standard format
 */
function cleanLocationName(location: string): string {
  return location
    // Remove wiki links
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\|([^\]]+)\]\]/g, '$2')
    // Remove extra context in parentheses
    .replace(/\s*\([^)]*\)/g, '')
    // Standardize Pokémon -> Pokemon
    .replace(/Pokémon/g, 'Pokemon')
    // Standardize S.S. Anne
    .replace(/S\.S\.\s*Anne/g, 'S.S. Anne')
    // Remove extra whitespace
    .trim();
}

/**
 * Extracts egg-related locations from the gifts and trades page
 */
async function scrapeGiftsAndTradesForEggs(): Promise<EggLocation[]> {
  ConsoleFormatter.printHeader('Scraping Gifts and Trades for Eggs', 'Extracting egg locations from the gifts and trades page');
  
  try {
    const response = await ConsoleFormatter.withSpinner(
      'Fetching gifts and trades page...',
      () => fetch(GIFTS_AND_TRADES_URL)
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await ConsoleFormatter.withSpinner(
      'Parsing HTML content...',
      () => response.text()
    );

    const $ = cheerio.load(html);
    const eggLocations: EggLocation[] = [];

    // Find tables that might contain egg information
    const tables = $('table');
    
    tables.each((tableIndex: number, table: any) => {
      const $table = $(table);
      const rows = $table.find('tr');

      rows.each((rowIndex: number, row: any) => {
        const $row = $(row);
        const cells = $row.find('td');

        // Skip header rows and rows with insufficient data
        if (cells.length < 3) {
          return;
        }

        // Based on the web search results, the table structure is:
        // Pokemon | Location | Level | Notes
        const pokemonCell = cells.eq(0).text().trim();
        const locationCell = cells.eq(1).text().trim();
        const levelCell = cells.eq(2).text().trim();
        const notesCell = cells.length > 3 ? cells.eq(3).text().trim() : '';

        // Look for egg-related entries with more comprehensive detection
        const isEggRelated = 
          pokemonCell.toLowerCase().includes('egg') ||
          notesCell.toLowerCase().includes('egg') ||
          pokemonCell.toLowerCase().includes('as egg') ||
          notesCell.toLowerCase().includes('as egg') ||
          pokemonCell.toLowerCase().includes('daycare egg') ||
          notesCell.toLowerCase().includes('daycare egg') ||
          pokemonCell.toLowerCase().includes('random egg') ||
          notesCell.toLowerCase().includes('random egg') ||
          // Look for specific egg Pokémon
          pokemonCell.toLowerCase().includes('togepi') ||
          pokemonCell.toLowerCase().includes('azurill') ||
          pokemonCell.toLowerCase().includes('pichu') ||
          pokemonCell.toLowerCase().includes('cleffa') ||
          pokemonCell.toLowerCase().includes('igglybuff') ||
          pokemonCell.toLowerCase().includes('bonsly') ||
          pokemonCell.toLowerCase().includes('mantyke') ||
          pokemonCell.toLowerCase().includes('happiny') ||
          pokemonCell.toLowerCase().includes('elekid') ||
          pokemonCell.toLowerCase().includes('magby') ||
          pokemonCell.toLowerCase().includes('smoochum') ||
          pokemonCell.toLowerCase().includes('ralts') ||
          pokemonCell.toLowerCase().includes('pawniard') ||
          pokemonCell.toLowerCase().includes('bagon');

        if (isEggRelated) {
          const cleanedLocation = cleanLocationName(locationCell);
          // Validate that this is actually a location name, not a Pokémon name
          if (cleanedLocation && 
              cleanedLocation.length > 2 && 
              !cleanedLocation.toLowerCase().includes('pokemon') &&
              !cleanedLocation.toLowerCase().includes('egg') &&
              // Check if it looks like a location (contains route, city, town, etc.)
              (cleanedLocation.toLowerCase().includes('route') ||
               cleanedLocation.toLowerCase().includes('city') ||
               cleanedLocation.toLowerCase().includes('town') ||
               cleanedLocation.toLowerCase().includes('island') ||
               cleanedLocation.toLowerCase().includes('park') ||
               cleanedLocation.toLowerCase().includes('daycare') ||
               cleanedLocation.toLowerCase().includes('mt.') ||
               cleanedLocation.toLowerCase().includes('mountain') ||
               cleanedLocation.toLowerCase().includes('cave') ||
               cleanedLocation.toLowerCase().includes('forest'))) {
            
            eggLocations.push({
              routeName: cleanedLocation,
              source: 'gift',
              description: `${pokemonCell} - ${notesCell}`.trim()
            });
          }
        }
      });
    });

    ConsoleFormatter.success(`Found ${eggLocations.length} egg locations from gifts and trades`);
    return eggLocations;

  } catch (error) {
    ConsoleFormatter.error(`Error scraping gifts and trades for eggs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Extracts egg-related locations from the Pokémon nests page
 */
async function scrapePokemonNestsForEggs(): Promise<EggLocation[]> {
  ConsoleFormatter.printHeader('Scraping Pokémon Nests for Eggs', 'Extracting egg locations from the Pokémon nests page');
  
  try {
    const response = await ConsoleFormatter.withSpinner(
      'Fetching Pokémon nests page...',
      () => fetch(POKEMON_NESTS_URL)
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await ConsoleFormatter.withSpinner(
      'Parsing HTML content...',
      () => response.text()
    );

    const $ = cheerio.load(html);
    const eggLocations: EggLocation[] = [];

    // Look for links that contain location names
    const links = $('a[href*="/wiki/"]');
    
    links.each((index: number, link: any) => {
      const $link = $(link);
      const href = $link.attr('href') || '';
      const text = $link.text().trim();
      const title = $link.attr('title') || '';
      
      // Check if this link is near a nest image
      const $parent = $link.parent();
      const parentText = $parent.text().toLowerCase();
      const hasNestImage = $parent.find('img[alt*="nest"]').length > 0;
      
      // Look for location links that are near nest content
      if (href.includes('/wiki/') && (parentText.includes('nest') || hasNestImage)) {
        // Extract the page name from the URL
        const urlMatch = href.match(/\/wiki\/([^\/]+)/);
        if (urlMatch) {
          const pageName = decodeURIComponent(urlMatch[1]);
          const routeName = pageName
            .replace(/_/g, ' ')
            .replace(/%20/g, ' ')
            .trim();
          
          // Validate the route name
          if (routeName && 
              routeName.length > 2 && 
              !routeName.toLowerCase().includes('pokemon') &&
              !routeName.toLowerCase().includes('nest') &&
              !routeName.toLowerCase().includes('egg') &&
              !routeName.toLowerCase().includes('file:')) {
            
            eggLocations.push({
              routeName: routeName,
              source: 'nest',
              description: `Nest location: ${text || title}`
            });
          }
        }
      }
    });

    ConsoleFormatter.success(`Found ${eggLocations.length} egg locations from Pokémon nests`);
    return eggLocations;

  } catch (error) {
    ConsoleFormatter.error(`Error scraping Pokémon nests for eggs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Merges and deduplicates egg locations from both sources
 */
function mergeEggLocations(giftsLocations: EggLocation[], nestsLocations: EggLocation[]): EggLocation[] {
  const merged = new Map<string, EggLocation>();
  
  // Add all locations from both sources
  [...giftsLocations, ...nestsLocations].forEach(location => {
    const key = location.routeName.toLowerCase();
    
    if (!merged.has(key)) {
      merged.set(key, location);
    } else {
      // If we already have this location, merge the sources
      const existing = merged.get(key)!;
      if (existing.source !== location.source) {
        // Update description to include both sources
        existing.description = `${existing.description} | ${location.description}`;
      }
    }
  });
  
  // Convert back to array, sort, and filter out invalid entries
  return Array.from(merged.values())
    .filter(location => 
      location.routeName && 
      location.routeName.length > 2 && 
      !location.routeName.toLowerCase().includes('file:') &&
      !location.routeName.toLowerCase().includes('pokémon') &&
      !location.routeName.toLowerCase().includes('nest') &&
      !location.routeName.toLowerCase().includes('egg')
    )
    .sort((a, b) => a.routeName.localeCompare(b.routeName));
}

async function main() {
  const startTime = Date.now();

  try {
    const dataDir = path.join(process.cwd(), 'data');
    await fs.mkdir(dataDir, { recursive: true });

    ConsoleFormatter.info('Scraping egg locations from multiple sources...');
    
    // Scrape both sources
    const [giftsLocations, nestsLocations] = await Promise.all([
      scrapeGiftsAndTradesForEggs(),
      scrapePokemonNestsForEggs()
    ]);

    // Merge and deduplicate locations
    const mergedLocations = mergeEggLocations(giftsLocations, nestsLocations);

    // Create the output data structure
    const eggLocationsData = {
      totalLocations: mergedLocations.length,
      sources: {
        gifts: giftsLocations.length,
        nests: nestsLocations.length
      },
      locations: mergedLocations
    };

    // Write to file
    ConsoleFormatter.info('Saving egg locations data...');
    const outputPath = path.join(dataDir, 'egg-locations.json');
    await fs.writeFile(outputPath, JSON.stringify(eggLocationsData, null, 2));

    // Get file stats
    const fileStats = await fs.stat(outputPath);
    const duration = Date.now() - startTime;

    // Success summary
    ConsoleFormatter.printSummary('Egg Locations Scraping Complete!', [
      { label: 'Total egg locations found', value: mergedLocations.length, color: 'yellow' },
      { label: 'From gifts and trades', value: giftsLocations.length, color: 'cyan' },
      { label: 'From Pokémon nests', value: nestsLocations.length, color: 'cyan' },
      { label: 'File saved', value: outputPath, color: 'green' },
      { label: 'File size', value: ConsoleFormatter.formatFileSize(fileStats.size), color: 'cyan' },
      { label: 'Duration', value: ConsoleFormatter.formatDuration(duration), color: 'yellow' }
    ]);


  } catch (error) {
    ConsoleFormatter.error(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Check if this script is being run directly
if (process.argv[1] && process.argv[1].endsWith('scrape-egg-locations.ts')) {
  main();
} 