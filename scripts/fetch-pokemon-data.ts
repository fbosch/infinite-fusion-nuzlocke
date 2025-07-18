#!/usr/bin/env node

import Pokedex from 'pokedex-promise-v2';
import fs from 'fs/promises';
import path from 'path';
import type { DexEntry } from './scrape-pokedex';
import { ConsoleFormatter, progressBarConfigs } from './console-utils';
import * as cliProgress from 'cli-progress';

// Optimized configuration for pokedex-promise-v2
const P = new Pokedex({
  cacheLimit: 24 * 60 * 60 * 1000, // 24 hours cache
  timeout: 30 * 1000 // 30 second timeout
});

interface PokemonType {
  name: string;
}

interface PokemonSpeciesData {
  is_legendary: boolean;
  is_mythical: boolean;
  generation: string | null;
}

export interface ProcessedPokemonData {
  id: number;
  nationalDexId: number;
  name: string;
  types: PokemonType[];
  species: PokemonSpeciesData
}

async function fetchPokemonData(): Promise<ProcessedPokemonData[]> {
  const startTime = Date.now();

  try {
    ConsoleFormatter.info('Loading Pokemon entries...');

    // Read the pokemon entries with custom IDs and names
    const pokemonEntriesPath = path.join(process.cwd(), 'data/base-entries.json');
    const pokemonEntriesData = await fs.readFile(pokemonEntriesPath, 'utf8');
    const pokemonEntries: DexEntry[] = JSON.parse(pokemonEntriesData);

    ConsoleFormatter.success(`Found ${pokemonEntries.length} Pokemon entries to fetch data for`);

    const pokemonData: ProcessedPokemonData[] = [];

    // Optimized batch configuration
    const batchSize = 50;
    const delayBetweenBatches = 500;
    const maxConcurrentBatches = 3;

    // Split entries into batches
    const batches: DexEntry[][] = [];
    for (let i = 0; i < pokemonEntries.length; i += batchSize) {
      batches.push(pokemonEntries.slice(i, i + batchSize));
    }

    ConsoleFormatter.working(`Processing ${batches.length} batches (${batchSize} Pokemon each, ${maxConcurrentBatches} concurrent batches)`);

    // Create main progress bar
    const mainProgressBar = ConsoleFormatter.createProgressBar(pokemonEntries.length);

    let totalProcessed = 0;

    // Process batches with controlled concurrency
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += maxConcurrentBatches) {
      const currentBatches = batches.slice(batchIndex, batchIndex + maxConcurrentBatches);

      // Process multiple batches concurrently
      const batchPromises = currentBatches.map((batch, localIndex) =>
        processBatch(batch, batchIndex + localIndex + 1, batches.length, mainProgressBar, totalProcessed)
      );

      const batchResults = await Promise.all(batchPromises);

      // Flatten and add results
      for (const batchResult of batchResults) {
        pokemonData.push(...batchResult);
        totalProcessed += batchResult.length;
      }

      mainProgressBar.update(totalProcessed, { status: `Processed ${totalProcessed}/${pokemonEntries.length} Pokemon` });

      // Delay only between batch groups, not individual batches
      if (batchIndex + maxConcurrentBatches < batches.length) {
        mainProgressBar.update(totalProcessed, { status: 'Pausing between batch groups...' });
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    mainProgressBar.update(totalProcessed, { status: 'Complete!' });
    mainProgressBar.stop();

    ConsoleFormatter.success(`Successfully fetched data for ${pokemonData.length} Pokemon`);

    // Sort by custom ID to maintain Infinite Fusion order
    pokemonData.sort((a, b) => a.id - b.id);

    // Write to JSON file
    ConsoleFormatter.info('Saving data to file...');
    const outputPath = path.join(process.cwd(), 'data/pokemon-data.json');
    await fs.writeFile(outputPath, JSON.stringify(pokemonData, null, 2));

    const fileStats = await fs.stat(outputPath);
    const duration = Date.now() - startTime;

    // Success summary
    ConsoleFormatter.printSummary('Pokemon Data Fetch Complete!', [
      { label: '📁 Output saved to', value: outputPath, color: 'cyan' },
      { label: '📊 Total Pokemon', value: pokemonData.length, color: 'green' },
      { label: '🗂️  File size', value: ConsoleFormatter.formatFileSize(fileStats.size), color: 'cyan' },
      { label: '⏱️  Duration', value: ConsoleFormatter.formatDuration(duration), color: 'yellow' }
    ]);

    return pokemonData;

  } catch (error) {
    ConsoleFormatter.error(`Error fetching Pokemon data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

async function processBatch(
  batch: DexEntry[],
  batchNumber: number,
  totalBatches: number,
  mainProgressBar: cliProgress.SingleBar,
  currentTotal: number
): Promise<ProcessedPokemonData[]> {

  // Prepare normalized names for batch API call
  const batchEntries = batch.map(entry => {
    const normalizedName = entry.name.toLowerCase()
      .replace(/♀/g, '-f')
      .replace(/♂/g, '-m')
      .replace(/\./g, '')
      .replace(/'/g, '')
      .replace(/\s+/g, '-')
      .replace(/é/g, 'e')
      .replace(/^aegislash.*$/i, 'aegislash-shield')
      .replace(/^oricorio.*$/i, 'oricorio-baile')
      .replace(/^deoxys.*$/i, 'deoxys-normal')
      .replace(/^gourgeist.*$/i, 'gourgeist-average')
      .replace(/^pumpkaboo.*$/i, 'pumpkaboo-average')
      .replace(/^castform.*$/i, 'castform')
      .replace(/^mimikyu.*$/i, 'mimikyu-disguised')
      .replace(/^giratina.*$/i, 'giratina-altered')
      .replace(/^minior.*$/i, 'minior-red-meteor')
      .replace(/^meloetta.*$/i, 'meloetta-aria')
      .replace(/^lycanroc.*$/i, 'lycanroc-midday')
      .replace(/^necrozma.*$/i, 'necrozma')

    return { entry, normalizedName };
  });

  const normalizedNames = batchEntries.map(item => item.normalizedName);

  try {
    // Update main progress bar with current batch info
    mainProgressBar.update(currentTotal, {
      status: `Batch ${batchNumber}/${totalBatches}: ${batch[0].name} - ${batch[batch.length - 1].name}`
    });

    // First get Pokemon data, then use those results to get species data
    const pokemonResults = await P.getPokemonByName(normalizedNames);
    const pokemonIds = pokemonResults.map((pokemon: any) => pokemon.id);
    const speciesResults = await P.getPokemonSpeciesByName(pokemonIds);

    // Process results
    const results: ProcessedPokemonData[] = batchEntries.map((item, index): ProcessedPokemonData => {
      const pokemon = pokemonResults[index];
      const species = speciesResults[index];

      if (!pokemon || !species) {
        throw new Error(`Missing data for "${item.entry.name}" (API name: ${item.normalizedName}) (ID ${item.entry.id})`);
      }

      return {
        id: item.entry.id,
        nationalDexId: pokemon.id,
        name: item.entry.name, // Keep original name from Infinite Fusion
        types: pokemon.types.map((type: any) => ({
          name: type.type.name
        })),
        species: {
          is_legendary: species.is_legendary,
          is_mythical: species.is_mythical,
          generation: species.generation?.name || null,
        }
      };
    });

    return results;

  } catch (error) {
    // Update progress bar to show fallback mode
    mainProgressBar.update(currentTotal, {
      status: `Batch ${batchNumber}/${totalBatches}: Fallback mode (individual calls)`
    });

    // Fallback to individual calls with controlled concurrency
    const individualResults: (ProcessedPokemonData | null)[] = [];
    const concurrencyLimit = 10;

    // Create a mini progress bar for the fallback batch
    const batchProgressBar = ConsoleFormatter.createMiniProgressBar(batchEntries.length, 'Starting individual calls...');

    for (let i = 0; i < batchEntries.length; i += concurrencyLimit) {
      const chunk = batchEntries.slice(i, i + concurrencyLimit);

      const chunkPromises = chunk.map(async (item, chunkIndex): Promise<ProcessedPokemonData | null> => {
        try {
          const pokemon = await P.getPokemonByName(item.normalizedName);
          const species = await P.getPokemonSpeciesByName(pokemon.id);

          batchProgressBar.update(i + chunkIndex + 1, { status: `Fetched ${item.entry.name}` });

          return {
            id: item.entry.id,
            nationalDexId: pokemon.id,
            name: item.entry.name,
            types: pokemon.types.map((type: any) => ({
              name: type.type.name
            })),
            species: {
              is_legendary: species.is_legendary,
              is_mythical: species.is_mythical,
              generation: species.generation?.name || null,
            }
          };
        } catch (error) {
          batchProgressBar.update(i + chunkIndex + 1, { status: `Failed: ${item.entry.name}` });
          return null;
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      individualResults.push(...chunkResults);

      // Update batch progress
      batchProgressBar.update(Math.min(i + concurrencyLimit, batchEntries.length), {
        status: `Processing chunk ${Math.floor(i / concurrencyLimit) + 1}...`
      });

      // Small delay between chunks in fallback mode
      if (i + concurrencyLimit < batchEntries.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    batchProgressBar.update(batchEntries.length, { status: 'Complete!' });
    batchProgressBar.stop();

    const validResults = individualResults.filter((result): result is ProcessedPokemonData => result !== null);
    return validResults;
  }
}

// Run the fetcher
fetchPokemonData(); 