import { queryOptions } from '@tanstack/react-query';
import pokemonApiService from '@/services/pokemonApiService';
import ms from 'ms';

// Pokemon query options
export const pokemonQueries = {
  all: () =>
    queryOptions({
      queryKey: ['pokemon', 'all'],
      queryFn: () => pokemonApiService.getAllPokemon(),
      staleTime: ms('7d'),
      gcTime: ms('30m'),
    }),

  byId: (id: number) =>
    queryOptions({
      queryKey: ['pokemon', 'byId', id],
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
      queryKey: ['pokemon', 'byIds', ids],
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
      queryKey: ['pokemon', 'byType', type],
      queryFn: () => pokemonApiService.getPokemonByType(type),
      enabled: !!type,
      staleTime: ms('5m'),
      gcTime: ms('10m'),
    }),
};

// Query key factories for consistent key generation
export const pokemonKeys = {
  all: ['pokemon', 'all'] as const,
  byId: (id: number) => ['pokemon', 'byId', id] as const,
  byIds: (ids: number[]) => ['pokemon', 'byIds', ids] as const,
  byType: (type: string) => ['pokemon', 'byType', type] as const,
};
