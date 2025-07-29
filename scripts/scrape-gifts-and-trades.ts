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
    'fossil pokemon': -2, // Special case for fossil Pokémon
    'fossils items': -2, // Special case for fossil items
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
 * Extracts the base location name without the (gift) or (trade) markers
 */
function extractBaseLocation(location: string): string {
  return location
    .replace(/\s*\(gift\)/gi, '')
    .replace(/\s*\(trade\)/gi, '')
    .trim();
}

/**
 * Finds the location column in the table by looking for cells that contain (gift) or (trade)
 */
function findLocationColumnIndex(cells: cheerio.Cheerio<any>): number {
  for (let i = 0; i < cells.length; i++) {
    const cellText = cells.eq(i).text().toLowerCase();
    if (cellText.includes('(gift)') || cellText.includes('(trade)')) {
      return i;
    }
  }
  return -1;
}



interface GiftPokemon {
  pokemonId: number;
  location: string;
  level?: number;
  requirements?: string;
}

interface TradePokemon {
  pokemonId: number;
  location: string;
  requirements?: string;
}

/**
 * Extracts only the location that has the (gift) or (trade) marker
 */
function extractGiftTradeLocation(locationText: string): string | null {
  // Split by comma and look for entries with (gift) or (trade)
  const locations = locationText.split(',').map(loc => loc.trim());
  
  for (const location of locations) {
    if (location.toLowerCase().includes('(gift)') || location.toLowerCase().includes('(trade)')) {
      // Clean the location name
      return cleanLocationName(extractBaseLocation(location));
    }
  }
  
  return null;
}

async function scrapePokedexForGiftsAndTrades(url: string, mode: 'classic' | 'remix'): Promise<{ gifts: GiftPokemon[]; trades: TradePokemon[] }> {
  ConsoleFormatter.printHeader(`Scraping ${mode.toUpperCase()} Gifts and Trades`, `Scraping gift and trade Pokémon data from the ${mode} Pokédex`);
  
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

    const gifts: GiftPokemon[] = [];
    const trades: TradePokemon[] = [];
    const giftsSeen = new Set<string>();
    const tradesSeen = new Set<string>();

    // Find the main Pokédex table
    const tables = $('table');
    
    tables.each((tableIndex: number, table: any) => {
      const $table = $(table);
      const rows = $table.find('tr');

      rows.each((rowIndex: number, row: any) => {
        const $row = $(row);
        const cells = $row.find('td');

        // Skip header rows and rows with insufficient data
        if (cells.length < 5) {
          return;
        }

        // Extract data from cells - location is typically at index 5
        const dexCell = cells.eq(0).text().trim();
        const pokemonCell = cells.eq(2).text().trim(); // Pokémon name is at index 2
        const locationCell = cells.eq(5).text().trim(); // Location is at index 5
        const notesCell = cells.length > 6 ? cells.eq(6).text().trim() : '';

        // Skip if no Pokémon name found or if it's a header row
        if (!pokemonCell || !isPotentialPokemonName(pokemonCell) || pokemonCell.toLowerCase().includes('pokemon')) {
          return;
        }

        // Check if this is a gift or trade
        const isGift = locationCell.toLowerCase().includes('(gift)');
        const isTrade = locationCell.toLowerCase().includes('(trade)');

        if (!isGift && !isTrade) {
          return;
        }

        // Find Pokémon ID
        const pokemonId = findPokemonIdWithSpecialCases(pokemonCell, pokemonNameMap);
        if (!pokemonId) {
          ConsoleFormatter.warn(`Could not find ID for ${isGift ? 'gift' : 'trade'} Pokémon: ${pokemonCell}`);
          return;
        }

        // Extract the specific location that has the (gift) or (trade) marker
        const specificLocation = extractGiftTradeLocation(locationCell);
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

          const gift: GiftPokemon = {
            pokemonId,
            location: specificLocation
          };

          gifts.push(gift);
        } else if (isTrade) {
          // Create unique key to avoid duplicates
          const uniqueKey = `${pokemonCell}-${specificLocation}`;
          if (tradesSeen.has(uniqueKey)) {
            return;
          }
          tradesSeen.add(uniqueKey);

          const trade: TradePokemon = {
            pokemonId,
            location: specificLocation
          };

          trades.push(trade);
        }
      });
    });

    ConsoleFormatter.success(`Found ${gifts.length} gift Pokémon and ${trades.length} trades in ${mode} mode`);

    return { gifts, trades };

  } catch (error) {
    ConsoleFormatter.error(`Error scraping ${mode} gifts and trades: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

async function main() {
  const startTime = Date.now();

  try {
    const dataDir = path.join(process.cwd(), 'data');
    await fs.mkdir(dataDir, { recursive: true });

    // Scrape both Classic and Remix data
    ConsoleFormatter.info('Scraping Classic and Remix Gifts and Trades...');
    
    const [classicData, remixData] = await Promise.all([
      scrapePokedexForGiftsAndTrades(CLASSIC_POKEDEX_URL, 'classic'),
      scrapePokedexForGiftsAndTrades(REMIX_POKEDEX_URL, 'remix')
    ]);

    // Write to separate files for each mode
    ConsoleFormatter.info('Saving data to files...');
    
    const files = [
      { path: path.join(dataDir, 'gifts-classic.json'), data: classicData.gifts },
      { path: path.join(dataDir, 'gifts-remix.json'), data: remixData.gifts },
      { path: path.join(dataDir, 'trades-classic.json'), data: classicData.trades },
      { path: path.join(dataDir, 'trades-remix.json'), data: remixData.trades }
    ];

    await Promise.all(
      files.map(file => fs.writeFile(file.path, JSON.stringify(file.data, null, 2)))
    );

    // Get file stats
    const fileStats = await Promise.all(
      files.map(file => fs.stat(file.path))
    );

    const duration = Date.now() - startTime;

    // Calculate unique locations for each mode
    const classicGiftLocations = new Set(classicData.gifts.map(gift => gift.location)).size;
    const classicTradeLocations = new Set(classicData.trades.map(trade => trade.location)).size;
    const remixGiftLocations = new Set(remixData.gifts.map(gift => gift.location)).size;
    const remixTradeLocations = new Set(remixData.trades.map(trade => trade.location)).size;

    // Success summary
    ConsoleFormatter.printSummary('Gifts and Trades Scraping Complete!', [
      { label: 'Classic gifts found', value: classicData.gifts.length, color: 'yellow' },
      { label: 'Classic unique gift locations', value: classicGiftLocations, color: 'yellow' },
      { label: 'Classic trades found', value: classicData.trades.length, color: 'yellow' },
      { label: 'Classic unique trade locations', value: classicTradeLocations, color: 'yellow' },
      { label: 'Remix gifts found', value: remixData.gifts.length, color: 'yellow' },
      { label: 'Remix unique gift locations', value: remixGiftLocations, color: 'yellow' },
      { label: 'Remix trades found', value: remixData.trades.length, color: 'yellow' },
      { label: 'Remix unique trade locations', value: remixTradeLocations, color: 'yellow' },

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