/**
 * Data Loading Utilities
 * 
 * Functions for loading and caching Pokemon data from JSON files.
 * These utilities provide a clean interface for data access across scripts.
 */

import fs from 'fs/promises';
import path from 'path';
import type { ProcessedPokemonData } from '../fetch-pokemon-data';
import { buildPokemonNameMap, type PokemonNameMap } from './pokemon-name-utils';

export interface DexEntry {
  id: number;
  name: string;
  headNamePart?: string;
  bodyNamePart?: string;
}

/**
 * Converts ProcessedPokemonData to DexEntry format for backwards compatibility
 */
export function pokemonDataToDexEntry(pokemon: ProcessedPokemonData): DexEntry {
  return {
    id: pokemon.id,
    name: pokemon.name,
    headNamePart: pokemon.headNamePart,
    bodyNamePart: pokemon.bodyNamePart
  };
}

// Cache for loaded data to avoid repeated file reads
let pokemonDataCache: ProcessedPokemonData[] | null = null;
let pokemonNameMapCache: PokemonNameMap | null = null;
let dexEntriesCache: DexEntry[] | null = null;

/**
 * Loads Pokemon data from the JSON file with caching
 */
export async function loadPokemonData(forceReload: boolean = false): Promise<ProcessedPokemonData[]> {
  if (pokemonDataCache && !forceReload) {
    return pokemonDataCache;
  }

  try {
    const dataPath = path.join(process.cwd(), 'data', 'shared', 'pokemon-data.json');
    const data = await fs.readFile(dataPath, 'utf8');
    const pokemonArray: ProcessedPokemonData[] = JSON.parse(data);

    // Validate data structure
    if (!Array.isArray(pokemonArray)) {
      throw new Error('Pokemon data file does not contain an array');
    }

    for (const pokemon of pokemonArray) {
      if (!pokemon.id || !pokemon.name) {
        throw new Error(`Invalid Pokemon data entry: missing id or name - ${JSON.stringify(pokemon)}`);
      }
    }

    pokemonDataCache = pokemonArray;
    return pokemonArray;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Error loading Pokemon data: ${message}`);
  }
}

/**
 * Loads and builds Pokemon name map with caching
 */
export async function loadPokemonNameMap(forceReload: boolean = false): Promise<PokemonNameMap> {
  if (pokemonNameMapCache && !forceReload) {
    return pokemonNameMapCache;
  }

  const pokemonData = await loadPokemonData(forceReload);
  const nameMap = buildPokemonNameMap(pokemonData);

  pokemonNameMapCache = nameMap;
  return nameMap;
}

/**
 * Loads dex entries derived from Pokemon data with caching
 * This replaces the old base-entries.json approach
 */
export async function loadDexEntries(forceReload: boolean = false): Promise<DexEntry[]> {
  if (dexEntriesCache && !forceReload) {
    return dexEntriesCache;
  }

  try {
    // Load Pokemon data and convert to DexEntry format
    const pokemonData = await loadPokemonData(forceReload);
    const entries: DexEntry[] = pokemonData.map(pokemonDataToDexEntry);

    // Validate data structure
    if (!Array.isArray(entries)) {
      throw new Error('Pokemon data could not be converted to dex entries');
    }

    for (const entry of entries) {
      if (!entry.id || !entry.name) {
        throw new Error(`Invalid dex entry: missing id or name - ${JSON.stringify(entry)}`);
      }
    }

    dexEntriesCache = entries;
    return entries;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Error loading dex entries from Pokemon data: ${message}`);
  }
}

/**
 * Checks if data files exist
 */
export async function checkDataFiles(): Promise<{
  pokemonData: boolean;
  classicEncounters: boolean;
  remixEncounters: boolean;
  locations: boolean;
}> {
  const dataDir = path.join(process.cwd(), 'data');

  const checkFile = async (filename: string): Promise<boolean> => {
    try {
      await fs.access(path.join(dataDir, filename));
      return true;
    } catch {
      return false;
    }
  };

  return {
    pokemonData: await checkFile('shared/pokemon-data.json'),
    classicEncounters: await checkFile('classic/encounters.json'),
    remixEncounters: await checkFile('remix/encounters.json'),
    locations: await checkFile('shared/locations.json'),
  };
}

/**
 * Clears all cached data (useful for testing)
 */
export function clearDataCache(): void {
  pokemonDataCache = null;
  pokemonNameMapCache = null;
  dexEntriesCache = null;
}

/**
 * Gets cache status for debugging
 */
export function getCacheStatus(): {
  pokemonData: boolean;
  pokemonNameMap: boolean;
  dexEntries: boolean;
} {
  return {
    pokemonData: pokemonDataCache !== null,
    pokemonNameMap: pokemonNameMapCache !== null,
    dexEntries: dexEntriesCache !== null
  };
} 