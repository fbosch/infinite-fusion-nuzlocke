import { useCallback, useMemo } from 'react';
import {
  type PokemonOptionType,
  type Pokemon,
  useAllPokemon,
  usePokemonNameMap,
} from '@/loaders/pokemon';
import { useLocationEncountersById } from '@/loaders/locations';
import { useGameMode } from '@/stores/playthroughs';

interface UseEncounterDataOptions {
  locationId?: string;
  enabled?: boolean;
}

export function useEncounterData({
  locationId,
  enabled = false,
}: UseEncounterDataOptions) {
  const gameMode = useGameMode();

  // Use the hook variant to fetch encounters
  const { pokemonIds, isLoading, error } = useLocationEncountersById(
    enabled ? locationId : undefined,
    gameMode as 'classic' | 'remix'
  );

  // Use existing hooks for Pokemon data and name map
  const { data: allPokemon = [] } = useAllPokemon();
  const nameMap = usePokemonNameMap();

  // Process encounter data using useMemo
  const routeEncounterData = useMemo((): PokemonOptionType[] => {
    if (
      !enabled ||
      gameMode === 'randomized' ||
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
  }, [pokemonIds, allPokemon, nameMap, gameMode, enabled, locationId]);

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
