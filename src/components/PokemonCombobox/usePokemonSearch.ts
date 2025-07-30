import {
  keepPreviousData,
  QueryOptions,
  useQuery,
} from '@tanstack/react-query';
import { PokemonOptionType, useAllPokemon } from '@/loaders/pokemon';
import { useGameMode } from '@/stores/playthroughs';
import { useDebounce } from 'use-debounce';
import searchService from '@/services/searchService';

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
        // Use searchService with web worker for better performance
        const searchResults = await searchService.search(debouncedQuery);

        // Transform search results to PokemonOptionType format
        return searchResults.map(result => ({
          id: result.id,
          name: result.name,
          nationalDexId: result.nationalDexId,
        }));
      } catch (err) {
        console.warn(
          'searchService failed, using client-side filtering fallback',
          err
        );
        // Fallback to client-side filtering if searchService fails
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
    staleTime: 0, // Don't cache - always fetch fresh data
    gcTime: 0, // Don't keep in garbage collection
    ...queryOptions,
    persister: undefined,
  });
}
