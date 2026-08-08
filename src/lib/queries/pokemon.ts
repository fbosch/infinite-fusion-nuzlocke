import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import ms from "ms";
import pokemonApiService from "@/services/pokemonApiService";

// Pokemon query options
export const pokemonQueries = {
  all: () =>
    queryOptions({
      gcTime: ms("30m"),
      placeholderData: keepPreviousData,
      queryFn: () => pokemonApiService.getAllPokemon(),
      queryKey: ["pokemon", "all"],
      staleTime: ms("7d"),
    }),

  byId: (id: number) =>
    queryOptions({
      enabled: !!id,
      gcTime: Number.POSITIVE_INFINITY,
      queryFn: async () => {
        // Always use API for individual lookups to avoid circular dependency
        return pokemonApiService.getPokemonById(id);
      },
      queryKey: ["pokemon", "byId", id],
      staleTime: Number.POSITIVE_INFINITY,
    }),

  byIds: (ids: number[]) =>
    queryOptions({
      enabled: ids.length > 0,
      gcTime: Number.POSITIVE_INFINITY,
      queryFn: async () => {
        // Always use API for multiple lookups to avoid circular dependency
        return pokemonApiService.getPokemonByIds(ids);
      },
      queryKey: ["pokemon", "byIds", ids],
      staleTime: Number.POSITIVE_INFINITY,
    }),

  byType: (type: string) =>
    queryOptions({
      enabled: !!type,
      gcTime: ms("10m"),
      queryFn: () => pokemonApiService.getPokemonByType(type),
      queryKey: ["pokemon", "byType", type],
      staleTime: ms("5m"),
    }),
};
