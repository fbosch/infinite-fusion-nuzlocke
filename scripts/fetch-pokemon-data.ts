#!/usr/bin/env node

import Pokedex from 'pokedex-promise-v2';
import fs from 'fs/promises';
import path from 'path';
import type { DexEntry } from './scrape-pokedex';
import { ConsoleFormatter } from './console-utils';
import * as cliProgress from 'cli-progress';

// Optimized configuration for pokedex-promise-v2
const P = new Pokedex({
  cacheLimit: 24 * 60 * 60 * 1000, // 24 hours cache
  timeout: 30 * 1000 // 30 second timeout
});

// Cache for evolution chains to avoid duplicate API calls
const evolutionChainCache = new Map<number, any>();

async function fetchEvolutionChain(chainId: number): Promise<any> {
  if (evolutionChainCache.has(chainId)) {
    return evolutionChainCache.get(chainId);
  }

  try {
    const chainData = await P.getEvolutionChainById(chainId);
    evolutionChainCache.set(chainId, chainData);
    return chainData;
  } catch (error) {
    ConsoleFormatter.warn(`Failed to fetch evolution chain ${chainId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

function extractEvolutionData(chainData: any, pokemonName: string): EvolutionData | undefined {
  if (!chainData || !chainData.chain) {
    return undefined;
  }

  const evolutionData: EvolutionData = {
    evolves_to: []
  };

  // Helper function to find Pokemon in evolution chain
  function findPokemonInChain(chain: any, targetName: string): any {
    if (chain.species.name === targetName) {
      return chain;
    }

    for (const evolution of chain.evolves_to || []) {
      const found = findPokemonInChain(evolution, targetName);
      if (found) return found;
    }

    return null;
  }

  // Helper function to get evolution details
  function getEvolutionDetails(evolution: any): EvolutionDetail {
    const details: EvolutionDetail = {
      id: parseInt(evolution.species.url.split('/').slice(-2)[0]),
      name: evolution.species.name
    };

    if (evolution.evolution_details && evolution.evolution_details.length > 0) {
      const detail = evolution.evolution_details[0];

      if (detail.min_level) details.min_level = detail.min_level;
      if (detail.item) details.item = detail.item.name;
      if (detail.location) details.location = detail.location.name;
      if (detail.trigger) details.trigger = detail.trigger.name;

      // Handle special conditions
      if (detail.min_happiness) details.condition = `Happiness: ${detail.min_happiness}`;
      if (detail.min_affection) details.condition = `Affection: ${detail.min_affection}`;
      if (detail.time_of_day) details.condition = `Time: ${detail.time_of_day}`;
      if (detail.known_move_type) details.condition = `Knows ${detail.known_move_type.name} move`;
      if (detail.held_item_type) details.condition = `Holding ${detail.held_item_type.name}`;
    }

    return details;
  }

  // Find the Pokemon in the chain
  const pokemonInChain = findPokemonInChain(chainData.chain, pokemonName);
  if (!pokemonInChain) {
    return undefined;
  }

  // Get evolutions from this Pokemon
  for (const evolution of pokemonInChain.evolves_to || []) {
    evolutionData.evolves_to.push(getEvolutionDetails(evolution));
  }

  // Find what this Pokemon evolves from
  function findPreEvolution(chain: any, targetName: string, parent: any = null): any {
    if (chain.species.name === targetName) {
      return parent;
    }

    for (const evolution of chain.evolves_to || []) {
      const found = findPreEvolution(evolution, targetName, chain);
      if (found) return found;
    }

    return null;
  }

  const preEvolution = findPreEvolution(chainData.chain, pokemonName);
  if (preEvolution) {
    evolutionData.evolves_from = getEvolutionDetails(preEvolution);
  }

  return evolutionData;
}

interface PokemonType {
  name: string;
}

interface PokemonSpeciesData {
  is_legendary: boolean;
  is_mythical: boolean;
  generation: string | null;
  evolution_chain?: {
    url: string;
  };
}

interface EvolutionDetail {
  id: number;
  name: string;
  trigger?: string;
  min_level?: number;
  item?: string;
  location?: string;
  condition?: string;
}

interface EvolutionData {
  evolves_from?: EvolutionDetail;
  evolves_to: EvolutionDetail[];
}

export interface ProcessedPokemonData {
  id: number;
  nationalDexId: number;
  name: string;
  types: PokemonType[];
  species: PokemonSpeciesData;
  evolution?: EvolutionData;
}

async function fetchPokemonData(): Promise<ProcessedPokemonData[]> {
  ConsoleFormatter.printHeader('Fetching Pokemon Data', 'Fetching Pokemon data from PokéAPI');
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

    // Generate lightweight Pokemon IDs file for service worker
    ConsoleFormatter.info('Generating Pokemon IDs for service worker...');
    const nationalDexIds = pokemonData
      .map(pokemon => pokemon.nationalDexId)
      .filter(id => id != null)
      .sort((a, b) => a - b);
    
    const uniqueIds = [...new Set(nationalDexIds)];
    const pokemonIdsPath = path.join(process.cwd(), 'public/pokemon-ids.json');
    await fs.writeFile(pokemonIdsPath, JSON.stringify(uniqueIds, null, 2));

    const fileStats = await fs.stat(outputPath);
    const pokemonIdsStats = await fs.stat(pokemonIdsPath);
    const duration = Date.now() - startTime;

    // Success summary
    ConsoleFormatter.printSummary('Pokemon Data Fetch Complete!', [
      { label: 'Pokemon data saved to', value: outputPath, color: 'cyan' },
      { label: 'Pokemon IDs saved to', value: pokemonIdsPath, color: 'cyan' },
      { label: 'Total Pokemon', value: pokemonData.length, color: 'green' },
      { label: 'Unique IDs extracted', value: uniqueIds.length, color: 'green' },
      { label: 'Main file size', value: ConsoleFormatter.formatFileSize(fileStats.size), color: 'cyan' },
      { label: 'IDs file size', value: ConsoleFormatter.formatFileSize(pokemonIdsStats.size), color: 'cyan' },
      { label: 'Duration', value: ConsoleFormatter.formatDuration(duration), color: 'yellow' }
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
    const results: ProcessedPokemonData[] = [];

    for (let index = 0; index < batchEntries.length; index++) {
      const item = batchEntries[index];
      const pokemon = pokemonResults[index];
      const species = speciesResults[index];

      if (!pokemon || !species) {
        throw new Error(`Missing data for "${item.entry.name}" (API name: ${item.normalizedName}) (ID ${item.entry.id})`);
      }

      // Fetch evolution data if available
      let evolutionData: EvolutionData | undefined;
      if (species.evolution_chain?.url) {
        const chainId = parseInt(species.evolution_chain.url.split('/').slice(-2)[0]);
        const chainData = await fetchEvolutionChain(chainId);
        if (chainData) {
          evolutionData = extractEvolutionData(chainData, pokemon.species.name);
        }
      }

      results.push({
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
          evolution_chain: species.evolution_chain
        },
        evolution: evolutionData
      });
    }

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

          // Fetch evolution data if available
          let evolutionData: EvolutionData | undefined;
          if (species.evolution_chain?.url) {
            const chainId = parseInt(species.evolution_chain.url.split('/').slice(-2)[0]);
            const chainData = await fetchEvolutionChain(chainId);
            if (chainData) {
              evolutionData = extractEvolutionData(chainData, pokemon.species.name);
            }
          }

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
              evolution_chain: species.evolution_chain
            },
            evolution: evolutionData
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