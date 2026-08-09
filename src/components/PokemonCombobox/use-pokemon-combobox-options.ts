import { useCallback, useMemo } from "react";
import type { RouteEncounterPokemon } from "@/loaders/encounters";
import {
  type PokemonOptionType,
  useAllPokemon,
  usePokemonSearch,
} from "@/loaders/pokemon";
import { useEncounters, useGameMode } from "@/stores/playthroughs/hooks";
import { buildCapturedSpeciesIdSet } from "@/utils/encounter-utils";
import { getPokemonSources } from "./encounter-selection";
import { resolveFusionCombination } from "./fusion-combination";
import {
  getFinalOptions,
  isShowingOptionsLoading,
} from "./pokemon-option-filtering";
import type { FusionCombinationOption } from "./pokemon-options";

const EMPTY_POKEMON_OPTIONS: PokemonOptionType[] = [];

interface UsePokemonComboboxOptionsProps {
  deferredQuery: string;
  isCustomLocation: boolean;
  isFusion: boolean;
  isRouteEncounterDataLoading: boolean;
  onFusionChange:
    | ((head: PokemonOptionType, body: PokemonOptionType) => void)
    | undefined;
  routeEncounterData: RouteEncounterPokemon[];
}

export function usePokemonComboboxOptions({
  deferredQuery,
  isCustomLocation,
  isFusion,
  isRouteEncounterDataLoading,
  onFusionChange,
  routeEncounterData,
}: UsePokemonComboboxOptionsProps) {
  const gameMode = useGameMode();
  const encounters = useEncounters();
  const routePokemonIds = useMemo(
    () => new Set(routeEncounterData.map((pokemon) => pokemon.id)),
    [routeEncounterData],
  );
  const capturedSpeciesIds = useMemo(
    () => buildCapturedSpeciesIdSet(encounters),
    [encounters],
  );
  const isRoutePokemon = useCallback(
    (pokemonId: number) => routePokemonIds.has(pokemonId),
    [routePokemonIds],
  );
  const isDuplicatePokemon = useCallback(
    (pokemonId: number) => capturedSpeciesIds.has(pokemonId),
    [capturedSpeciesIds],
  );
  const getPokemonSource = useCallback(
    (pokemonId: number) => getPokemonSources(routeEncounterData, pokemonId),
    [routeEncounterData],
  );
  const { data: resultsData, isLoading: isSearchLoading } = usePokemonSearch({
    query: deferredQuery,
  });
  const { data: allPokemonData, isLoading: isAllPokemonLoading } =
    useAllPokemon();
  const results = resultsData ?? EMPTY_POKEMON_OPTIONS;
  const allPokemon = allPokemonData ?? EMPTY_POKEMON_OPTIONS;
  const fusionCombination =
    !isFusion && onFusionChange
      ? resolveFusionCombination(deferredQuery, allPokemon)
      : null;
  const fusionCombinationOption: FusionCombinationOption | null =
    fusionCombination
      ? { ...fusionCombination.head, fusionBody: fusionCombination.body }
      : null;

  const finalOptions = useMemo(
    () =>
      getFinalOptions({
        allPokemon,
        deferredQuery,
        gameMode,
        isAllPokemonLoading,
        isCustomLocation,
        isFusion,
        isRouteEncounterDataLoading,
        isRoutePokemon,
        results,
        routeEncounterData,
      }),
    [
      allPokemon,
      deferredQuery,
      gameMode,
      isAllPokemonLoading,
      isCustomLocation,
      isFusion,
      isRouteEncounterDataLoading,
      isRoutePokemon,
      results,
      routeEncounterData,
    ],
  );
  const isShowingLoading = isShowingOptionsLoading({
    deferredQuery,
    fusionCombination,
    gameMode,
    isAllPokemonLoading,
    isCustomLocation,
    isRouteEncounterDataLoading,
    isSearchLoading,
    routeEncounterData,
  });

  return {
    finalOptions,
    fusionCombinationOption,
    gameMode,
    getPokemonSource,
    isDuplicatePokemon,
    isRoutePokemon,
    isShowingLoading,
  };
}
