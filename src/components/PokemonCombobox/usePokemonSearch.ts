import {
  keepPreviousData,
  QueryOptions,
  useQuery,
} from '@tanstack/react-query';
import {
  PokemonOptionType,
  searchPokemon,
  useAllPokemon,
} from '@/loaders/pokemon';
import { useGameMode } from '@/stores/playthroughs';

interface UsePokemonSearchOptions {
  query: string;
  queryOptions?: Omit<
    QueryOptions<PokemonOptionType[], Error>,
    'queryKey' | 'queryFn'
  >;
}

export function usePokemonSearch({
  query,
  queryOptions = {},
}: UsePokemonSearchOptions) {
  const gameMode = useGameMode();
  const { data: allPokemon = [] } = useAllPokemon();

  // Search query
  return useQuery<PokemonOptionType[], Error>({
    queryKey: ['pokemon', 'search', gameMode, query],
    queryFn: async () => {
      if (query === '') return [];
      try {
        return await searchPokemon(query);
      } catch (err) {
        return allPokemon
          .filter(pokemon =>
            pokemon.name.toLowerCase().includes(query.toLowerCase())
          )
          .map(p => ({
            id: p.id,
            name: p.name,
            nationalDexId: p.nationalDexId,
          }));
      }
    },
    select: data => {
      return data?.filter(p => p.id !== 0) ?? [];
    },
    enabled: query.length > 0 && allPokemon.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
    ...queryOptions,
  });
}
