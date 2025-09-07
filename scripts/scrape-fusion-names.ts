#!/usr/bin/env node

import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConsoleFormatter } from './utils/console-utils';

interface BasePokemonEntry {
  id: number;
  name: string;
  headNamePart?: string;
  bodyNamePart?: string;
}


/**
 * Delays execution for the specified number of milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Loads base Pokemon entries from the JSON file
 */
async function loadBaseEntries(): Promise<BasePokemonEntry[]> {
  try {
    const baseEntriesPath = path.join(process.cwd(), 'data', 'shared', 'base-entries.json');
    const baseEntriesContent = await fs.readFile(baseEntriesPath, 'utf8');
    const baseEntries: BasePokemonEntry[] = JSON.parse(baseEntriesContent);
    
    ConsoleFormatter.success(`Loaded ${baseEntries.length} base Pokemon entries`);
    return baseEntries;
  } catch (error) {
    ConsoleFormatter.error(`Error loading base entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
 * Extracts fusion name from a specific fusion page
 */
async function scrapeSpecificFusion(headId: number, bodyId: number): Promise<string | null> {
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
    
    // Look for the fusion name in the page title - based on the website structure
    // The fusion name appears in the title like "Bulbamander #1.4 - FusionDex.org"
    const pageTitle = $('title').text().trim();
    
    // Extract the fusion name by removing the ID part and site name
    // "Bulbamander #1.4 - FusionDex.org" -> "Bulbamander"
    const fusionName = pageTitle.split(' #')[0].trim();
    
    if (fusionName && fusionName.length >= 3 && fusionName.length <= 20) {
      return fusionName;
    }
    
    return null;
    
  } catch (error) {
    ConsoleFormatter.warn(`Error scraping fusion ${headId}.${bodyId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

/**
 * Determines head and body name parts by scraping both directions with Tropius
 */
async function determineNameParts(pokemonId: number, pokemonName: string): Promise<{ headNamePart: string, bodyNamePart: string }> {
  try {
    // Use Tropius (556) as a reference Pokemon because it has a distinctive ending "pius"
    const tropiusId = 556;
    
    let headNamePart = pokemonName; // fallback
    let bodyNamePart = pokemonName; // fallback
    
    // Scrape Pokemon + Tropius to get head part
    const headFusionName = await scrapeSpecificFusion(pokemonId, tropiusId);
    if (headFusionName) {
      const fusionName = headFusionName.toLowerCase();
      
      // The fusion name should end with "pius", so the head part is what comes before it
      if (fusionName.endsWith('pius')) {
        headNamePart = headFusionName.substring(0, headFusionName.length - 4); // Remove "pius"
      }
    }
    
    // Scrape Tropius + Pokemon to get body part
    const bodyFusionName = await scrapeSpecificFusion(tropiusId, pokemonId);
    if (bodyFusionName) {
      const fusionName = bodyFusionName.toLowerCase();
      
      // The fusion name should start with "tro", so the body part is what comes after it
      if (fusionName.startsWith('tro')) {
        bodyNamePart = bodyFusionName.substring(3); // Remove "Tro"
      }
    }
    
    return { headNamePart, bodyNamePart };
    
  } catch (error) {
    ConsoleFormatter.error(`Error determining name parts for ${pokemonName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { headNamePart: pokemonName, bodyNamePart: pokemonName };
  }
}


/**
 * Processes a single Pokemon entry
 */
async function processPokemonEntry(entry: BasePokemonEntry): Promise<BasePokemonEntry> {
  try {
    // Skip Egg entry
    if (entry.id === -1) {
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
 * Updates base entries with fusion name data using parallel processing
 */
async function updateBaseEntriesWithFusionNames(baseEntries: BasePokemonEntry[]): Promise<BasePokemonEntry[]> {
  const progressBar = ConsoleFormatter.createProgressBar(baseEntries.length);
  
  // Process all Pokemon entries in parallel batches
  ConsoleFormatter.printSection('Processing all Pokemon entries in parallel');
  
  const BATCH_SIZE = 10; // Process 10 Pokemon at a time
  const CONCURRENT_BATCHES = 3; // Run 3 batches concurrently
  const updatedEntries: BasePokemonEntry[] = [];
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  let processedCount = 0;
  const errorDetails: Array<{ name: string; id: number; error: string }> = [];
  
  // Process in batches
  for (let i = 0; i < baseEntries.length; i += BATCH_SIZE * CONCURRENT_BATCHES) {
    const batchPromises: Promise<BasePokemonEntry[]>[] = [];
    
    // Create concurrent batches
    for (let j = 0; j < CONCURRENT_BATCHES && i + j * BATCH_SIZE < baseEntries.length; j++) {
      const batchStart = i + j * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, baseEntries.length);
      const batch = baseEntries.slice(batchStart, batchEnd);
      
      const batchPromise = Promise.all(
        batch.map(async (entry) => {
          const result = await processPokemonEntry(entry);
          processedCount++;
          
          // Count results
          if (entry.id === -1) {
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
    if (i + BATCH_SIZE * CONCURRENT_BATCHES < baseEntries.length) {
      await delay(1000);
    }
  }
  
  progressBar.stop();
  
  // Log final statistics
  ConsoleFormatter.printSection('Scraping Statistics');
  ConsoleFormatter.info(`Total Pokemon processed: ${baseEntries.length}`);
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
 * Saves updated base entries to file
 */
async function saveBaseEntries(baseEntries: BasePokemonEntry[]): Promise<void> {
  try {
    const outputPath = path.join(process.cwd(), 'data', 'shared', 'base-entries.json');
    
    // Create backup of original file
    const backupPath = `${outputPath}.backup.${Date.now()}`;
    await fs.copyFile(outputPath, backupPath);
    ConsoleFormatter.info(`Created backup: ${backupPath}`);
    
    // Write updated entries
    await fs.writeFile(outputPath, JSON.stringify(baseEntries, null, 2));
    ConsoleFormatter.success(`Updated base entries saved to: ${outputPath}`);
    
  } catch (error) {
    ConsoleFormatter.error(`Error saving base entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

async function main() {
  const startTime = Date.now();

  try {
    ConsoleFormatter.printHeader(
      'Pokemon Fusion Names Scraper',
      'Scraping fusion names from FusionDex.org to enrich base entries'
    );

    // Load base entries
    ConsoleFormatter.printSection('Loading base Pokemon entries');
    const baseEntries = await loadBaseEntries();

    // Update entries with fusion name data
    ConsoleFormatter.printSection('Scraping fusion names and updating entries');
    const updatedEntries = await updateBaseEntriesWithFusionNames(baseEntries);

    // Save updated entries
    ConsoleFormatter.printSection('Saving updated base entries');
    await saveBaseEntries(updatedEntries);

    // Calculate statistics
    const entriesWithHeadParts = updatedEntries.filter(entry => 
      entry.id !== -1 && entry.headNamePart
    );
    const entriesWithBodyParts = updatedEntries.filter(entry => 
      entry.id !== -1 && entry.bodyNamePart
    );

    const duration = Date.now() - startTime;

    // Success summary
    ConsoleFormatter.printSummary('Fusion Names Scraping Complete!', [
      { label: 'Total Pokemon processed', value: updatedEntries.length, color: 'yellow' },
      { label: 'Entries with head name parts', value: entriesWithHeadParts.length, color: 'green' },
      { label: 'Entries with body name parts', value: entriesWithBodyParts.length, color: 'green' },
      { label: 'Duration', value: ConsoleFormatter.formatDuration(duration), color: 'yellow' }
    ]);

  } catch (error) {
    ConsoleFormatter.error(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Check if this script is being run directly
if (process.argv[1] && process.argv[1].endsWith('scrape-fusion-names.ts')) {
  main();
}
