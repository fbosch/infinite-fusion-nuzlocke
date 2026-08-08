#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import type * as cliProgress from "cli-progress";
import Pokedex from "pokedex-promise-v2";
import type PokeAPI from "pokedex-promise-v2";
import type { DexEntry } from "./scrape-pokedex";
import { ConsoleFormatter } from "./utils/console-utils";
import {
  createProcessedPokemonData,
  type EvolutionData,
  type EvolutionDetail,
  type PokemonSpeciesApiData,
  type ProcessedPokemonData,
} from "./utils/pokemon-data-utils";

export type { ProcessedPokemonData } from "./utils/pokemon-data-utils";

// Optimized configuration for pokedex-promise-v2
const P = new Pokedex({
  cacheLimit: 24 * 60 * 60 * 1000, // 24 hours cache
  timeout: 30 * 1000, // 30 second timeout
});

const FEMALE_SYMBOL_PATTERN = /♀/g;
const MALE_SYMBOL_PATTERN = /♂/g;
const PERIOD_PATTERN = /\./g;
const APOSTROPHE_PATTERN = /'/g;
const WHITESPACE_PATTERN = /\s+/g;
const ACCENTED_E_PATTERN = /é/g;
const POKEMON_NAME_REPLACEMENTS = [
  [/^aegislash.*$/i, "aegislash-shield"],
  [/^oricorio.*$/i, "oricorio-baile"],
  [/^deoxys.*$/i, "deoxys-normal"],
  [/^gourgeist.*$/i, "gourgeist-average"],
  [/^pumpkaboo.*$/i, "pumpkaboo-average"],
  [/^castform.*$/i, "castform"],
  [/^mimikyu.*$/i, "mimikyu-disguised"],
  [/^giratina.*$/i, "giratina-altered"],
  [/^minior.*$/i, "minior-red-meteor"],
  [/^meloetta.*$/i, "meloetta-aria"],
  [/^lycanroc.*$/i, "lycanroc-midday"],
  [/^necrozma.*$/i, "necrozma"],
] as const;

// Cache for evolution chains to avoid duplicate API calls
const evolutionChainCache = new Map<number, PokeAPI.EvolutionChain>();

async function fetchEvolutionChain(
  chainId: number,
): Promise<PokeAPI.EvolutionChain | null> {
  if (evolutionChainCache.has(chainId)) {
    return evolutionChainCache.get(chainId) ?? null;
  }

  try {
    const chainData = await P.getEvolutionChainById(chainId);
    evolutionChainCache.set(chainId, chainData);
    return chainData;
  } catch (error) {
    ConsoleFormatter.warn(
      `Failed to fetch evolution chain ${chainId}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return null;
  }
}

function extractEvolutionData(
  chainData: PokeAPI.EvolutionChain,
  pokemonName: string,
): EvolutionData | undefined {
  if (!chainData?.chain) {
    return;
  }

  const evolutionData: EvolutionData = {
    evolves_to: [],
  };

  // Helper function to find Pokemon in evolution chain
  function findPokemonInChain(
    chain: PokeAPI.Chain,
    targetName: string,
  ): PokeAPI.Chain | null {
    if (chain.species.name === targetName) {
      return chain;
    }

    for (const evolution of chain.evolves_to) {
      const found = findPokemonInChain(evolution, targetName);
      if (found) {
        return found;
      }
    }

    return null;
  }

  function getEvolutionCondition(
    detail: PokeAPI.EvolutionDetail,
  ): string | undefined {
    if (detail.held_item) {
      return `Holding ${detail.held_item.name}`;
    }
    if (detail.known_move_type) {
      return `Knows ${detail.known_move_type.name} move`;
    }
    if (detail.time_of_day) {
      return `Time: ${detail.time_of_day}`;
    }
    if (detail.min_affection) {
      return `Affection: ${detail.min_affection}`;
    }
    if (detail.min_happiness) {
      return `Happiness: ${detail.min_happiness}`;
    }
  }

  function addEvolutionDetails(
    details: EvolutionDetail,
    detail: PokeAPI.EvolutionDetail,
  ): void {
    if (detail.min_level) {
      details.min_level = detail.min_level;
    }
    if (detail.item) {
      details.item = detail.item.name;
    }
    if (detail.location) {
      details.location = detail.location.name;
    }
    if (detail.trigger) {
      details.trigger = detail.trigger.name;
    }

    const condition = getEvolutionCondition(detail);
    if (condition) {
      details.condition = condition;
    }
  }

  // Helper function to get evolution details
  function getEvolutionDetails(evolution: PokeAPI.Chain): EvolutionDetail {
    const speciesId = evolution.species.url.split("/").at(-2);
    if (speciesId === undefined) {
      throw new Error(`Invalid evolution species URL: ${evolution.species.url}`);
    }

    const details: EvolutionDetail = {
      id: Number.parseInt(speciesId, 10),
      name: evolution.species.name,
    };
    const detail = evolution.evolution_details?.[0];
    if (detail) {
      addEvolutionDetails(details, detail);
    }
    return details;
  }

  // Find the Pokemon in the chain
  const pokemonInChain = findPokemonInChain(chainData.chain, pokemonName);
  if (!pokemonInChain) {
    return;
  }

  // Get evolutions from this Pokemon
  for (const evolution of pokemonInChain.evolves_to) {
    evolutionData.evolves_to.push(getEvolutionDetails(evolution));
  }

  // Find what this Pokemon evolves from
  function findPreEvolution(
    chain: PokeAPI.Chain,
    targetName: string,
    parent: PokeAPI.Chain | null = null,
  ): PokeAPI.Chain | null {
    if (chain.species.name === targetName) {
      return parent;
    }

    for (const evolution of chain.evolves_to) {
      const found = findPreEvolution(evolution, targetName, chain);
      if (found) {
        return found;
      }
    }

    return null;
  }

  const preEvolution = findPreEvolution(chainData.chain, pokemonName);
  if (preEvolution) {
    evolutionData.evolves_from = getEvolutionDetails(preEvolution);
  }

  return evolutionData;
}

async function loadEvolutionData(
  species: PokemonSpeciesApiData,
  pokemonName: string,
): Promise<EvolutionData | undefined> {
  if (!species.evolution_chain?.url) {
    return;
  }

  const chainIdValue = species.evolution_chain.url.split("/").at(-2);
  if (chainIdValue === undefined) {
    throw new Error(
      `Invalid evolution chain URL: ${species.evolution_chain.url}`,
    );
  }

  const chainId = Number.parseInt(chainIdValue, 10);
  const chainData = await fetchEvolutionChain(chainId);
  return chainData ? extractEvolutionData(chainData, pokemonName) : undefined;
}

async function fetchPokemonData(): Promise<ProcessedPokemonData[]> {
  ConsoleFormatter.printHeader(
    "Fetching Pokemon Data",
    "Fetching Pokemon data from PokéAPI",
  );
  const startTime = Date.now();

  try {
    ConsoleFormatter.info("Loading Pokemon entries...");

    // Read the pokemon entries with custom IDs and names
    const pokemonEntriesPath = path.join(
      process.cwd(),
      "data/shared/base-entries.json",
    );
    const pokemonEntriesData = await fs.readFile(pokemonEntriesPath, "utf8");
    const pokemonEntries: DexEntry[] = JSON.parse(pokemonEntriesData);

    ConsoleFormatter.success(
      `Found ${pokemonEntries.length} Pokemon entries to fetch data for`,
    );

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

    ConsoleFormatter.working(
      `Processing ${batches.length} batches (${batchSize} Pokemon each, ${maxConcurrentBatches} concurrent batches)`,
    );

    // Create main progress bar
    const mainProgressBar = ConsoleFormatter.createProgressBar(
      pokemonEntries.length,
    );

    let totalProcessed = 0;

    // Process batches with controlled concurrency
    async function processBatchGroups(batchIndex = 0): Promise<void> {
      if (batchIndex >= batches.length) {
        return;
      }

      const currentBatches = batches.slice(
        batchIndex,
        batchIndex + maxConcurrentBatches,
      );

      // Process multiple batches concurrently
      const batchPromises = currentBatches.map((batch, localIndex) =>
        processBatch(
          batch,
          batchIndex + localIndex + 1,
          batches.length,
          mainProgressBar,
          totalProcessed,
        ),
      );

      const batchResults = await Promise.all(batchPromises);

      // Flatten and add results
      for (const batchResult of batchResults) {
        pokemonData.push(...batchResult);
        totalProcessed += batchResult.length;
      }

      mainProgressBar.update(totalProcessed, {
        status: `Processed ${totalProcessed}/${pokemonEntries.length} Pokemon`,
      });

      // Delay only between batch groups, not individual batches
      if (batchIndex + maxConcurrentBatches < batches.length) {
        mainProgressBar.update(totalProcessed, {
          status: "Pausing between batch groups...",
        });
        await new Promise((resolve) =>
          setTimeout(resolve, delayBetweenBatches),
        );
      }

      await processBatchGroups(batchIndex + maxConcurrentBatches);
    }

    await processBatchGroups();

    mainProgressBar.update(totalProcessed, { status: "Complete!" });
    mainProgressBar.stop();

    ConsoleFormatter.success(
      `Successfully fetched data for ${pokemonData.length} Pokemon`,
    );

    // Sort by custom ID to maintain Infinite Fusion order
    pokemonData.sort((a, b) => a.id - b.id);

    // Write to JSON file
    ConsoleFormatter.info("Saving data to file...");
    const outputPath = path.join(
      process.cwd(),
      "data/shared/pokemon-data.json",
    );

    // Ensure the shared directory exists
    const sharedDir = path.dirname(outputPath);
    await fs.mkdir(sharedDir, { recursive: true });

    await fs.writeFile(outputPath, JSON.stringify(pokemonData, null, 2));

    const fileStats = await fs.stat(outputPath);
    const duration = Date.now() - startTime;

    // Success summary
    ConsoleFormatter.printSummary("Pokemon Data Fetch Complete!", [
      { color: "cyan", label: "Pokemon data saved to", value: outputPath },
      { color: "green", label: "Total Pokemon", value: pokemonData.length },
      {
        color: "cyan",
        label: "File size",
        value: ConsoleFormatter.formatFileSize(fileStats.size),
      },
      {
        color: "yellow",
        label: "Duration",
        value: ConsoleFormatter.formatDuration(duration),
      },
    ]);

    return pokemonData;
  } catch (error) {
    ConsoleFormatter.error(
      `Error fetching Pokemon data: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    process.exit(1);
  }
}

async function processBatch(
  batch: DexEntry[],
  batchNumber: number,
  totalBatches: number,
  mainProgressBar: cliProgress.SingleBar,
  currentTotal: number,
): Promise<ProcessedPokemonData[]> {
  // Prepare normalized names for batch API call
  const batchEntries = batch.map((entry) => {
    const normalizedName = POKEMON_NAME_REPLACEMENTS.reduce(
      (name, [pattern, replacement]) => name.replace(pattern, replacement),
      entry.name
        .toLowerCase()
        .replace(FEMALE_SYMBOL_PATTERN, "-f")
        .replace(MALE_SYMBOL_PATTERN, "-m")
        .replace(PERIOD_PATTERN, "")
        .replace(APOSTROPHE_PATTERN, "")
        .replace(WHITESPACE_PATTERN, "-")
        .replace(ACCENTED_E_PATTERN, "e"),
    );

    return { entry, normalizedName };
  });

  const normalizedNames = batchEntries.map((item) => item.normalizedName);
  const [firstEntry] = batch;
  const lastEntry = batch.at(-1);
  if (firstEntry === undefined || lastEntry === undefined) {
    throw new Error("Cannot process an empty Pokemon batch");
  }

  try {
    // Update main progress bar with current batch info
    mainProgressBar.update(currentTotal, {
      status: `Batch ${batchNumber}/${totalBatches}: ${firstEntry.name} - ${lastEntry.name}`,
    });

    // First get Pokemon data, then use those results to get species data
    const pokemonResults = await P.getPokemonByName(normalizedNames);
    const pokemonIds = pokemonResults.map((pokemon) => pokemon.id);
    const speciesResults = await P.getPokemonSpeciesByName(pokemonIds);

    // Process results
    const results: ProcessedPokemonData[] = [];

    async function processEntries(index = 0): Promise<void> {
      if (index >= batchEntries.length) {
        return;
      }

      const item = batchEntries[index];
      const pokemon = pokemonResults[index];
      const species = speciesResults[index];

      if (!(pokemon && species)) {
        throw new Error(
          `Missing data for "${item.entry.name}" (API name: ${item.normalizedName}) (ID ${item.entry.id})`,
        );
      }

      const evolutionData = await loadEvolutionData(
        species,
        pokemon.species.name,
      );
      results.push(
        createProcessedPokemonData(item.entry, pokemon, species, evolutionData),
      );

      await processEntries(index + 1);
    }

    await processEntries();

    return results;
  } catch {
    // Update progress bar to show fallback mode
    mainProgressBar.update(currentTotal, {
      status: `Batch ${batchNumber}/${totalBatches}: Fallback mode (individual calls)`,
    });

    // Fallback to individual calls with controlled concurrency
    const individualResults: (ProcessedPokemonData | null)[] = [];
    const concurrencyLimit = 10;

    // Create a mini progress bar for the fallback batch
    const batchProgressBar = ConsoleFormatter.createMiniProgressBar(
      batchEntries.length,
      "Starting individual calls...",
    );

    async function processChunks(i = 0): Promise<void> {
      if (i >= batchEntries.length) {
        return;
      }

      const chunk = batchEntries.slice(i, i + concurrencyLimit);

      const chunkPromises = chunk.map(
        async (item, chunkIndex): Promise<ProcessedPokemonData | null> => {
          try {
            const pokemon = await P.getPokemonByName(item.normalizedName);
            const species = await P.getPokemonSpeciesByName(pokemon.id);

            batchProgressBar.update(i + chunkIndex + 1, {
              status: `Fetched ${item.entry.name}`,
            });

            const evolutionData = await loadEvolutionData(
              species,
              pokemon.species.name,
            );
            return createProcessedPokemonData(
              item.entry,
              pokemon,
              species,
              evolutionData,
            );
          } catch {
            batchProgressBar.update(i + chunkIndex + 1, {
              status: `Failed: ${item.entry.name}`,
            });
            return null;
          }
        },
      );

      const chunkResults = await Promise.all(chunkPromises);
      individualResults.push(...chunkResults);

      // Update batch progress
      batchProgressBar.update(
        Math.min(i + concurrencyLimit, batchEntries.length),
        {
          status: `Processing chunk ${Math.floor(i / concurrencyLimit) + 1}...`,
        },
      );

      // Small delay between chunks in fallback mode
      if (i + concurrencyLimit < batchEntries.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      await processChunks(i + concurrencyLimit);
    }

    await processChunks();

    batchProgressBar.update(batchEntries.length, { status: "Complete!" });
    batchProgressBar.stop();

    const validResults = individualResults.filter(
      (result): result is ProcessedPokemonData => result !== null,
    );
    return validResults;
  }
}

// Run the fetcher
fetchPokemonData();
