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
    const dataPath = path.join(process.cwd(), 'data', 'pokemon-data.json');
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
 * Loads dex entries from the JSON file with caching
 */
export async function loadDexEntries(forceReload: boolean = false): Promise<DexEntry[]> {
  if (dexEntriesCache && !forceReload) {
    return dexEntriesCache;
  }

  try {
    const dataPath = path.join(process.cwd(), 'data', 'base-entries.json');
    const data = await fs.readFile(dataPath, 'utf8');
    const entries: DexEntry[] = JSON.parse(data);

    // Validate data structure
    if (!Array.isArray(entries)) {
      throw new Error('Dex entries file does not contain an array');
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
    throw new Error(`Error loading dex entries: ${message}`);
  }
}

/**
 * Checks if data files exist
 */
export async function checkDataFiles(): Promise<{
  pokemonData: boolean;
  dexEntries: boolean;
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
    pokemonData: await checkFile('pokemon-data.json'),
    dexEntries: await checkFile('base-entries.json'),
    classicEncounters: await checkFile('route-encounters-classic.json'),
    remixEncounters: await checkFile('route-encounters-remix.json'),
    locations: await checkFile('locations.json')
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