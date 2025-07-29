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

const GIFTS_AND_TRADES_URL = 'https://infinitefusion.fandom.com/wiki/List_of_Gift_Pok%C3%A9mon_and_Trades';

/**
 * Cleans location names to match the standard format
 */
function cleanLocationName(location: string): string {
  // Handle numeric locations that are likely levels
  if (/^\d+$/.test(location)) {
    return 'Celadon Game Corner'; // Most likely location for numeric entries
  }
  
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

interface GiftPokemon {
  pokemonId: number;
  location: string;
  level?: number;
  notes?: string;
  requirements?: string;
}

interface TradePokemon {
  pokemonId: number;
  askingForId: number;
  askingFor: string; // Keep original text for reference
  location: string;
  notes?: string;
  requirements?: string;
}

async function scrapeGiftsAndTrades(): Promise<{ gifts: GiftPokemon[]; trades: TradePokemon[] }> {
  ConsoleFormatter.printHeader('Scraping Gifts and Trades', 'Scraping gift and trade Pokémon data from the wiki');
  
  try {
    // Fetch the webpage
    const response = await ConsoleFormatter.withSpinner(
      'Fetching Gifts and Trades page...',
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
    const pokemonNameMap = await loadPokemonNameMap();

    const gifts: GiftPokemon[] = [];
    const trades: TradePokemon[] = [];
    const giftsSeen = new Set<string>();
    const tradesSeen = new Set<string>();

    // Find all sections
    const sections = $('h2, h3');

    sections.each((sectionIndex: number, section: any) => {  
      const $section = $(section);
      const sectionText = $section.text().trim();

      // Process Gift Pokémon section
      if (sectionText.includes('Gift Pokémon')) {
        ConsoleFormatter.info('Processing Gift Pokémon section...');
        
        let currentElement = $section.next();
        let tableFound = false;

        // Look for the table after the heading
        while (currentElement.length > 0 && !tableFound) {
          if (currentElement.is('table')) {
            tableFound = true;
            break;
          }
          
          // If we hit another heading, stop looking
          if (currentElement.is('h2, h3, h4')) {
            break;
          }
          
          currentElement = currentElement.next();
        }

        if (tableFound) {
          const table = currentElement;
          const rows = table.find('tr');

          rows.each((rowIndex: number, row: any) => {  
            const $row = $(row);
            const cells = $row.find('td');

            // Skip header rows and rows with insufficient data
            if (cells.length < 3) {
              return;
            }

            const pokemonCell = $(cells[0]).text().trim();
            const locationCell = $(cells[1]).text().trim();
            const levelCell = $(cells[2]).text().trim();
            const notesCell = cells.length > 3 ? $(cells[3]).text().trim() : '';

            // Skip if no Pokémon name found
            if (!pokemonCell || !isPotentialPokemonName(pokemonCell)) {
              return;
            }

            // Handle multiple Pokémon names separated by slashes
            const pokemonNames = pokemonCell.split('/').map(name => name.trim()).filter(name => name.length > 0);
            
            for (const pokemonName of pokemonNames) {
              // Handle special cases and find Pokémon ID
              const pokemonId = findPokemonIdWithSpecialCases(pokemonName, pokemonNameMap);
              if (!pokemonId) {
                ConsoleFormatter.warn(`Could not find ID for gift Pokémon: ${pokemonName}`);
                continue;
              }

              // Parse level
              let level: number | undefined;
              if (levelCell && levelCell !== '--' && levelCell !== '') {
                const levelMatch = levelCell.match(/(\d+)/);
                if (levelMatch) {
                  level = parseInt(levelMatch[1]);
                }
              }

              // Clean up notes text
              const cleanNotes = notesCell
                .replace(/\[\[([^\]]+)\]\]/g, '$1')
                .replace(/\[\[([^\]]+)\|([^\]]+)\]\]/g, '$2')
                .trim();

              // Create unique key to avoid duplicates for split entries
              const uniqueKey = `${pokemonName}-${locationCell}`;
              if (giftsSeen.has(uniqueKey)) {
                continue;
              }
              giftsSeen.add(uniqueKey);

              const gift: GiftPokemon = {
                pokemonId,
                location: cleanLocationName(locationCell),
                notes: cleanNotes || undefined
              };

              if (level !== undefined) {
                gift.level = level;
              }

              gifts.push(gift);
            }
          });
        }
      }

      // Process NPC Trades section
      if (sectionText.includes('NPC Trades') || sectionText.includes('Trades')) {
        ConsoleFormatter.info('Processing NPC Trades section...');
        
        let currentElement = $section.next();
        let tableFound = false;

        // Look for the table after the heading
        while (currentElement.length > 0 && !tableFound) {
          if (currentElement.is('table')) {
            tableFound = true;
            break;
          }
          
          // If we hit another heading, stop looking
          if (currentElement.is('h2, h3, h4')) {
            break;
          }
          
          currentElement = currentElement.next();
        }

        if (tableFound) {
          const table = currentElement;
          const rows = table.find('tr');

          rows.each((rowIndex: number, row: any) => { 
            const $row = $(row);
            const cells = $row.find('td');

            // Skip header rows and rows with insufficient data
            if (cells.length < 3) {
              return;
            }

            const pokemonCell = $(cells[0]).text().trim();
            const askingForCell = $(cells[1]).text().trim();
            const locationCell = $(cells[2]).text().trim();
            const notesCell = cells.length > 3 ? $(cells[3]).text().trim() : '';

            // Skip if no Pokémon name found
            if (!pokemonCell || !isPotentialPokemonName(pokemonCell)) {
              return;
            }

            // Handle multiple Pokémon names separated by slashes
            const pokemonNames = pokemonCell.split('/').map(name => name.trim()).filter(name => name.length > 0);
            
            for (const pokemonName of pokemonNames) {
              // Find Pokémon ID with special case handling
              const pokemonId = findPokemonIdWithSpecialCases(pokemonName, pokemonNameMap);
              if (!pokemonId) {
                ConsoleFormatter.warn(`Could not find ID for trade Pokémon: ${pokemonName}`);
                continue;
              }

              // Handle multiple "asking for" Pokémon names separated by slashes
              const askingForNames = askingForCell
                .replace(/\[\[([^\]]+)\]\]/g, '$1')
                .replace(/\[\[([^\]]+)\|([^\]]+)\]\]/g, '$2')
                .trim()
                .split('/')
                .map(name => name.trim())
                .filter(name => name.length > 0);

              // For now, we'll use the first valid Pokémon ID found
              // In the future, this could be expanded to handle multiple trade options
              let askingForId: number | null = null;
              let cleanAskingFor = '';

              for (const askingForName of askingForNames) {
                const foundAskingForId = findPokemonIdWithSpecialCases(askingForName, pokemonNameMap);
                if (foundAskingForId) {
                  askingForId = foundAskingForId;
                  cleanAskingFor = askingForName;
                  break;
                }
              }

              if (!askingForId) {
                ConsoleFormatter.warn(`Could not find ID for asking for Pokémon: ${askingForNames.join('/')}`);
                continue;
              }

              // Clean up notes text
              const cleanNotes = notesCell
                .replace(/\[\[([^\]]+)\]\]/g, '$1')
                .replace(/\[\[([^\]]+)\|([^\]]+)\]\]/g, '$2')
                .trim();

              // Create unique key to avoid duplicates for split entries
              const uniqueKey = `${pokemonName}-${locationCell}`;
              if (tradesSeen.has(uniqueKey)) {
                continue;
              }
              tradesSeen.add(uniqueKey);

              const trade: TradePokemon = {
                pokemonId,
                askingForId,
                askingFor: cleanAskingFor,
                location: cleanLocationName(locationCell),
                notes: cleanNotes || undefined
              };

              trades.push(trade);
            }
          });
        }
      }
    });

    ConsoleFormatter.success(`Found ${gifts.length} gift Pokémon and ${trades.length} trades`);

    return { gifts, trades };

  } catch (error) {
    ConsoleFormatter.error(`Error scraping gifts and trades: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

async function main() {
  const startTime = Date.now();

  try {
    const dataDir = path.join(process.cwd(), 'data');
    await fs.mkdir(dataDir, { recursive: true });

    ConsoleFormatter.info('Scraping Gifts and Trades...');
    const { gifts, trades } = await scrapeGiftsAndTrades();

    // Write to files
    ConsoleFormatter.info('Saving data to files...');
    const giftsPath = path.join(dataDir, 'gifts.json');
    const tradesPath = path.join(dataDir, 'trades.json');

    await Promise.all([
      fs.writeFile(giftsPath, JSON.stringify(gifts, null, 2)),
      fs.writeFile(tradesPath, JSON.stringify(trades, null, 2))
    ]);

    // Get file stats
    const [giftsStats, tradesStats] = await Promise.all([
      fs.stat(giftsPath),
      fs.stat(tradesPath)
    ]);

    const duration = Date.now() - startTime;

    // Calculate unique locations
    const uniqueGiftLocations = new Set(gifts.map(gift => gift.location)).size;
    const uniqueTradeLocations = new Set(trades.map(trade => trade.location)).size;

    // Success summary
    ConsoleFormatter.printSummary('Gifts and Trades Scraping Complete!', [
      { label: 'Total gifts found', value: gifts.length, color: 'yellow' },
      { label: 'Unique gift locations', value: uniqueGiftLocations, color: 'yellow' },
      { label: 'Gifts saved to', value: giftsPath, color: 'cyan' },
      { label: 'Gifts file size', value: ConsoleFormatter.formatFileSize(giftsStats.size), color: 'cyan' },
      { label: 'Total trades found', value: trades.length, color: 'yellow' },
      { label: 'Unique trade locations', value: uniqueTradeLocations, color: 'yellow' },
      { label: 'Trades saved to', value: tradesPath, color: 'cyan' },
      { label: 'Trades file size', value: ConsoleFormatter.formatFileSize(tradesStats.size), color: 'cyan' },
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