import { z } from 'zod';

// Zod schema for starter Pokémon data
export const StarterPokemonSchema = z.object({
  classic: z.array(
    z.number().int().positive({ error: 'Pokemon ID must be positive' })
  ),
  remix: z.array(
    z.number().int().positive({ error: 'Pokemon ID must be positive' })
  ),
});

export type StarterPokemon = z.infer<typeof StarterPokemonSchema>;

// Cache for loaded data
let starterPokemonCache: StarterPokemon | null = null;

// Data loader for starter Pokémon
export async function getStarterPokemon(): Promise<StarterPokemon> {
  if (starterPokemonCache) {
    return starterPokemonCache;
  }

  try {
    const starterPokemonData = await import(
      '@data/shared/starter-pokemon.json'
    );
    const data = StarterPokemonSchema.parse(starterPokemonData.default);
    starterPokemonCache = data;
    return data;
  } catch (error) {
    console.error('Failed to validate starter Pokémon data:', error);
    throw new Error('Invalid starter Pokémon data format');
  }
}

// Get starter Pokémon for a specific game mode
export async function getStarterPokemonByGameMode(
  gameMode: 'classic' | 'remix'
): Promise<number[]> {
  const starters = await getStarterPokemon();
  return starters[gameMode];
}
