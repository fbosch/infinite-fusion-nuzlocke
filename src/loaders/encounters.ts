import { z } from 'zod';
import { getStarterPokemonByGameMode } from './starters';
import type { PokemonOptionType } from './pokemon';
import { encountersData } from '@/lib/queryClient';

/**
 * Type for encounter data with fusion status
 * Used to track Pokemon encounters and their fusion state
 */
export interface EncounterData {
  head: PokemonOptionType | null;
  body: PokemonOptionType | null;
  isFusion: boolean;
  artworkVariant?: string; // Alternative artwork variant for fusions (e.g., 'a', 'b', 'c')
}

// Zod schema for route encounter data
export const RouteEncounterSchema = z.object({
  routeName: z.string().min(1, { error: 'Route name is required' }),
  pokemonIds: z.array(
    z.number().int().positive({ error: 'Pokemon ID must be positive' })
  ),
});

export type RouteEncounter = z.infer<typeof RouteEncounterSchema>;

export const RouteEncountersArraySchema = z.array(RouteEncounterSchema);

// Data loaders for encounters using TanStack Query
export async function getClassicEncounters(): Promise<RouteEncounter[]> {
  try {
    return await encountersData.getAllEncounters('classic');
  } catch (error) {
    console.error('Failed to fetch classic encounters:', error);
    throw new Error('Failed to load classic encounters data');
  }
}

export async function getRemixEncounters(): Promise<RouteEncounter[]> {
  try {
    return await encountersData.getAllEncounters('remix');
  } catch (error) {
    console.error('Failed to fetch remix encounters:', error);
    throw new Error('Failed to load remix encounters data');
  }
}

// Get encounters by route name
export async function getEncountersByRouteName(
  routeName: string | null | undefined,
  gameMode: 'classic' | 'remix' = 'classic'
): Promise<RouteEncounter | null> {
  if (!routeName) {
    return null;
  }

  // Special case for starter location
  if (routeName === 'Starter') {
    return {
      routeName: 'Starter',
      pokemonIds: await getStarterPokemonByGameMode(gameMode),
    };
  }

  try {
    // Get all encounters for the game mode and find the specific route
    const encounters = await encountersData.getAllEncounters(gameMode);
    return (
      encounters.find(encounter => encounter.routeName === routeName) || null
    );
  } catch (error) {
    console.error(`Failed to fetch encounter for route '${routeName}':`, error);
    return null;
  }
}

// Get all encounters for a specific game mode
export async function getEncounters(
  gameMode: 'classic' | 'remix' = 'classic'
): Promise<RouteEncounter[]> {
  return gameMode === 'classic'
    ? await getClassicEncounters()
    : await getRemixEncounters();
}

// Create a map of routeName to encounter for quick lookup
export async function getEncountersMap(
  gameMode: 'classic' | 'remix' = 'classic'
): Promise<Map<string, RouteEncounter>> {
  const encounters = await getEncounters(gameMode);
  const encounterMap = new Map<string, RouteEncounter>();

  encounters.forEach(encounter => {
    encounterMap.set(encounter.routeName, encounter);
  });

  return encounterMap;
}

// Function to clear cache if needed (for testing or data updates)
export function clearEncountersCache(): void {
  // This will be handled by TanStack Query's cache invalidation
  // You can use queryClient.invalidateQueries(['encounters']) if needed
}
