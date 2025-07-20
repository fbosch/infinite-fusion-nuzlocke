import { z } from 'zod';
import Fuse from 'fuse.js';
import type { IFuseOptions } from 'fuse.js';

// Status enum for Pokemon tracking
export const PokemonStatus = {
  CAPTURED: 'captured',
  RECEIVED: 'received',
  TRADED: 'traded',
  MISSED: 'missed',
  STORED: 'stored',
  DECEASED: 'deceased',
} as const;

// Pokemon status conditions (battle status effects)
export const PokemonStatusConditions = {
  HEALTHY: 'healthy',
  PARALYZED: 'paralyzed',
  FROZEN: 'frozen',
  BURNED: 'burned',
  POISONED: 'poisoned',
  ASLEEP: 'asleep',
  FAINTED: 'fainted',
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

// Shared Fuse instance for name-only fuzzy search (faster)
let pokemonFuseInstance: Fuse<PokemonOption> | null = null;

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

// Get shared Fuse instance for name-only fuzzy search (faster)
export async function getPokemonFuseInstance(
  originalRouteId?: number
): Promise<Fuse<PokemonOption>> {
  if (pokemonFuseInstance) {
    return pokemonFuseInstance;
  }

  const pokemon = await getPokemon();
  const pokemonOptions: PokemonOption[] = pokemon.map(p => ({
    id: p.id,
    name: p.name,
    nationalDexId: p.nationalDexId,
    originalRouteId: originalRouteId,
  }));

  const fuseOptions: IFuseOptions<PokemonOption> = {
    keys: ['name'], // Only search by name for better performance
    threshold: 0.3, // Lower threshold = more strict matching
    distance: 100, // Allow for more distance between matched characters
    includeScore: true, // Include match scores for sorting
    minMatchCharLength: 2, // Minimum characters that must match
    shouldSort: true, // Sort by relevance
    findAllMatches: true, // Find all matches, not just the first
  };

  pokemonFuseInstance = new Fuse(pokemonOptions, fuseOptions);
  return pokemonFuseInstance;
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

// Smart search function that handles both name and ID searches
export async function searchPokemon(query: string): Promise<PokemonOption[]> {
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
    // Fuzzy search for names
    const fuse = await getPokemonFuseInstance();
    const searchResults = fuse.search(query);
    const results = searchResults.map(result => result.item);
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
