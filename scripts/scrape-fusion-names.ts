#!/usr/bin/env node

import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConsoleFormatter } from './utils/console-utils';
import type { Pokemon } from '../src/loaders/pokemon';


/**
 * Delays execution for the specified number of milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Loads Pokemon data from the main JSON file
 */
async function loadPokemonData(): Promise<Pokemon[]> {
  try {
    const pokemonDataPath = path.join(process.cwd(), 'data', 'shared', 'pokemon-data.json');
    const pokemonDataContent = await fs.readFile(pokemonDataPath, 'utf8');
    const pokemonData: Pokemon[] = JSON.parse(pokemonDataContent);
    
    ConsoleFormatter.success(`Loaded ${pokemonData.length} Pokemon entries`);
    return pokemonData;
  } catch (error) {
    ConsoleFormatter.error(`Error loading Pokemon data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Constructs the FusionDex.org URL for a Pokemon as head with a specific body
 */
function getFusionDexUrl(headId: number, bodyId: number): string {
  return `https://www.fusiondex.org/${headId}.${bodyId}/`;
}


/**
 * Extracts fusion name from a specific fusion page (optimized to only read title)
 */
async function scrapeSpecificFusion(headId: number, bodyId: number): Promise<string | null> {
  const url = getFusionDexUrl(headId, bodyId);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Infinite-Fusion-Scraper/1.0',
        'Range': 'bytes=0-8192' // Only fetch first 8KB to get the title
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        ConsoleFormatter.warn(`❌ 404 Not Found: ${url}`);
        return null;
      }
      // If Range header is not supported, fall back to full fetch
      if (response.status === 416) {
        return await scrapeSpecificFusionFull(headId, bodyId);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Read only the first chunk of HTML
    const htmlChunk = await response.text();
    
    // Extract title using regex (faster than cheerio for this simple case)
    const titleMatch = htmlChunk.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (!titleMatch) {
      ConsoleFormatter.warn(`❌ No title found in HTML chunk for ${url}`);
      return null;
    }
    
    const pageTitle = titleMatch[1].trim();
    
    // Extract the fusion name by removing the ID part and site name
    // "Bulbamander #1.4 - FusionDex.org" -> "Bulbamander"
    const fusionName = pageTitle.split(' #')[0].trim();
    
    if (fusionName && fusionName.length >= 3 && fusionName.length <= 20) {
      return fusionName;
    }
    
    ConsoleFormatter.warn(`❌ Invalid fusion name length: "${fusionName}" (${fusionName.length} chars) from ${url}`);
    return null;
    
  } catch (_error) {
    ConsoleFormatter.warn(`Error scraping fusion ${headId}.${bodyId}: ${_error instanceof Error ? _error.message : 'Unknown error'}`);
    return null;
  }
}

/**
 * Fallback method to fetch the full page if Range header is not supported
 */
async function scrapeSpecificFusionFull(headId: number, bodyId: number): Promise<string | null> {
  const url = getFusionDexUrl(headId, bodyId);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Infinite-Fusion-Scraper/1.0'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const pageTitle = $('title').text().trim();
    const fusionName = pageTitle.split(' #')[0].trim();
    
    if (fusionName && fusionName.length >= 3 && fusionName.length <= 20) {
      return fusionName;
    }
    
    return null;
    
  } catch {
    return null;
  }
}

/**
 * Ultra-simplified Ditto method for determining Pokemon name parts
 * Ditto (ID 132) has consistent parts: "Dit" (head) and "to" (body)
 * 
 * This method uses Ditto as a reference because:
 * - "Dit" and "to" are very unique parts that won't overlap with many other Pokemon names
 * - Simple structure with clear boundaries
 * - No complex merging logic needed
 */


/**
 * Merges two strings, removing overlapping characters at the boundary
 * Example: mergeOverlappingStrings("Sphe", "eal") = "Spheal"
 */
function mergeOverlappingStrings(str1: string, str2: string): string {
  // Find the longest suffix of str1 that matches a prefix of str2
  for (let i = Math.min(str1.length, str2.length); i > 0; i--) {
    if (str1.slice(-i) === str2.slice(0, i)) {
      return str1 + str2.slice(i);
    }
  }
  return str1 + str2; // No overlap found
}

/**
 * Extracts head part from Pokemon + Ditto fusion (simple approach)
 */
function extractHeadPart(pokemonName: string, fusionName: string): string {
  const fusionLower = fusionName.toLowerCase();
  const toIndex = fusionLower.indexOf('to');
  
  if (toIndex === -1) {
    return pokemonName; // fallback
  }
  
  // Simply extract everything before "to"
  return fusionName.slice(0, toIndex);
}

/**
 * Extracts body part from Ditto + Pokemon fusion (simple approach)
 */
function extractBodyPart(pokemonName: string, fusionName: string): string {
  const fusionLower = fusionName.toLowerCase();
  const ditIndex = fusionLower.indexOf('dit');
  
  if (ditIndex !== 0) {
    return pokemonName; // fallback
  }
  
  // Simply extract everything after "Dit"
  return fusionName.slice(3);
}

/**
 * Determines the head and body name parts for a Pokemon using the bidirectional "Ditto method"
 * 
 * Method:
 * 1. Scrape Pokemon + Ditto to get head part candidates
 * 2. Scrape Ditto + Pokemon to get body part candidates  
 * 3. Find the combination that perfectly reconstructs the original name
 * 4. Use fallback logic if no perfect match is found
 */
async function determineNameParts(pokemonId: number, pokemonName: string): Promise<{ headNamePart: string, bodyNamePart: string }> {
  try {
    const dittoId = 132;
    
    // Step 1: Get Pokemon + Ditto fusion (should end with "to")
    const headFusionName = await scrapeSpecificFusion(pokemonId, dittoId);
    
    // Step 2: Get Ditto + Pokemon fusion (should start with "Dit")
    const bodyFusionName = await scrapeSpecificFusion(dittoId, pokemonId);
    
    // Step 3: Extract raw parts (overlap handling will be done during fusion name generation)
    let headPart = pokemonName; // fallback
    let bodyPart = pokemonName; // fallback
    
    if (headFusionName && headFusionName.toLowerCase().endsWith('to')) {
      headPart = extractHeadPart(pokemonName, headFusionName);
    } else {
      ConsoleFormatter.warn(`❌ ${pokemonName}: Head fusion doesn't end with "to": "${headFusionName}"`);
    }
    
    if (bodyFusionName && bodyFusionName.toLowerCase().startsWith('dit')) {
      bodyPart = extractBodyPart(pokemonName, bodyFusionName);
    } else {
      ConsoleFormatter.warn(`❌ ${pokemonName}: Body fusion doesn't start with "Dit": "${bodyFusionName}"`);
    }
    
    // Step 4: Return the extracted parts (validation will be done by the validation script)
    
    return { headNamePart: headPart, bodyNamePart: bodyPart };
    
  } catch (error) {
    ConsoleFormatter.error(`Error with ${pokemonName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { headNamePart: pokemonName, bodyNamePart: pokemonName };
  }
}



/**
 * Processes a single Pokemon entry
 */
async function processPokemonEntry(entry: Pokemon): Promise<Pokemon> {
  try {
    // Skip special entries (like Egg entry which shouldn't exist in pokemon-data.json anyway)
    if (entry.id <= 0) {
      return entry;
    }
    
    // Determine head and body name parts using the Tropius reference method
    const { headNamePart, bodyNamePart } = await determineNameParts(entry.id, entry.name);
    
    // Update the entry
    return {
      ...entry,
      headNamePart: headNamePart,
      bodyNamePart: bodyNamePart
    };
    
  } catch (error) {
    ConsoleFormatter.error(`Error processing ${entry.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return entry; // Return original entry on error
  }
}

/**
 * Updates Pokemon data with fusion name data using parallel processing
 */
async function updatePokemonDataWithFusionNames(pokemonData: Pokemon[]): Promise<Pokemon[]> {
  const progressBar = ConsoleFormatter.createProgressBar(pokemonData.length);
  
  // Process all Pokemon entries in parallel batches
  ConsoleFormatter.printSection('Processing all Pokemon entries in parallel');
  
  const BATCH_SIZE = 10; // Process 10 Pokemon at a time
  const CONCURRENT_BATCHES = 3; // Run 3 batches concurrently
  const updatedEntries: Pokemon[] = [];
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  let processedCount = 0;
  const errorDetails: Array<{ name: string; id: number; error: string }> = [];
  
  // Process in batches
  for (let i = 0; i < pokemonData.length; i += BATCH_SIZE * CONCURRENT_BATCHES) {
    const batchPromises: Promise<Pokemon[]>[] = [];
    
    // Create concurrent batches
    for (let j = 0; j < CONCURRENT_BATCHES && i + j * BATCH_SIZE < pokemonData.length; j++) {
      const batchStart = i + j * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, pokemonData.length);
      const batch = pokemonData.slice(batchStart, batchEnd);
      
      const batchPromise = Promise.all(
        batch.map(async (entry) => {
          const result = await processPokemonEntry(entry);
          processedCount++;
          
          // Count results
          if (entry.id <= 0) {
            skippedCount++;
          } else {
            // Check for specific issues - only count as errors if parts are missing, not if they equal the full name
            const issues: string[] = [];
            
            if (!result.headNamePart) {
              issues.push('missing head part');
            }
            if (!result.bodyNamePart) {
              issues.push('missing body part');
            }
            
            if (issues.length === 0) {
              successCount++;
            } else {
              errorCount++;
              errorDetails.push({
                name: entry.name,
                id: entry.id,
                error: issues.join(', ')
              });
            }
          }
          
          // Update progress
          progressBar.update(processedCount, { 
            status: `Processed ${result.name} (${successCount} success, ${errorCount} errors)` 
          });
          
          return result;
        })
      );
      
      batchPromises.push(batchPromise);
    }
    
    // Wait for all batches in this round to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Flatten and add results
    for (const batchResult of batchResults) {
      updatedEntries.push(...batchResult);
    }
    
    // Small delay between batch rounds to be respectful to the server
    if (i + BATCH_SIZE * CONCURRENT_BATCHES < pokemonData.length) {
      await delay(300);
    }
  }
  
  progressBar.stop();
  
  // Log final statistics
  ConsoleFormatter.printSection('Scraping Statistics');
  ConsoleFormatter.info(`Total Pokemon processed: ${pokemonData.length}`);
  ConsoleFormatter.success(`Successfully processed: ${successCount}`);
  ConsoleFormatter.warn(`Errors encountered: ${errorCount}`);
  ConsoleFormatter.info(`Skipped entries: ${skippedCount}`);
  
  // Log error details
  if (errorDetails.length > 0) {
    ConsoleFormatter.printSection('Error Details');
    errorDetails.forEach(({ name, id, error }) => {
      ConsoleFormatter.error(`${name} (ID: ${id}): ${error}`);
    });
  }
  
  return updatedEntries;
}

/**
 * Saves updated Pokemon data to file
 */
async function savePokemonData(pokemonData: Pokemon[]): Promise<void> {
  try {
    const outputPath = path.join(process.cwd(), 'data', 'shared', 'pokemon-data.json');
    
    // Create backup of original file
    const backupPath = `${outputPath}.backup.${Date.now()}`;
    await fs.copyFile(outputPath, backupPath);
    ConsoleFormatter.info(`Created backup: ${backupPath}`);
    
    // Write updated entries
    await fs.writeFile(outputPath, JSON.stringify(pokemonData, null, 2));
    ConsoleFormatter.success(`Updated Pokemon data saved to: ${outputPath}`);
    
  } catch (error) {
    ConsoleFormatter.error(`Error saving Pokemon data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Saves partial Pokemon data update (single Pokemon)
 */
async function savePokemonDataPartial(updatedEntry: Pokemon, allPokemonData: Pokemon[]): Promise<void> {
  try {
    const outputPath = path.join(process.cwd(), 'data', 'shared', 'pokemon-data.json');
    
    // Create backup of original file
    const backupPath = `${outputPath}.backup.${Date.now()}`;
    await fs.copyFile(outputPath, backupPath);
    ConsoleFormatter.info(`Created backup: ${backupPath}`);
    
    // Update the specific entry in the full dataset
    const updatedPokemonData = allPokemonData.map(entry => 
      entry.id === updatedEntry.id ? updatedEntry : entry
    );
    
    // Write updated entries
    await fs.writeFile(outputPath, JSON.stringify(updatedPokemonData, null, 2));
    ConsoleFormatter.success(`Updated Pokemon data saved to: ${outputPath}`);
    ConsoleFormatter.info(`Updated entry: ${updatedEntry.name} (ID: ${updatedEntry.id})`);
    
  } catch (error) {
    ConsoleFormatter.error(`Error saving Pokemon data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

async function main() {
  const startTime = Date.now();

  try {
    ConsoleFormatter.printHeader(
      'Pokemon Fusion Names Scraper',
      'Scraping fusion names from FusionDex.org to enrich Pokemon data'
    );

    // Parse command line arguments
    const args = process.argv.slice(2);
    const targetPokemon = args.find(arg => arg.startsWith('--pokemon='))?.split('=')[1];
    
    if (targetPokemon) {
      ConsoleFormatter.info(`Target Pokemon: ${targetPokemon}`);
    }

    // Load Pokemon data
    ConsoleFormatter.printSection('Loading Pokemon data');
    const pokemonData = await loadPokemonData();

    // Filter to target Pokemon if specified
    let pokemonToProcess = pokemonData;
    if (targetPokemon) {
      const targetEntry = pokemonData.find(p => 
        p.name.toLowerCase() === targetPokemon.toLowerCase() || 
        p.id.toString() === targetPokemon
      );
      
      if (!targetEntry) {
        ConsoleFormatter.error(`Pokemon not found: ${targetPokemon}`);
        process.exit(1);
      }
      
      pokemonToProcess = [targetEntry];
      ConsoleFormatter.info(`Processing only: ${targetEntry.name} (ID: ${targetEntry.id})`);
    }

    // Update entries with fusion name data
    ConsoleFormatter.printSection('Scraping fusion names and updating Pokemon data');
    const updatedEntries = await updatePokemonDataWithFusionNames(pokemonToProcess);

    // Save updated entries
    ConsoleFormatter.printSection('Saving updated Pokemon data');
    if (targetPokemon) {
      // For single Pokemon updates, merge with existing data
      await savePokemonDataPartial(updatedEntries[0], pokemonData);
    } else {
      // For full updates, save all entries
      await savePokemonData(updatedEntries);
    }

    // Calculate statistics
    const entriesWithHeadParts = updatedEntries.filter(entry => 
      entry.id > 0 && entry.headNamePart
    );
    const entriesWithBodyParts = updatedEntries.filter(entry => 
      entry.id > 0 && entry.bodyNamePart
    );

    const duration = Date.now() - startTime;

    // Success summary
    if (targetPokemon) {
      const updatedEntry = updatedEntries[0];
      ConsoleFormatter.printSummary('Single Pokemon Update Complete!', [
        { label: 'Pokemon processed', value: updatedEntry.name, color: 'green' },
        { label: 'Head name part', value: updatedEntry.headNamePart || 'None', color: updatedEntry.headNamePart ? 'green' : 'red' },
        { label: 'Body name part', value: updatedEntry.bodyNamePart || 'None', color: updatedEntry.bodyNamePart ? 'green' : 'red' },
        { label: 'Duration', value: ConsoleFormatter.formatDuration(duration), color: 'yellow' }
      ]);
    } else {
      ConsoleFormatter.printSummary('Fusion Names Scraping Complete!', [
        { label: 'Total Pokemon processed', value: updatedEntries.length, color: 'yellow' },
        { label: 'Entries with head name parts', value: entriesWithHeadParts.length, color: 'green' },
        { label: 'Entries with body name parts', value: entriesWithBodyParts.length, color: 'green' },
        { label: 'Duration', value: ConsoleFormatter.formatDuration(duration), color: 'yellow' }
      ]);
    }

  } catch (error) {
    ConsoleFormatter.error(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Check if this script is being run directly
if (process.argv[1] && process.argv[1].endsWith('scrape-fusion-names.ts')) {
  main();
}
