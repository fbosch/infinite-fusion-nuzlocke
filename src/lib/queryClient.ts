import { QueryClient, queryOptions } from '@tanstack/react-query';
import pokemonApiService from '@/services/pokemonApiService';
import encountersApiService from '@/services/encountersApiService';
import type { Pokemon } from '@/loaders/pokemon';
import ms from 'ms';

// Create a centralized query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: ms('5m'), // 5 minutes
      gcTime: ms('10m'), // 10 minutes
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

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
      queryFn: () => {
        // Use local data for individual Pokemon lookups
        const allPokemon = queryClient.getQueryData(
          pokemonQueries.all().queryKey
        ) as Pokemon[] | undefined;
        if (!allPokemon) {
          // Fallback to API if local data not available
          return pokemonApiService.getPokemonById(id);
        }
        return allPokemon.find((p: Pokemon) => p.id === id) || null;
      },
      enabled: !!id,
      staleTime: Infinity,
      gcTime: Infinity,
    }),

  byIds: (ids: number[]) =>
    queryOptions({
      queryKey: ['pokemon', 'byIds', ids],
      queryFn: () => {
        // Use local data for multiple Pokemon lookups
        const allPokemon = queryClient.getQueryData(
          pokemonQueries.all().queryKey
        ) as Pokemon[] | undefined;
        if (!allPokemon) {
          // Fallback to API if local data not available
          return pokemonApiService.getPokemonByIds(ids);
        }
        return allPokemon.filter((p: Pokemon) => ids.includes(p.id));
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

// Encounters query options
export const encountersQueries = {
  byGameMode: (gameMode: 'classic' | 'remix') =>
    queryOptions({
      queryKey: ['encounters', 'byGameMode', gameMode],
      queryFn: () => encountersApiService.getEncountersByGameMode(gameMode),
      staleTime: ms('1h'), // 1 hour (encounters change less frequently)
      gcTime: ms('2h'),
    }),

  all: (gameMode: 'classic' | 'remix') =>
    queryOptions({
      queryKey: ['encounters', 'all', gameMode],
      queryFn: () => encountersApiService.getEncounters(gameMode),
      staleTime: ms('1h'),
      gcTime: ms('2h'),
    }),
};

// Utility functions for fetching data outside of React components
export const pokemonData = {
  getAllPokemon: () => queryClient.fetchQuery(pokemonQueries.all()),
  getPokemonById: (id: number) =>
    queryClient.fetchQuery(pokemonQueries.byId(id)),
  getPokemonByIds: (ids: number[]) =>
    queryClient.fetchQuery(pokemonQueries.byIds(ids)),
  getPokemonByType: (type: string) =>
    queryClient.fetchQuery(pokemonQueries.byType(type)),
};

export const encountersData = {
  getEncountersByGameMode: (gameMode: 'classic' | 'remix') =>
    queryClient.fetchQuery(encountersQueries.byGameMode(gameMode)),

  getAllEncounters: (gameMode: 'classic' | 'remix') =>
    queryClient.fetchQuery(encountersQueries.all(gameMode)),
};
