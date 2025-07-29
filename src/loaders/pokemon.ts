import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { useQuery } from '@tanstack/react-query';
import pokemonApiService from '@/services/pokemonApiService';
import ms from 'ms';

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
export type PokemonOptionType = z.infer<typeof PokemonOptionSchema>;

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
const pokemonCache: Pokemon[] | null = null;

// Update the getPokemon function to use the API service
export async function getPokemon(): Promise<Pokemon[]> {
  try {
    return await pokemonApiService.getAllPokemon();
  } catch (error) {
    console.error('Failed to fetch Pokemon data:', error);
    throw new Error('Failed to load Pokemon data');
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

// Function to check if newPokemon is an evolution of currentPokemon
export async function isPokemonEvolution(
  currentPokemon: PokemonOptionType,
  newPokemon: PokemonOptionType
): Promise<boolean> {
  // If they're the same Pokemon, it's not an evolution
  if (currentPokemon.id === newPokemon.id) {
    return false;
  }

  try {
    // Check if newPokemon is an evolution of currentPokemon
    const evolutionIds = await getPokemonEvolutionIds(currentPokemon.id);
    return evolutionIds.includes(newPokemon.id);
  } catch (error) {
    console.error('Error checking evolution relationship:', error);
    return false;
  }
}

// Function to check if newPokemon is a pre-evolution of currentPokemon
export async function isPokemonPreEvolution(
  currentPokemon: PokemonOptionType,
  newPokemon: PokemonOptionType
): Promise<boolean> {
  // If they're the same Pokemon, it's not a pre-evolution
  if (currentPokemon.id === newPokemon.id) {
    return false;
  }

  try {
    // Check if newPokemon is a pre-evolution of currentPokemon
    const preEvolutionId = await getPokemonPreEvolutionId(currentPokemon.id);
    return preEvolutionId === newPokemon.id;
  } catch (error) {
    console.error('Error checking pre-evolution relationship:', error);
    return false;
  }
}

// Update searchPokemon to use the API service
export async function searchPokemon(
  query: string
): Promise<PokemonOptionType[]> {
  try {
    const pokemon = await pokemonApiService.searchPokemon(query, 50);

    return pokemon.map(p => ({
      id: p.id,
      name: p.name,
      nationalDexId: p.nationalDexId,
      uid: generatePokemonUID(),
    }));
  } catch (error) {
    console.error('Failed to search Pokemon:', error);
    return [];
  }
}

// Update getPokemonById to use the API service
export async function getPokemonById(id: number): Promise<Pokemon | null> {
  try {
    return await pokemonApiService.getPokemonById(id);
  } catch (error) {
    console.error(`Failed to fetch Pokemon with ID ${id}:`, error);
    return null;
  }
}

// Get Pokemon by name
export async function getPokemonByName(name: string): Promise<Pokemon | null> {
  const pokemon = await getPokemon();
  return pokemon.find(p => p.name.toLowerCase() === name.toLowerCase()) || null;
}

// Update getPokemonNamesByIds to use the API service
export async function getPokemonNamesByIds(ids: number[]): Promise<string[]> {
  try {
    const pokemon = await pokemonApiService.getPokemonByIds(ids);
    return pokemon.map(p => p.name);
  } catch (error) {
    console.error('Failed to fetch Pokemon names by IDs:', error);
    return [];
  }
}

// Update getPokemonNameMap to use the API service
export async function getPokemonNameMap(): Promise<Map<number, string>> {
  try {
    const pokemon = await pokemonApiService.getAllPokemon();
    return new Map(pokemon.map(p => [p.id, p.name]));
  } catch (error) {
    console.error('Failed to fetch Pokemon name map:', error);
    return new Map();
  }
}

// Update getPokemonByType to use the API service
export async function getPokemonByType(type: string): Promise<Pokemon[]> {
  try {
    return await pokemonApiService.getPokemonByType(type);
  } catch (error) {
    console.error(`Failed to fetch Pokemon by type ${type}:`, error);
    return [];
  }
}

// Update getAllPokemonTypes to use the API service
export async function getAllPokemonTypes(): Promise<string[]> {
  try {
    const pokemon = await pokemonApiService.getAllPokemon();
    const typeSet = new Set<string>();

    pokemon.forEach(p => {
      p.types.forEach(type => {
        typeSet.add(type.name);
      });
    });

    return Array.from(typeSet).sort();
  } catch (error) {
    console.error('Failed to fetch Pokemon types:', error);
    return [];
  }
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

// React Query hooks for Pokemon data
export function useAllPokemon() {
  return useQuery({
    queryKey: ['pokemon', 'all'],
    queryFn: () => pokemonApiService.getAllPokemon(),
    staleTime: ms('5m'), // Consider data fresh for 5 minutes
    gcTime: ms('10m'), // Keep in cache for 10 minutes
  });
}

export function usePokemonById(id: number) {
  return useQuery({
    queryKey: ['pokemon', 'byId', id],
    queryFn: () => pokemonApiService.getPokemonById(id),
    enabled: !!id,
    staleTime: ms('5m'),
    gcTime: ms('10m'),
  });
}

export function usePokemonNameMap() {
  return useQuery({
    queryKey: ['pokemon', 'nameMap'],
    queryFn: () =>
      pokemonApiService
        .getAllPokemon()
        .then(pokemon => new Map(pokemon.map(p => [p.id, p.name]))),
    staleTime: ms('5m'),
    gcTime: ms('10m'),
  });
}

export function usePokemonSearch(query: string) {
  return useQuery({
    queryKey: ['pokemon', 'search', query],
    queryFn: () =>
      pokemonApiService.searchPokemon(query, 50).then(pokemon =>
        pokemon.map(p => ({
          id: p.id,
          name: p.name,
          nationalDexId: p.nationalDexId,
          uid: generatePokemonUID(),
        }))
      ),
    enabled: !!query && query.length > 0,
    staleTime: ms('2m'),
    gcTime: ms('5m'),
  });
}

export function usePokemonByType(type: string) {
  return useQuery({
    queryKey: ['pokemon', 'byType', type],
    queryFn: () => pokemonApiService.getPokemonByType(type),
    enabled: !!type,
    staleTime: ms('5m'),
    gcTime: ms('10m'),
  });
}

export function usePokemonCount() {
  return useQuery({
    queryKey: ['pokemon', 'count'],
    queryFn: () => pokemonApiService.getPokemonCount(),
    staleTime: ms('10m'),
    gcTime: ms('30m'),
  });
}
