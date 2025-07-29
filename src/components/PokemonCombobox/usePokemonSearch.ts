import {
  keepPreviousData,
  QueryOptions,
  useQuery,
} from '@tanstack/react-query';
import {
  PokemonOptionType,
  useAllPokemon,
  generatePokemonUID,
} from '@/loaders/pokemon';
import { useGameMode } from '@/stores/playthroughs';
import { useDebounce } from 'use-debounce';
import { SearchCore } from '@/lib/searchCore';

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
        // Use SearchCore for local Fuse.js search instead of API calls
        const searchCore = await SearchCore.create();
        const searchResults = await searchCore.search(debouncedQuery);

        // Transform SearchCore results to PokemonOptionType format
        return searchResults.map(result => ({
          id: result.id,
          name: result.name,
          nationalDexId: result.nationalDexId,
          uid: generatePokemonUID(),
        }));
      } catch (err) {
        // Fallback to client-side filtering if SearchCore fails
        return allPokemon
          .filter(pokemon =>
            pokemon.name.toLowerCase().includes(debouncedQuery.toLowerCase())
          )
          .map(p => ({
            id: p.id,
            name: p.name,
            nationalDexId: p.nationalDexId,
            uid: generatePokemonUID(),
          }));
      }
    },
    select: data => {
      return data?.filter(p => p.id !== 0) ?? [];
    },
    enabled: allPokemon.length > 0 && debouncedQuery !== '',
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions,
  });
}
