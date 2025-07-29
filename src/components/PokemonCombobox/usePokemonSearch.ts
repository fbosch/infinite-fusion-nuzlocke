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
import { useDebounce } from 'use-debounce';

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
  const [debouncedQuery] = useDebounce(query, 50, {
    maxWait: 250,
    leading: true,
    trailing: true,
  });

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
    placeholderData: keepPreviousData,
    ...queryOptions,
  });
}
