import { useState, useCallback, useEffect } from 'react';
import { getPokemon, type PokemonOptionType } from '@/loaders/pokemon';
import { getEncountersByRouteId, getPokemonNameMap } from '@/loaders';
import { useGameMode, useCustomLocations } from '@/stores/playthroughs';

interface UseEncounterDataOptions {
  routeId?: number;
  locationId?: string;
  enabled?: boolean;
}

export function useEncounterData({
  routeId,
  locationId,
  enabled = false,
}: UseEncounterDataOptions) {
  const [routeEncounterData, setRouteEncounterData] = useState<
    PokemonOptionType[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const gameMode = useGameMode();
  const customLocations = useCustomLocations();

  // Check if this is a custom location by looking in the customLocations array
  const isCustomLocationFlag = useCallback(() => {
    if (!locationId) return false;

    return customLocations.some(customLoc => customLoc.id === locationId);
  }, [locationId, customLocations]);

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
    if (!routeId && routeId !== 0) {
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
      const encounter = await getEncountersByRouteId(routeId, gameMode);
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
      console.error(`Error loading encounter data for route ${routeId}:`, err);
      setError(
        err instanceof Error ? err : new Error('Failed to load encounter data')
      );
      setRouteEncounterData([]);
    } finally {
      setIsLoading(false);
    }
  }, [routeId, gameMode, locationId]);

  // Load route data when dependencies change
  useEffect(() => {
    if (routeId !== undefined && enabled) {
      loadRouteEncounterData();
    }
  }, [gameMode, loadRouteEncounterData, routeId, enabled]);

  return {
    routeEncounterData,
    isLoading,
    error,
    isRoutePokemon,
    loadRouteEncounterData,
  };
}
