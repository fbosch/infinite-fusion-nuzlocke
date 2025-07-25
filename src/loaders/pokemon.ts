import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
  initializeSearchWorker,
  searchPokemonInWorker,
} from '@/services/searchWorkerService';

// Utility function to generate unique identifiers
export function generatePokemonUID(): string {
  return uuidv4();
}

// Status enum for Pokemon tracking
export const PokemonStatus = {
  CAPTURED: 'captured',
  RECEIVED: 'received',
  TRADED: 'traded',
  MISSED: 'missed',
  STORED: 'stored',
  DECEASED: 'deceased',
} as const;

export type PokemonStatusType =
  (typeof PokemonStatus)[keyof typeof PokemonStatus];

// Zod schema for Pokemon status
export const PokemonStatusSchema = z.enum(
  [
    PokemonStatus.CAPTURED,
    PokemonStatus.RECEIVED,
    PokemonStatus.TRADED,
    PokemonStatus.MISSED,
    PokemonStatus.STORED,
    PokemonStatus.DECEASED,
  ],
  { error: 'Invalid Pokemon status' }
);

// Zod schema for Pokemon option (search results)
export const PokemonOptionSchema = z.object({
  id: z.number().int().positive({ error: 'Pokemon ID must be positive' }),
  name: z.string().min(1, { error: 'Pokemon name is required' }),
  nationalDexId: z
    .number()
    .int()
    .positive({ error: 'National Dex ID must be positive' }),
  nickname: z.string().optional(),
  originalLocation: z.string().optional(),
  status: PokemonStatusSchema.optional(),
  uid: z.string().optional(), // Unique identifier for React reconciliation
});

// Pokemon option type for search results (inferred from schema)
export type PokemonOption = z.infer<typeof PokemonOptionSchema>;

// Zod schema for Pokemon type
export const PokemonTypeSchema = z.object({
  name: z.string().min(1, { error: 'Type name is required' }),
});

// Zod schema for Pokemon species
export const PokemonSpeciesSchema = z.object({
  is_legendary: z.boolean(),
  is_mythical: z.boolean(),
  generation: z.string().nullable(),
  evolution_chain: z
    .object({
      url: z.string().url({ error: 'Invalid evolution chain URL' }),
    })
    .nullable(),
});

// Zod schema for evolution detail
export const EvolutionDetailSchema = z.object({
  id: z.number().int().positive({ error: 'Evolution ID must be positive' }),
  name: z.string().min(1, { error: 'Evolution name is required' }),
  min_level: z.number().int().positive().optional(),
  trigger: z.string().optional(),
  item: z.string().optional(),
  location: z.string().optional(),
  condition: z.string().optional(),
});

// Zod schema for evolution data
export const EvolutionDataSchema = z.object({
  evolves_to: z.array(EvolutionDetailSchema),
  evolves_from: EvolutionDetailSchema.optional(),
});

// Zod schema for Pokemon data
export const PokemonSchema = z.object({
  id: z.number().int().positive({ error: 'Pokemon ID must be positive' }),
  nationalDexId: z
    .number()
    .int()
    .positive({ error: 'National Dex ID must be positive' }),
  name: z.string().min(1, { error: 'Pokemon name is required' }),
  types: z.array(PokemonTypeSchema),
  species: PokemonSpeciesSchema,
  evolution: EvolutionDataSchema.optional(),
});

export type Pokemon = z.infer<typeof PokemonSchema>;
export type PokemonType = z.infer<typeof PokemonTypeSchema>;
export type PokemonSpecies = z.infer<typeof PokemonSpeciesSchema>;
export type EvolutionDetail = z.infer<typeof EvolutionDetailSchema>;
export type EvolutionData = z.infer<typeof EvolutionDataSchema>;

export const PokemonArraySchema = z.array(PokemonSchema);

// Cache for loaded Pokemon data
let pokemonCache: Pokemon[] | null = null;

// Track if search worker has been initialized
let searchWorkerInitialized = false;
let searchWorkerInitPromise: Promise<void> | null = null;

// Data loader for Pokemon with dynamic import
export async function getPokemon(): Promise<Pokemon[]> {
  if (pokemonCache) {
    return pokemonCache;
  }

  try {
    const pokemonData = await import('@data/pokemon-data.json');
    const data = PokemonArraySchema.parse(pokemonData.default);
    pokemonCache = data;
    return data;
  } catch (error) {
    console.error('Failed to validate Pokemon data:', error);
    throw new Error('Invalid Pokemon data format');
  }
}

// Function to get evolution IDs for a specific Pokemon
export async function getPokemonEvolutionIds(
  pokemonId: number
): Promise<number[]> {
  const pokemon = await getPokemon();
  const targetPokemon = pokemon.find(p => p.id === pokemonId);

  if (!targetPokemon?.evolution?.evolves_to) {
    return [];
  }

  return targetPokemon.evolution.evolves_to.map(e => e.id);
}

// Function to get pre-evolution ID for a specific Pokemon
export async function getPokemonPreEvolutionId(
  pokemonId: number
): Promise<number | null> {
  const pokemon = await getPokemon();
  const targetPokemon = pokemon.find(p => p.id === pokemonId);

  if (!targetPokemon?.evolution?.evolves_from) {
    return null;
  }

  return targetPokemon.evolution.evolves_from.id;
}

// Initialize search worker with Pokemon data
async function initializePokemonSearchWorker(): Promise<void> {
  // Return existing promise if already initializing
  if (searchWorkerInitPromise) {
    return searchWorkerInitPromise;
  }

  // Return immediately if already initialized
  if (searchWorkerInitialized) {
    return Promise.resolve();
  }

  // Check if web workers are supported
  if (typeof Worker === 'undefined') {
    console.warn(
      'Web Workers not supported, falling back to main thread search'
    );
    return Promise.resolve();
  }

  searchWorkerInitPromise = (async () => {
    try {
      const pokemon = await getPokemon();

      // Transform data for worker
      const workerData = pokemon.map(p => ({
        id: p.id,
        name: p.name,
        nationalDexId: p.nationalDexId,
      }));

      await initializeSearchWorker(workerData);
      searchWorkerInitialized = true;
    } catch (error) {
      console.error('Failed to initialize search worker:', error);
      // Don't throw error, fall back to main thread search
    } finally {
      searchWorkerInitPromise = null;
    }
  })();

  return searchWorkerInitPromise;
}

// Smart search function that handles both name and ID searches
export async function searchPokemon(query: string): Promise<PokemonOption[]> {
  // Try to use web worker first if supported
  if (typeof Worker !== 'undefined') {
    try {
      // Initialize worker if not already done
      await initializePokemonSearchWorker();

      if (searchWorkerInitialized) {
        const results = await searchPokemonInWorker(query);

        // Transform worker results to PokemonOption format
        return results.map(result => ({
          id: result.id,
          name: result.name,
          nationalDexId: result.nationalDexId,
        }));
      }
    } catch (error) {
      console.warn(
        'Web worker search failed, falling back to main thread:',
        error
      );
    }
  }

  // Fallback to main thread search
  const pokemon = await getPokemon();

  // Check if query is a number (for ID searches)
  const isNumericQuery = /^\d+$/.test(query.trim());

  if (isNumericQuery) {
    // Exact search for IDs - much faster than fuzzy search
    const queryNum = parseInt(query, 10);
    const results = pokemon
      .filter(p => p.id === queryNum || p.nationalDexId === queryNum)
      .map(p => ({
        id: p.id,
        name: p.name,
        nationalDexId: p.nationalDexId,
      }));
    return results;
  } else {
    // Simple string search as fallback (when web worker is not available)
    const results = pokemon
      .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
      .map(p => ({
        id: p.id,
        name: p.name,
        nationalDexId: p.nationalDexId,
      }))
      .slice(0, 50); // Limit results to prevent performance issues
    return results;
  }
}

// Get Pokemon by ID
export async function getPokemonById(id: number): Promise<Pokemon | null> {
  const pokemon = await getPokemon();
  return pokemon.find(p => p.id === id) || null;
}

// Get Pokemon by name
export async function getPokemonByName(name: string): Promise<Pokemon | null> {
  const pokemon = await getPokemon();
  return pokemon.find(p => p.name.toLowerCase() === name.toLowerCase()) || null;
}

// Get Pokemon names by IDs
export async function getPokemonNamesByIds(ids: number[]): Promise<string[]> {
  const pokemon = await getPokemon();
  const pokemonMap = new Map(pokemon.map(p => [p.id, p.name]));

  return ids
    .map(id => pokemonMap.get(id))
    .filter((name): name is string => name !== undefined);
}

// Create a map of Pokemon ID to name for quick lookup
export async function getPokemonNameMap(): Promise<Map<number, string>> {
  const pokemon = await getPokemon();
  const nameMap = new Map<number, string>();

  pokemon.forEach(p => {
    nameMap.set(p.id, p.name);
  });

  return nameMap;
}

// Get Pokemon by type
export async function getPokemonByType(type: string): Promise<Pokemon[]> {
  const pokemon = await getPokemon();
  return pokemon.filter(p =>
    p.types.some(t => t.name.toLowerCase() === type.toLowerCase())
  );
}

// Get all Pokemon types
export async function getAllPokemonTypes(): Promise<string[]> {
  const pokemon = await getPokemon();
  const typeSet = new Set<string>();

  pokemon.forEach(p => {
    p.types.forEach(t => typeSet.add(t.name));
  });

  return Array.from(typeSet).sort();
}

// Get National Pokédex number from Infinite Fusion ID
export async function getNationalDexIdFromInfiniteFusionId(
  infiniteFusionId: number
): Promise<number | null> {
  const pokemon = await getPokemonById(infiniteFusionId);
  return pokemon?.nationalDexId || null;
}

// Get Infinite Fusion ID from National Pokédex number
export async function getInfiniteFusionIdFromNationalDexId(
  nationalDexId: number
): Promise<number | null> {
  const pokemon = await getPokemon();
  const found = pokemon.find(p => p.nationalDexId === nationalDexId);
  return found?.id || null;
}

// Get Pokemon by National Pokédex number
export async function getPokemonByNationalDexId(
  nationalDexId: number
): Promise<Pokemon | null> {
  const pokemon = await getPokemon();
  return pokemon.find(p => p.nationalDexId === nationalDexId) || null;
}

// Create a map of National Pokédex ID to Infinite Fusion ID for quick lookup
export async function getNationalDexToInfiniteFusionMap(): Promise<
  Map<number, number>
> {
  const pokemon = await getPokemon();
  const map = new Map<number, number>();

  pokemon.forEach(p => {
    map.set(p.nationalDexId, p.id);
  });

  return map;
}

// Create a map of Infinite Fusion ID to National Pokédex ID for quick lookup
export async function getInfiniteFusionToNationalDexMap(): Promise<
  Map<number, number>
> {
  const pokemon = await getPokemon();
  const map = new Map<number, number>();

  pokemon.forEach(p => {
    map.set(p.id, p.nationalDexId);
  });

  return map;
}
