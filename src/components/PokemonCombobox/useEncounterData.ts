import { useState, useCallback, useEffect } from 'react';
import { getPokemon, type PokemonOption } from '@/loaders/pokemon';
import { getEncountersByRouteId, getPokemonNameMap } from '@/loaders';
import { useGameMode } from '@/stores/playthroughs';

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
  const [routeEncounterData, setRouteEncounterData] = useState<PokemonOption[]>(
    []
  );
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
    if (!routeId || routeId === 0) {
      setRouteEncounterData([]);
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

      if (gameMode === 'randomized') {
        // For randomized mode, show ALL available Pokemon
        const allPokemonOptions: PokemonOption[] = allPokemon.map(pokemon => ({
          id: pokemon.id,
          name: nameMap.get(pokemon.id) || pokemon.name,
          nationalDexId: pokemon.nationalDexId,
          originalLocation: locationId,
        }));

        setRouteEncounterData(allPokemonOptions);
      } else {
        // For classic/remix modes, load route-specific encounters
        const encounter = await getEncountersByRouteId(routeId, gameMode);

        if (encounter) {
          const pokemonOptions: PokemonOption[] = encounter.pokemonIds.map(
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
    if (routeId !== undefined && routeId !== 0 && enabled) {
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
