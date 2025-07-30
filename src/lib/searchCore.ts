import Fuse, { type IFuseOptions } from 'fuse.js';
import type { Pokemon } from '@/loaders/pokemon';
import { pokemonData } from '@/lib/queryClient';

export interface PokemonData {
  id: number;
  name: string;
  nationalDexId: number;
}

export interface SearchResult extends PokemonData {
  score: number;
}

/**
 * Simplified search functionality for Pokemon
 */
export class SearchCore {
  private fuse: Fuse<PokemonData> | null = null;
  private pokemonData: PokemonData[] | null = null;

  private readonly fuseOptions: IFuseOptions<PokemonData> = {
    keys: [{ name: 'name', weight: 1.0 }],
    threshold: 0.4, // Slightly more permissive for better matches
    includeScore: true,
    minMatchCharLength: 1, // Allow single character matches for partial typing
    shouldSort: true,
    findAllMatches: true, // Find all possible matches
    useExtendedSearch: false, // Keep simple for better performance
    ignoreLocation: true, // Ignore where in the string the match occurs
    distance: 100, // Allow matches even with many characters between
    ignoreFieldNorm: false, // Consider field length for scoring
  };

  async initialize(): Promise<void> {
    if (this.fuse) return; // Already initialized

    const rawPokemonData = await pokemonData.getAllPokemon();

    this.pokemonData = rawPokemonData.map((pokemon: Pokemon) => ({
      id: pokemon.id,
      name: pokemon.name,
      nationalDexId: pokemon.nationalDexId,
    }));

    this.fuse = new Fuse(this.pokemonData, this.fuseOptions);
  }

  /**
   * Search for Pokemon by name or ID
   */
  search(query: string): SearchResult[] {
    if (!this.fuse || !this.pokemonData || !query?.trim()) {
      return [];
    }

    const trimmedQuery = query.trim().toLowerCase();

    // Numeric search (by ID)
    if (/^\d+$/.test(trimmedQuery)) {
      const queryNum = parseInt(trimmedQuery, 10);
      return this.pokemonData
        .filter(p => p.id === queryNum || p.nationalDexId === queryNum)
        .map(p => ({ ...p, score: 0 }));
    }

    // Exact match first (perfect score)
    const exactMatches = this.pokemonData
      .filter(p => p.name.toLowerCase() === trimmedQuery)
      .map(p => ({ ...p, score: 0 }));

    // Fuzzy search for names
    const fuzzyResults = this.fuse.search(trimmedQuery);
    const fuzzyMatches = fuzzyResults.map(result => ({
      ...result.item,
      score: result.score || 0,
    }));

    // Combine and deduplicate results
    const allResults = [...exactMatches, ...fuzzyMatches];
    const uniqueResults = allResults.filter(
      (result, index, self) => index === self.findIndex(r => r.id === result.id)
    );

    // Limit results to top 20 for performance
    return uniqueResults.slice(0, 20);
  }
}

/**
 * Utility function to check if a query is numeric
 */
export function isNumericQuery(query: string): boolean {
  return /^\d+$/.test(query.trim());
}

/**
 * Utility function to parse a numeric query
 */
export function parseNumericQuery(query: string): number {
  return parseInt(query.trim(), 10);
}
