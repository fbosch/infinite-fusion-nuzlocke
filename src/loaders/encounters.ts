import { z } from 'zod';
import { useCallback, useMemo } from 'react';
import { getStarterPokemonByGameMode } from './starters';
import type { PokemonOptionType, Pokemon } from './pokemon';
import { useAllPokemon, usePokemonNameMap } from './pokemon';
import { encountersData } from '@/lib/queryClient';
import { useLocationEncountersById } from './locations';

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
    z.number().int().refine(
      (val) => val > 0 || val === -1,
      { error: 'Pokemon ID must be positive or -1 for egg locations' }
    )
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

// Hook to get processed encounter data for a location
interface UseEncounterDataOptions {
  locationId?: string;
  enabled?: boolean;
  gameMode?: 'classic' | 'remix';
}

export function useEncountersForLocation({
  locationId,
  enabled = false,
  gameMode = 'classic',
}: UseEncounterDataOptions) {
  // Use the hook variant to fetch encounters
  const { pokemonIds, isLoading, error } = useLocationEncountersById(
    enabled ? locationId : undefined,
    gameMode
  );

  // Use existing hooks for Pokemon data and name map
  const { data: allPokemon = [] } = useAllPokemon();
  const nameMap = usePokemonNameMap();

  // Process encounter data using useMemo
  const routeEncounterData = useMemo((): PokemonOptionType[] => {
    if (
      !enabled ||
      !pokemonIds.length ||
      !allPokemon.length
    ) {
      return [];
    }

    return pokemonIds.map((id: number) => {
      const pokemon = allPokemon.find((p: Pokemon) => p.id === id);
      return {
        id,
        name: nameMap.get(id) || `Unknown Pokemon (${id})`,
        nationalDexId: pokemon?.nationalDexId || 0,
        originalLocation: locationId,
      };
    });
  }, [pokemonIds, allPokemon, nameMap, enabled, locationId]);

  // Predicate function to check if a Pokemon is in the current route
  const isRoutePokemon = useCallback(
    (pokemonId: number): boolean => {
      const routePokemonIds = new Set(
        routeEncounterData.map(pokemon => pokemon.id)
      );
      return routePokemonIds.has(pokemonId);
    },
    [routeEncounterData]
  );

  return {
    routeEncounterData,
    isLoading,
    error,
    isRoutePokemon,
  };
}
