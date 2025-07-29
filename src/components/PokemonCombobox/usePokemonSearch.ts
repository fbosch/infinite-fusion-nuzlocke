import { QueryOptions, useQuery } from '@tanstack/react-query';
import {
  PokemonOptionType,
  searchPokemon,
  useAllPokemon,
} from '@/loaders/pokemon';
import { useGameMode } from '@/stores/playthroughs';
import { useDebounced } from '@/hooks/useDebounced';

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

  // Debounce the query to reduce search frequency
  const debouncedQuery = useDebounced(query, 50);

  return useQuery<PokemonOptionType[], Error>({
    queryKey: ['pokemon', 'search', gameMode, debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery === '') return [];
      try {
        return await searchPokemon(debouncedQuery);
      } catch (err) {
        return allPokemon
          .filter(pokemon =>
            pokemon.name.toLowerCase().includes(debouncedQuery.toLowerCase())
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
    enabled: allPokemon.length > 0 && debouncedQuery !== '',
    placeholderData: previousData => {
      return (
        previousData?.filter(p =>
          p.name.toLowerCase().includes(debouncedQuery.toLowerCase())
        ) ?? []
      );
    },
    ...queryOptions,
  });
}
