import { z } from 'zod';
import pokemonData from '@data/pokemon-data.json';

// Zod schema for Pokemon type
export const PokemonTypeSchema = z.object({
  name: z.string().min(1, { error: "Type name is required" }),
});

// Zod schema for Pokemon species
export const PokemonSpeciesSchema = z.object({
  is_legendary: z.boolean(),
  is_mythical: z.boolean(),
  generation: z.string().nullable(),
  evolution_chain: z.object({
    url: z.string().url({ error: "Invalid evolution chain URL" }),
  }).nullable(),
});

// Zod schema for evolution detail
export const EvolutionDetailSchema = z.object({
  id: z.number().int().positive({ error: "Evolution ID must be positive" }),
  name: z.string().min(1, { error: "Evolution name is required" }),
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
  id: z.number().int().positive({ error: "Pokemon ID must be positive" }),
  nationalDexId: z.number().int().positive({ error: "National Dex ID must be positive" }),
  name: z.string().min(1, { error: "Pokemon name is required" }),
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

// Data loader for Pokemon
export function getPokemon(): Pokemon[] {
  try {
    return PokemonArraySchema.parse(pokemonData);
  } catch (error) {
    console.error('Failed to validate Pokemon data:', error);
    throw new Error('Invalid Pokemon data format');
  }
}

// Get Pokemon by ID
export function getPokemonById(id: number): Pokemon | null {
  const pokemon = getPokemon();
  return pokemon.find(p => p.id === id) || null;
}

// Get Pokemon by name
export function getPokemonByName(name: string): Pokemon | null {
  const pokemon = getPokemon();
  return pokemon.find(p => p.name.toLowerCase() === name.toLowerCase()) || null;
}

// Get Pokemon names by IDs
export function getPokemonNamesByIds(ids: number[]): string[] {
  const pokemon = getPokemon();
  const pokemonMap = new Map(pokemon.map(p => [p.id, p.name]));

  return ids
    .map(id => pokemonMap.get(id))
    .filter((name): name is string => name !== undefined);
}

// Create a map of Pokemon ID to name for quick lookup
export function getPokemonNameMap(): Map<number, string> {
  const pokemon = getPokemon();
  const nameMap = new Map<number, string>();

  pokemon.forEach(p => {
    nameMap.set(p.id, p.name);
  });

  return nameMap;
}

// Get Pokemon by type
export function getPokemonByType(type: string): Pokemon[] {
  const pokemon = getPokemon();
  return pokemon.filter(p =>
    p.types.some(t => t.name.toLowerCase() === type.toLowerCase())
  );
}

// Get all Pokemon types
export function getAllPokemonTypes(): string[] {
  const pokemon = getPokemon();
  const typeSet = new Set<string>();

  pokemon.forEach(p => {
    p.types.forEach(t => typeSet.add(t.name));
  });

  return Array.from(typeSet).sort();
} 