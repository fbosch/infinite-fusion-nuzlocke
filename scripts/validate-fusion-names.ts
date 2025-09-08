#!/usr/bin/env node

import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConsoleFormatter } from './utils/console-utils';
import type { DexEntry } from './utils/data-loading-utils';

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
    } catch (pokemonDataError) {
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
 * Generates expected fusion name from our calculated parts
 */
function generateExpectedFusionName(headPokemon: DexEntry, bodyPokemon: DexEntry): string {
  if (!headPokemon.headNamePart || !bodyPokemon.bodyNamePart) {
    return `${headPokemon.name}/${bodyPokemon.name}`;
  }
  
  return `${headPokemon.headNamePart}${bodyPokemon.bodyNamePart}`;
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
  } catch (error) {
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
 * Validates a single fusion combination
 */
async function validateCombination(headPokemon: DexEntry, bodyPokemon: DexEntry): Promise<ValidationResult> {
  const expectedFusionName = generateExpectedFusionName(headPokemon, bodyPokemon);
  
  try {
    const actualFusionName = await getActualFusionName(headPokemon.id, bodyPokemon.id);
    
    if (!actualFusionName) {
      return {
        headPokemon,
        bodyPokemon,
        expectedFusionName,
        actualFusionName: 'Failed to fetch',
        matches: false,
        error: 'Failed to fetch from FusionDex.org'
      };
    }
    
    const matches = expectedFusionName.toLowerCase() === actualFusionName.toLowerCase();
    
    return {
      headPokemon,
      bodyPokemon,
      expectedFusionName,
      actualFusionName,
      matches
    };
  } catch (error) {
    return {
      headPokemon,
      bodyPokemon,
      expectedFusionName,
      actualFusionName: 'Error',
      matches: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Main validation function
 */
async function validateFusionNames(): Promise<void> {
  ConsoleFormatter.printHeader('Fusion Name Validation', 'Validating fusion name parts against FusionDex.org');
  
  try {
    // Load Pokemon data
    console.log('\n🔍 Starting Fusion Name Validation...\n');
    const baseEntries = await loadPokemonData();
    
    // Select random combinations
    ConsoleFormatter.printSection('Selecting random combinations');
    const combinations = selectRandomCombinations(baseEntries, 10);
    
    ConsoleFormatter.info(`Selected ${combinations.length} random combinations for validation`);
    
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
