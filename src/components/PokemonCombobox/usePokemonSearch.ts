import { QueryOptions, useQuery } from '@tanstack/react-query';
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
    staleTime: 30000, // 30 seconds
    gcTime: 60000, // 1 minute
    placeholderData: previousData => {
      return (
        previousData?.filter(p =>
          p.name.toLowerCase().includes(query.toLowerCase())
        ) ?? []
      );
    },
    ...queryOptions,
  });
}
