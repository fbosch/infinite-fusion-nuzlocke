#!/usr/bin/env node

import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import * as path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { ConsoleFormatter } from './utils/console-utils';
import type { DexEntry } from './utils/data-loading-utils';
import { generateFusionName } from '../src/utils/fusionNaming';

interface ValidationResult {
  headPokemon: DexEntry;
  bodyPokemon: DexEntry;
  expectedFusionName: string;
  actualFusionName: string;
  matches: boolean;
  error?: string;
}

/**
 * Delays execution for the specified number of milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Loads Pokemon data and converts to DexEntry format
 */
async function loadPokemonData(): Promise<DexEntry[]> {
  try {
    console.log('🔄 Loading Pokemon data...');
    
    // Try to load from pokemon-data.json first (enriched data)
    try {
      const pokemonDataPath = path.join(process.cwd(), 'data', 'shared', 'pokemon-data.json');
      const pokemonDataContent = await fs.readFile(pokemonDataPath, 'utf8');
      const pokemonData = JSON.parse(pokemonDataContent);
      
      // Convert to DexEntry format
      const dexEntries: DexEntry[] = pokemonData.map((pokemon: any) => ({
        id: pokemon.id,
        name: pokemon.name,
        headNamePart: pokemon.headNamePart,
        bodyNamePart: pokemon.bodyNamePart,
      }));
      
      console.log(`✅ Loaded ${dexEntries.length} Pokemon entries from pokemon-data.json`);
      return dexEntries;
    } catch {
      console.log('⚠️  pokemon-data.json not found or invalid, trying base-entries.json...');
      
      // Fallback to base-entries.json
      const baseEntriesPath = path.join(process.cwd(), 'data', 'shared', 'base-entries.json');
      const baseEntriesContent = await fs.readFile(baseEntriesPath, 'utf8');
      const baseEntries: DexEntry[] = JSON.parse(baseEntriesContent);
      
      console.log(`✅ Loaded ${baseEntries.length} Pokemon entries from base-entries.json`);
      return baseEntries;
    }
  } catch (error) {
    console.error(`❌ Error loading Pokemon data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Generates our fusion name from calculated parts
 * NOTE: This is what our current logic produces, not necessarily what FusionDex.org has
 */
function generateOurFusionName(headPokemon: DexEntry, bodyPokemon: DexEntry): string {
  // Use the same fusion name generation logic as the UI
  return generateFusionName(headPokemon, bodyPokemon);
}

/**
 * Scrapes actual fusion name from FusionDex.org
 */
async function getActualFusionName(headId: number, bodyId: number): Promise<string | null> {
  try {
    const url = `https://www.fusiondex.org/${headId}.${bodyId}/`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Infinite-Fusion-Validator/1.0' }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    const pageTitle = $('title').text().trim();
    const fusionName = pageTitle.split(' #')[0].trim();
    
    return fusionName || null;
  } catch {
    return null;
  }
}

/**
 * Selects random Pokemon combinations for validation
 */
function selectRandomCombinations(baseEntries: DexEntry[], count: number = 10): Array<{ head: DexEntry; body: DexEntry }> {
  // Filter out entries without name parts and the Egg entry
  const validEntries = baseEntries.filter(entry => 
    entry.id !== -1 && 
    entry.headNamePart && 
    entry.bodyNamePart &&
    entry.headNamePart !== entry.name &&
    entry.bodyNamePart !== entry.name
  );
  
  console.log(`🎯 Found ${validEntries.length} valid entries with fusion name parts`);
  
  if (validEntries.length === 0) {
    console.log('❌ No Pokemon found with fusion name parts!');
    console.log('💡 You may need to run: pnpm scrape:fusion-names');
    throw new Error('No valid Pokemon with fusion name parts found');
  }
  
  const combinations: Array<{ head: DexEntry; body: DexEntry }> = [];
  
  for (let i = 0; i < count; i++) {
    const headIndex = Math.floor(Math.random() * validEntries.length);
    const bodyIndex = Math.floor(Math.random() * validEntries.length);
    
    combinations.push({
      head: validEntries[headIndex],
      body: validEntries[bodyIndex]
    });
  }
  
  return combinations;
}

/**
 * Selects specific Pokemon combinations based on fusion IDs
 */
function selectSpecificCombinations(baseEntries: DexEntry[], fusionIds: string[]): Array<{ head: DexEntry; body: DexEntry }> {
  const combinations: Array<{ head: DexEntry; body: DexEntry }> = [];
  
  for (const fusionId of fusionIds) {
    // Parse fusion ID format: "headId.bodyId" (e.g., "151.250" for Mew + Ho-oh)
    const parts = fusionId.split('.');
    if (parts.length !== 2) {
      console.log(`⚠️  Invalid fusion ID format: ${fusionId}. Expected format: headId.bodyId (e.g., 151.250)`);
      continue;
    }
    
    const headId = parseInt(parts[0], 10);
    const bodyId = parseInt(parts[1], 10);
    
    if (isNaN(headId) || isNaN(bodyId)) {
      console.log(`⚠️  Invalid fusion ID format: ${fusionId}. IDs must be numbers.`);
      continue;
    }
    
    const headPokemon = baseEntries.find(entry => entry.id === headId);
    const bodyPokemon = baseEntries.find(entry => entry.id === bodyId);
    
    if (!headPokemon) {
      console.log(`⚠️  Pokemon with ID ${headId} not found.`);
      continue;
    }
    
    if (!bodyPokemon) {
      console.log(`⚠️  Pokemon with ID ${bodyId} not found.`);
      continue;
    }
    
    combinations.push({
      head: headPokemon,
      body: bodyPokemon
    });
    
    console.log(`✅ Added combination: ${headPokemon.name} (${headId}) + ${bodyPokemon.name} (${bodyId})`);
  }
  
  if (combinations.length === 0) {
    throw new Error('No valid combinations found from provided fusion IDs');
  }
  
  return combinations;
}

/**
 * Validates a single fusion combination
 */
async function validateCombination(headPokemon: DexEntry, bodyPokemon: DexEntry): Promise<ValidationResult> {
  const ourFusionName = generateOurFusionName(headPokemon, bodyPokemon);
  
  try {
    const actualFusionName = await getActualFusionName(headPokemon.id, bodyPokemon.id);
    
    if (!actualFusionName) {
      return {
        headPokemon,
        bodyPokemon,
        expectedFusionName: 'Failed to fetch',
        actualFusionName: ourFusionName,
        matches: false,
        error: 'Failed to fetch from FusionDex.org'
      };
    }
    
    const matches = ourFusionName.toLowerCase() === actualFusionName.toLowerCase();
    
    return {
      headPokemon,
      bodyPokemon,
      expectedFusionName: actualFusionName, // FusionDex.org is the source of truth
      actualFusionName: ourFusionName,      // Our logic result
      matches
    };
  } catch (error) {
    return {
      headPokemon,
      bodyPokemon,
      expectedFusionName: 'Error occurred',
      actualFusionName: ourFusionName,
      matches: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Parses command line arguments using yargs
 */
function parseCommandLineArgs() {
  return yargs(hideBin(process.argv))
    .option('fusion-ids', {
      alias: 'f',
      type: 'string',
      description: 'Comma-separated fusion IDs to test (e.g., "151.250,150.151")',
      coerce: (value: string) => value ? value.split(',').map(id => id.trim()) : null
    })
    .option('count', {
      alias: 'c',
      type: 'number',
      default: 10,
      description: 'Number of random combinations to test',
      coerce: (value: number) => {
        if (value <= 0) {
          throw new Error('Count must be a positive number');
        }
        return value;
      }
    })
    .option('until-first-failure', {
      alias: 'u',
      type: 'boolean',
      default: false,
      description: 'Stop at the first failure (useful for debugging)'
    })
    .help('help')
    .alias('help', 'h')
    .example('pnpm validate:fusion-names', 'Test 10 random combinations')
    .example('pnpm validate:fusion-names --count 20', 'Test 20 random combinations')
    .example('pnpm validate:fusion-names --count=50', 'Test 50 random combinations')
    .example('pnpm validate:fusion-names --until-first-failure', 'Test until first failure')
    .example('pnpm validate:fusion-names --fusion-ids "151.250"', 'Test Mew + Ho-oh')
    .example('pnpm validate:fusion-names --fusion-ids "151.250,150.151"', 'Test specific combinations')
    .parseSync();
}

/**
 * Main validation function
 */
async function validateFusionNames(): Promise<void> {
  ConsoleFormatter.printHeader('Fusion Name Validation', 'Validating fusion name parts against FusionDex.org');
  
  try {
    // Parse command line arguments
    const args = parseCommandLineArgs();
    const { fusionIds, count, untilFirstFailure } = args;
    
    
    // Load Pokemon data
    console.log('\n🔍 Starting Fusion Name Validation...\n');
    const baseEntries = await loadPokemonData();
    
    // Select combinations based on arguments
    let combinations: Array<{ head: DexEntry; body: DexEntry }>;
    
    if (fusionIds) {
      ConsoleFormatter.printSection('Selecting specific combinations');
      combinations = selectSpecificCombinations(baseEntries, fusionIds);
      ConsoleFormatter.info(`Selected ${combinations.length} specific combinations for validation`);
    } else {
      ConsoleFormatter.printSection('Selecting random combinations');
      // Use a large count when until-first-failure is enabled to keep going until failure
      const effectiveCount = untilFirstFailure ? 1000 : count;
      combinations = selectRandomCombinations(baseEntries, effectiveCount);
      ConsoleFormatter.info(`Selected ${combinations.length} random combinations for validation`);
      if (untilFirstFailure) {
        ConsoleFormatter.info('🛑 Will stop at first failure');
      }
    }
    
    // Validate each combination
    ConsoleFormatter.printSection('Validating combinations');
    const progressBar = ConsoleFormatter.createProgressBar(combinations.length);
    const results: ValidationResult[] = [];
    
    for (let i = 0; i < combinations.length; i++) {
      const { head, body } = combinations[i];
      
      console.log(`🔄 [${i + 1}/${combinations.length}] Validating ${head.name} + ${body.name}...`);
      
      const result = await validateCombination(head, body);
      results.push(result);
      
      const status = result.matches ? '✅' : '❌';
      console.log(`${status} Expected: "${result.expectedFusionName}" | Actual: "${result.actualFusionName}"`);
      
      // Stop at first failure if requested
      if (untilFirstFailure && !result.matches) {
        console.log(`\n🛑 Stopping at first failure as requested.`);
        break;
      }
      
      // Rate limiting
      await delay(1000);
      
      progressBar.update(i + 1, { 
        status: `Validated ${head.name} + ${body.name}` 
      });
    }
    
    progressBar.stop();
    
    // Analyze results
    ConsoleFormatter.printSection('Validation Results');
    
    const matches = results.filter(r => r.matches);
    const mismatches = results.filter(r => !r.matches);
    
    ConsoleFormatter.success(`✅ Matches: ${matches.length}/${results.length}`);
    ConsoleFormatter.warn(`❌ Mismatches: ${mismatches.length}/${results.length}`);
    
    // Show detailed results
    ConsoleFormatter.printSection('Detailed Results');
    
    results.forEach((result, index) => {
      const status = result.matches ? '✅' : '❌';
      const headName = result.headPokemon.name;
      const bodyName = result.bodyPokemon.name;
      const expected = result.expectedFusionName;
      const actual = result.actualFusionName;
      
      ConsoleFormatter.info(`${status} ${index + 1}. ${headName} + ${bodyName}`);
      ConsoleFormatter.info(`   Expected: "${expected}"`);
      ConsoleFormatter.info(`   Actual:   "${actual}"`);
      
      if (result.error) {
        ConsoleFormatter.error(`   Error: ${result.error}`);
      }
      
      ConsoleFormatter.info(''); // Empty line for readability
    });
    
    // Summary
    const successRate = (matches.length / results.length) * 100;
    
    ConsoleFormatter.printSummary('Validation Complete', [
      { label: 'Total combinations tested', value: results.length, color: 'yellow' },
      { label: 'Successful matches', value: matches.length, color: 'green' },
      { label: 'Mismatches', value: mismatches.length, color: 'red' },
      { label: 'Success rate', value: `${successRate.toFixed(1)}%`, color: successRate >= 80 ? 'green' : 'red' }
    ]);
    
    if (successRate < 80) {
      ConsoleFormatter.warn('⚠️  Low success rate detected. Consider reviewing the fusion name calculation logic.');
    } else {
      ConsoleFormatter.success('🎉 Validation successful! Fusion name parts are working correctly.');
    }
    
  } catch (error) {
    ConsoleFormatter.error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Run the validation immediately
console.log('🚀 Starting Fusion Name Validation Script...');

validateFusionNames().catch(error => {
  console.error('❌ Validation script failed:', error);
  process.exit(1);
});
