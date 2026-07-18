import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import ms from "ms";
import pokemonApiService from "@/services/pokemonApiService";

// Pokemon query options
export const pokemonQueries = {
  all: () =>
    queryOptions({
      queryKey: ["pokemon", "all"],
      queryFn: () => pokemonApiService.getAllPokemon(),
      staleTime: ms("7d"),
      gcTime: ms("30m"),
      placeholderData: keepPreviousData,
    }),

  byId: (id: number) =>
    queryOptions({
      queryKey: ["pokemon", "byId", id],
      queryFn: async () => {
        // Always use API for individual lookups to avoid circular dependency
        return pokemonApiService.getPokemonById(id);
      },
      enabled: !!id,
      staleTime: Infinity,
      gcTime: Infinity,
    }),

  byIds: (ids: number[]) =>
    queryOptions({
      queryKey: ["pokemon", "byIds", ids],
      queryFn: async () => {
        // Always use API for multiple lookups to avoid circular dependency
        return pokemonApiService.getPokemonByIds(ids);
      },
      enabled: ids.length > 0,
      staleTime: Infinity,
      gcTime: Infinity,
    }),

  byType: (type: string) =>
    queryOptions({
      queryKey: ["pokemon", "byType", type],
      queryFn: () => pokemonApiService.getPokemonByType(type),
      enabled: !!type,
      staleTime: ms("5m"),
      gcTime: ms("10m"),
    }),
};
