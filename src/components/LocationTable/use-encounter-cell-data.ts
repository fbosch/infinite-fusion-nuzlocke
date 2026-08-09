import { useCallback } from "react";
import { useEncountersForLocation } from "@/loaders/encounters";
import {
  useCustomLocations,
  useEncounter,
  useGameMode,
} from "@/stores/playthroughs/hooks";
import type { EncounterSource } from "@/types/encounters";

const EMPTY_ENCOUNTER = {
  body: null,
  head: null,
  isFusion: false,
  updatedAt: 0,
};

export function useEncounterCellData(locationId: string, shouldLoad: boolean) {
  const encounterData = useEncounter(locationId) || EMPTY_ENCOUNTER;
  const gameMode = useGameMode();
  const customLocations = useCustomLocations();
  const isCustomLocation = customLocations.some(
    (location) => location.id === locationId,
  );
  const { routeEncounterData, isLoading: isRouteEncounterDataLoading } =
    useEncountersForLocation({
      enabled: shouldLoad && !isCustomLocation && gameMode !== "randomized",
      gameMode: gameMode === "randomized" ? "classic" : gameMode,
      locationId,
    });
  const getPokemonSource = useCallback(
    (pokemonId: number): EncounterSource | null =>
      routeEncounterData.find((pokemon) => pokemon.id === pokemonId)
        ?.sources?.[0] || null,
    [routeEncounterData],
  );

  return {
    encounterData,
    getPokemonSource,
    isCustomLocation,
    isRouteEncounterDataLoading,
    routeEncounterData,
  };
}
