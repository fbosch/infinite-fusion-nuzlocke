import { useState, useCallback, useEffect } from 'react';
import { getPokemon, type PokemonOptionType } from '@/loaders/pokemon';
import { getEncountersByRouteName, getPokemonNameMap } from '@/loaders';
import { getLocationById } from '@/loaders/locations';
import { isStarterLocation } from '@/constants/special-locations';
import { useGameMode } from '@/stores/playthroughs';

interface UseEncounterDataOptions {
  routeName?: string;
  locationId?: string;
  enabled?: boolean;
}

export function useEncounterData({
  routeName,
  locationId,
  enabled = false,
}: UseEncounterDataOptions) {
  const [routeEncounterData, setRouteEncounterData] = useState<
    PokemonOptionType[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const gameMode = useGameMode();

  // Predicate function to check if a Pokemon is in the current route
  const isRoutePokemon = useCallback(
    (pokemonId: number): boolean => {
      // Create the Set inside the callback to avoid dependency changes
      const routePokemonIds = new Set(
        routeEncounterData.map(pokemon => pokemon.id)
      );
      return routePokemonIds.has(pokemonId);
    },
    [routeEncounterData]
  );

  // Async function to load route encounter data
  const loadRouteEncounterData = useCallback(async () => {
    // Determine the route name to use
    let targetRouteName = routeName;
    
    // If we have a locationId but no routeName, convert locationId to routeName
    if (!targetRouteName && locationId) {
      // Special case for starter location
      if (isStarterLocation(locationId)) {
        targetRouteName = 'Starter';
      } else {
        const location = getLocationById(locationId);
        if (location) {
          targetRouteName = location.name;
        }
      }
    }

    if (!targetRouteName) {
      setRouteEncounterData([]);
      return;
    }
    if (gameMode === 'randomized') {
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Load Pokemon data, name map, and encounter data in parallel
      const [allPokemon, nameMap] = await Promise.all([
        getPokemon(),
        getPokemonNameMap(),
      ]);
      const encounter = await getEncountersByRouteName(targetRouteName, gameMode);
      if (encounter) {
        const pokemonOptions: PokemonOptionType[] = encounter.pokemonIds.map(
          id => {
            const pokemon = allPokemon.find(p => p.id === id);
            return {
              id,
              name: nameMap.get(id) || `Unknown Pokemon (${id})`,
              nationalDexId: pokemon?.nationalDexId || 0,
              originalLocation: locationId,
            };
          }
        );

        setRouteEncounterData(pokemonOptions);
      } else {
        setRouteEncounterData([]);
      }
    } catch (err) {
      console.error(`Error loading encounter data for route ${targetRouteName}:`, err);
      setError(
        err instanceof Error ? err : new Error('Failed to load encounter data')
      );
      setRouteEncounterData([]);
    } finally {
      setIsLoading(false);
    }
  }, [routeName, locationId, gameMode]);

  // Load route data when dependencies change
  useEffect(() => {
    if ((routeName !== undefined || locationId !== undefined) && enabled) {
      loadRouteEncounterData();
    }
  }, [gameMode, loadRouteEncounterData, routeName, locationId, enabled]);

  return {
    routeEncounterData,
    isLoading,
    error,
    isRoutePokemon,
    loadRouteEncounterData,
  };
}
