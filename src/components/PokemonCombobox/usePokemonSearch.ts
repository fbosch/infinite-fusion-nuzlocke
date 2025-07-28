import { useState, useCallback, useEffect } from 'react';
import {
  getPokemon,
  searchPokemon,
  type PokemonOption,
} from '@/loaders/pokemon';
import { useGameMode } from '@/stores/playthroughs';

interface UsePokemonSearchOptions {
  query: string;
  isRoutePokemon: (pokemonId: number) => boolean;
}

export function usePokemonSearch({
  query,
  isRoutePokemon,
}: UsePokemonSearchOptions) {
  const [results, setFuzzyResults] = useState<PokemonOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<Error | null>(null);
  const gameMode = useGameMode();

  // Smart search function that handles both name and ID searches
  const performSmartSearch = useCallback(
    async (
      searchQuery: string,
      pokemonList: PokemonOption[]
    ): Promise<PokemonOption[]> => {
      try {
        // Use the smart search function that handles both numeric and text searches
        const allResults = await searchPokemon(searchQuery);

        // Filter results to only include Pokemon from the provided list
        return allResults.filter(item =>
          pokemonList.some(pokemon => pokemon.id === item.id)
        );
      } catch (err) {
        console.error('Error performing smart search:', err);
        // Fallback to simple search if smart search is not available
        return pokemonList.filter(pokemon =>
          pokemon.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
    },
    []
  );

  // Perform smart search when query changes
  useEffect(() => {
    if (query === '') {
      setFuzzyResults([]);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    // Debounce search for better performance
    const timeoutId = setTimeout(async () => {
      try {
        const allPokemon = await getPokemon();

        // In randomized mode, all Pokemon are available, so we don't filter
        // In classic/remix modes, filter out route Pokemon to avoid duplicates
        const pokemonToSearch =
          gameMode === 'randomized'
            ? allPokemon
            : allPokemon.filter(p => !isRoutePokemon(p.id));

        const results = await performSmartSearch(query, pokemonToSearch);
        setFuzzyResults(results);
      } catch (err) {
        console.error('Search error:', err);
        setSearchError(err instanceof Error ? err : new Error('Search failed'));
        setFuzzyResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 100); // 100ms debounce

    return () => clearTimeout(timeoutId);
  }, [query, isRoutePokemon, performSmartSearch, gameMode]);

  // Clear search results
  const clearSearch = useCallback(() => {
    setFuzzyResults([]);
    setSearchError(null);
    setIsSearching(false);
  }, []);

  return {
    results,
    isSearching,
    searchError,
    clearSearch,
  };
}
