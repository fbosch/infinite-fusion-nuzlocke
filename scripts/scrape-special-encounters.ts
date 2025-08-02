#!/usr/bin/env node

import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConsoleFormatter } from './console-utils';
import {
  findPokemonId,
  isPotentialPokemonName
} from './utils/pokemon-name-utils';
import { loadPokemonNameMap } from './utils/data-loading-utils';

const CLASSIC_POKEDEX_URL = 'https://infinitefusion.fandom.com/wiki/Pok%C3%A9dex';
const REMIX_POKEDEX_URL = 'https://infinitefusion.fandom.com/wiki/Pok%C3%A9dex/Remix';

/**
 * Handles special cases for Pokémon names that might not be found in the standard name map
 */
function findPokemonIdWithSpecialCases(pokemonName: string, pokemonNameMap: import('./utils/pokemon-name-utils').PokemonNameMap): number | null {
  // First try the standard lookup
  const standardId = findPokemonId(pokemonName, pokemonNameMap);
  if (standardId) {
    return standardId;
  }

  // Handle special cases
  const specialCases: Record<string, number> = {
    'oricorio': 741, // Oricorio (Baile form)
    'egg': -1, // Special case for eggs
  };

  // Handle common typos
  const typoCorrections: Record<string, string> = {
    'cyadaquil': 'cyndaquil',
  };

  const normalizedName = pokemonName.toLowerCase().trim();
  
  // Check for typos first
  if (typoCorrections[normalizedName]) {
    const correctedName = typoCorrections[normalizedName];
    const correctedId = findPokemonId(correctedName, pokemonNameMap);
    if (correctedId) {
      return correctedId;
    }
  }
  
  // Check exact matches first
  if (specialCases[normalizedName]) {
    return specialCases[normalizedName];
  }

  // Check partial matches
  for (const [key, id] of Object.entries(specialCases)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return id;
    }
  }

  return null;
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
 * Extracts the base location name without the (gift), (trade), (quest), or (static) markers
 */
function extractBaseLocation(location: string): string {
  return location
    .replace(/\s*\(gift\)/gi, '')
    .replace(/\s*\(trade\)/gi, '')
    .replace(/\s*\(quest\)/gi, '')
    .replace(/\s*\(static\)/gi, '')
    .trim();
}


interface LocationGifts {
  routeName: string;
  pokemonIds: number[];
}

interface LocationTrades {
  routeName: string;
  pokemonIds: number[];
}

interface LocationQuests {
  routeName: string;
  pokemonIds: number[];
}

interface LocationStatics {
  routeName: string;
  pokemonIds: number[];
}

/**
 * Extracts only the location that has the (gift), (trade), (quest), or (static) marker
 */
function extractSpecialEncounterLocation(locationText: string): string | null {
  // Split by comma and look for entries with (gift), (trade), (quest), or (static)
  const locations = locationText.split(',').map(loc => loc.trim());
  
  for (const location of locations) {
    if (location.toLowerCase().includes('(gift)') || 
        location.toLowerCase().includes('(trade)') || 
        location.toLowerCase().includes('(quest)') ||
        location.toLowerCase().includes('(static)')) {
      // Clean the location name
      return cleanLocationName(extractBaseLocation(location));
    }
  }
  
  return null;
}

/**
 * Groups Pokémon by location to create the merged structure
 */
function groupPokemonByLocation<T extends { pokemonId: number; location: string }>(
  items: T[]
): { routeName: string; pokemonIds: number[] }[] {
  const locationMap = new Map<string, number[]>();
  
  for (const item of items) {
    if (!locationMap.has(item.location)) {
      locationMap.set(item.location, []);
    }
    locationMap.get(item.location)!.push(item.pokemonId);
  }
  
  // Convert to array and sort by location name
  return Array.from(locationMap.entries())
    .map(([routeName, pokemonIds]) => ({
      routeName,
      pokemonIds: pokemonIds.sort((a, b) => a - b) // Sort Pokémon IDs numerically
    }))
    .sort((a, b) => a.routeName.localeCompare(b.routeName)); // Sort locations alphabetically
}

async function scrapePokedexForSpecialEncounters(url: string, mode: 'classic' | 'remix'): Promise<{ gifts: LocationGifts[]; trades: LocationTrades[]; quests: LocationQuests[]; statics: LocationStatics[] }> {
  ConsoleFormatter.printHeader(`Scraping ${mode.toUpperCase()} Special Encounters`, `Scraping gift, trade, quest, and static Pokémon data from the ${mode} Pokédex`);
  
  try {
    // Fetch the webpage
    const response = await ConsoleFormatter.withSpinner(
      `Fetching ${mode} Pokédex page...`,
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
    const pokemonNameMap = await loadPokemonNameMap();

    const gifts: { pokemonId: number; location: string }[] = [];
    const trades: { pokemonId: number; location: string }[] = [];
    const quests: { pokemonId: number; location: string }[] = [];
    const statics: { pokemonId: number; location: string }[] = [];
    const giftsSeen = new Set<string>();
    const tradesSeen = new Set<string>();
    const questsSeen = new Set<string>();
    const staticsSeen = new Set<string>();

    // Find the main Pokédex table
    const tables = $('table');
    
    tables.each((tableIndex: number, table: any) => {
      const $table = $(table);
      const rows = $table.find('tr');
      console.log(`Processing table ${tableIndex} with ${rows.length} rows`);



      rows.each((rowIndex: number, row: any) => {
        const $row = $(row);
        const cells = $row.find('td');

        // Skip header rows and rows with insufficient data
        if (cells.length < 5) {
          return;
        }

        // Extract data from cells - location index varies by table structure
        const _dexCell = cells.eq(0).text().trim();
        const pokemonCell = cells.eq(2).text().trim(); // Pokémon name is at index 2


        
        // Different table structures have location at different indices
        // Tables 2 (Gen 2) and 3 (Other Generations): location at index 4
        // Tables 0 and 1 (Gen 1): location at index 5
        const locationIndex = (tableIndex === 2 || tableIndex === 3) ? 4 : 5;
        const locationCell = cells.eq(locationIndex).text().trim();
        const _notesCell = cells.length > locationIndex + 1 ? cells.eq(locationIndex + 1).text().trim() : '';

        // Skip if no Pokémon name found or if it's a header row
        if (!pokemonCell || !isPotentialPokemonName(pokemonCell) || pokemonCell.toLowerCase().includes('pokemon')) {
          return;
        }

        // Check if this is a gift, trade, quest, or static
        const isGift = locationCell.toLowerCase().includes('(gift)');
        const isTrade = locationCell.toLowerCase().includes('(trade)');
        const isQuest = locationCell.toLowerCase().includes('(quest)');
        const isStatic = locationCell.toLowerCase().includes('(static)');



        if (!isGift && !isTrade && !isQuest && !isStatic) {
          return;
        }

        // Find Pokémon ID
        const pokemonId = findPokemonIdWithSpecialCases(pokemonCell, pokemonNameMap);
        if (!pokemonId) {
          const type = isGift ? 'gift' : isTrade ? 'trade' : isQuest ? 'quest' : 'static';
          ConsoleFormatter.warn(`Could not find ID for ${type} Pokémon: ${pokemonCell}`);
          return;
        }



        // Extract the specific location that has the (gift), (trade), (quest), or (static) marker
        const specificLocation = extractSpecialEncounterLocation(locationCell);
        if (!specificLocation) {
          ConsoleFormatter.warn(`Could not extract specific location for ${pokemonCell}`);
          return;
        }

        if (isGift) {
          // Create unique key to avoid duplicates
          const uniqueKey = `${pokemonCell}-${specificLocation}`;
          if (giftsSeen.has(uniqueKey)) {
            return;
          }
          giftsSeen.add(uniqueKey);

          gifts.push({
            pokemonId,
            location: specificLocation
          });
        } else if (isTrade) {
          // Create unique key to avoid duplicates
          const uniqueKey = `${pokemonCell}-${specificLocation}`;
          if (tradesSeen.has(uniqueKey)) {
            return;
          }
          tradesSeen.add(uniqueKey);

          trades.push({
            pokemonId,
            location: specificLocation
          });
        } else if (isQuest) {
          // Create unique key to avoid duplicates
          const uniqueKey = `${pokemonCell}-${specificLocation}`;
          if (questsSeen.has(uniqueKey)) {
            return;
          }
          questsSeen.add(uniqueKey);

          quests.push({
            pokemonId,
            location: specificLocation
          });
        } else if (isStatic) {
          // Create unique key to avoid duplicates
          const uniqueKey = `${pokemonCell}-${specificLocation}`;
          if (staticsSeen.has(uniqueKey)) {
            return;
          }
          staticsSeen.add(uniqueKey);

          statics.push({
            pokemonId,
            location: specificLocation
          });
        }
      });
    });

    // Group by location to match encounters.json structure
    const groupedGifts = groupPokemonByLocation(gifts);
    const groupedTrades = groupPokemonByLocation(trades);
    const groupedQuests = groupPokemonByLocation(quests);
    const groupedStatics = groupPokemonByLocation(statics);

    ConsoleFormatter.success(`Found ${gifts.length} gift Pokémon in ${groupedGifts.length} locations, ${trades.length} trades in ${groupedTrades.length} locations, ${quests.length} quest rewards in ${groupedQuests.length} locations, and ${statics.length} static encounters in ${groupedStatics.length} locations in ${mode} mode`);

    return { gifts: groupedGifts, trades: groupedTrades, quests: groupedQuests, statics: groupedStatics };

  } catch (error) {
    ConsoleFormatter.error(`Error scraping ${mode} special encounters: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    // Scrape both Classic and Remix data
    ConsoleFormatter.info('Scraping Classic and Remix Special Encounters...');
    
    const [classicData, remixData] = await Promise.all([
      scrapePokedexForSpecialEncounters(CLASSIC_POKEDEX_URL, 'classic'),
      scrapePokedexForSpecialEncounters(REMIX_POKEDEX_URL, 'remix')
    ]);

    // Write to separate files for each mode
    ConsoleFormatter.info('Saving data to files...');
    
    const files = [
      { path: path.join(classicDir, 'gifts.json'), data: classicData.gifts },
      { path: path.join(remixDir, 'gifts.json'), data: remixData.gifts },
      { path: path.join(classicDir, 'trades.json'), data: classicData.trades },
      { path: path.join(remixDir, 'trades.json'), data: remixData.trades },
      { path: path.join(classicDir, 'quests.json'), data: classicData.quests },
      { path: path.join(remixDir, 'quests.json'), data: remixData.quests },
      { path: path.join(classicDir, 'statics.json'), data: classicData.statics },
      { path: path.join(remixDir, 'statics.json'), data: remixData.statics }
    ];

    await Promise.all(
      files.map(file => fs.writeFile(file.path, JSON.stringify(file.data, null, 2)))
    );

    // Get file stats
    const fileStats = await Promise.all(
      files.map(file => fs.stat(file.path))
    );

    const duration = Date.now() - startTime;

    // Calculate statistics for summary
    const classicGiftLocations = classicData.gifts.length;
    const classicTradeLocations = classicData.trades.length;
    const classicQuestLocations = classicData.quests.length;
    const classicStaticLocations = classicData.statics.length;
    const remixGiftLocations = remixData.gifts.length;
    const remixTradeLocations = remixData.trades.length;
    const remixQuestLocations = remixData.quests.length;
    const remixStaticLocations = remixData.statics.length;

    const classicGiftPokemon = classicData.gifts.reduce((sum, location) => sum + location.pokemonIds.length, 0);
    const classicTradePokemon = classicData.trades.reduce((sum, location) => sum + location.pokemonIds.length, 0);
    const classicQuestPokemon = classicData.quests.reduce((sum, location) => sum + location.pokemonIds.length, 0);
    const classicStaticPokemon = classicData.statics.reduce((sum, location) => sum + location.pokemonIds.length, 0);
    const remixGiftPokemon = remixData.gifts.reduce((sum, location) => sum + location.pokemonIds.length, 0);
    const remixTradePokemon = remixData.trades.reduce((sum, location) => sum + location.pokemonIds.length, 0);
    const remixQuestPokemon = remixData.quests.reduce((sum, location) => sum + location.pokemonIds.length, 0);
    const remixStaticPokemon = remixData.statics.reduce((sum, location) => sum + location.pokemonIds.length, 0);

    // Success summary
    ConsoleFormatter.printSummary('Special Encounters Scraping Complete!', [
      { label: 'Classic gift locations', value: classicGiftLocations, color: 'yellow' },
      { label: 'Classic gift Pokémon', value: classicGiftPokemon, color: 'yellow' },
      { label: 'Classic trade locations', value: classicTradeLocations, color: 'yellow' },
      { label: 'Classic trade Pokémon', value: classicTradePokemon, color: 'yellow' },
      { label: 'Classic quest locations', value: classicQuestLocations, color: 'yellow' },
      { label: 'Classic quest Pokémon', value: classicQuestPokemon, color: 'yellow' },
      { label: 'Classic static locations', value: classicStaticLocations, color: 'yellow' },
      { label: 'Classic static Pokémon', value: classicStaticPokemon, color: 'yellow' },
      { label: 'Remix gift locations', value: remixGiftLocations, color: 'yellow' },
      { label: 'Remix gift Pokémon', value: remixGiftPokemon, color: 'yellow' },
      { label: 'Remix trade locations', value: remixTradeLocations, color: 'yellow' },
      { label: 'Remix trade Pokémon', value: remixTradePokemon, color: 'yellow' },
      { label: 'Remix quest locations', value: remixQuestLocations, color: 'yellow' },
      { label: 'Remix quest Pokémon', value: remixQuestPokemon, color: 'yellow' },
      { label: 'Remix static locations', value: remixStaticLocations, color: 'yellow' },
      { label: 'Remix static Pokémon', value: remixStaticPokemon, color: 'yellow' },
      { label: 'Files saved', value: files.map(f => f.path).join(', '), color: 'cyan' },
      { label: 'Total file size', value: ConsoleFormatter.formatFileSize(fileStats.reduce((sum, stat) => sum + stat.size, 0)), color: 'cyan' },
      { label: 'Duration', value: ConsoleFormatter.formatDuration(duration), color: 'yellow' }
    ]);

  } catch (error) {
    ConsoleFormatter.error(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Check if this script is being run directly
if (process.argv[1] && process.argv[1].endsWith('scrape-gifts-and-trades.ts')) {
  main();
} 