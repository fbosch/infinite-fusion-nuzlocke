import type { RouteEncounterPokemon } from "@/loaders/encounters";
import { isEgg, type PokemonOptionType } from "@/loaders/pokemon";

const NUMERIC_QUERY_REGEX = /^\d+$/;

const excludesFusionEgg = (pokemon: PokemonOptionType, isFusion: boolean) =>
  isFusion && isEgg(pokemon);

const filterFusionEggs = (pokemon: PokemonOptionType[], isFusion: boolean) =>
  pokemon.filter((option) => !excludesFusionEgg(option, isFusion));

const createAllPokemonOptions = (allPokemon: PokemonOptionType[]) =>
  allPokemon.map(({ id, name, nationalDexId }) => ({
    id,
    name,
    nationalDexId,
  }));

const getRouteMatches = (
  routeEncounterData: RouteEncounterPokemon[],
  query: string,
  isFusion: boolean,
) => {
  const normalizedQuery = query.toLowerCase();

  if (NUMERIC_QUERY_REGEX.test(query.trim())) {
    const queryNumber = Number.parseInt(query, 10);
    return routeEncounterData.filter(
      (pokemon) =>
        (pokemon.id === queryNumber || pokemon.nationalDexId === queryNumber) &&
        !excludesFusionEgg(pokemon, isFusion),
    );
  }

  return routeEncounterData.filter(
    (pokemon) =>
      pokemon.name.toLowerCase().includes(normalizedQuery) &&
      !excludesFusionEgg(pokemon, isFusion),
  );
};

const prioritizeRoutePokemon = (
  options: PokemonOptionType[],
  gameMode: "classic" | "remix" | "randomized",
  isRoutePokemon: (pokemonId: number) => boolean,
) => {
  if (gameMode === "randomized") {
    return options;
  }

  return options.sort((first, second) => {
    const firstIsRoutePokemon = isRoutePokemon(first.id);
    const secondIsRoutePokemon = isRoutePokemon(second.id);

    if (firstIsRoutePokemon === secondIsRoutePokemon) {
      return 0;
    }

    return firstIsRoutePokemon ? -1 : 1;
  });
};

const removeDuplicatePokemon = (options: PokemonOptionType[]) =>
  options.filter(
    (pokemon, index) =>
      index === options.findIndex((option) => option.id === pokemon.id),
  );

interface GetFinalOptionsProps {
  allPokemon: PokemonOptionType[];
  deferredQuery: string;
  gameMode: "classic" | "remix" | "randomized";
  isAllPokemonLoading: boolean;
  isCustomLocation: boolean;
  isFusion: boolean;
  isRouteEncounterDataLoading: boolean;
  isRoutePokemon: (pokemonId: number) => boolean;
  results: PokemonOptionType[];
  routeEncounterData: RouteEncounterPokemon[];
}

export const getFinalOptions = ({
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
}: GetFinalOptionsProps) => {
  if (isRouteEncounterDataLoading) {
    return [];
  }

  if (deferredQuery === "") {
    const shouldShowAllPokemon =
      gameMode === "randomized" ||
      isCustomLocation ||
      routeEncounterData.length === 0;

    if (shouldShowAllPokemon) {
      return isAllPokemonLoading
        ? []
        : filterFusionEggs(createAllPokemonOptions(allPokemon), isFusion);
    }

    return filterFusionEggs(routeEncounterData, isFusion);
  }

  if (results.length === 0 && routeEncounterData.length === 0) {
    return [];
  }

  const matchingPokemon = [
    ...getRouteMatches(routeEncounterData, deferredQuery, isFusion),
    ...filterFusionEggs(results, isFusion),
  ];

  return removeDuplicatePokemon(
    prioritizeRoutePokemon(matchingPokemon, gameMode, isRoutePokemon),
  );
};

interface IsShowingLoadingProps {
  deferredQuery: string;
  fusionCombination: unknown;
  gameMode: "classic" | "remix" | "randomized";
  isAllPokemonLoading: boolean;
  isCustomLocation: boolean;
  isRouteEncounterDataLoading: boolean;
  isSearchLoading: boolean;
  routeEncounterData: RouteEncounterPokemon[];
}

export const isShowingOptionsLoading = ({
  deferredQuery,
  fusionCombination,
  gameMode,
  isAllPokemonLoading,
  isCustomLocation,
  isRouteEncounterDataLoading,
  isSearchLoading,
  routeEncounterData,
}: IsShowingLoadingProps) => {
  if (deferredQuery === "") {
    return (
      isRouteEncounterDataLoading ||
      ((gameMode === "randomized" ||
        isCustomLocation ||
        routeEncounterData.length === 0) &&
        isAllPokemonLoading)
    );
  }

  return !fusionCombination && (isSearchLoading || isAllPokemonLoading);
};
