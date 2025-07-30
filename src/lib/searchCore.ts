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
    // Search in both name and ID fields
    keys: [
      {
        name: 'name',
        weight: 1.0,
      },
      {
        name: 'id',
        weight: 0.8,
      },
      {
        name: 'nationalDexId',
        weight: 0.4,
      },
    ],
    threshold: 0.3,
    includeScore: true,
    minMatchCharLength: 1,
    location: 0,
    distance: 50,
    useExtendedSearch: false,
    findAllMatches: true,
    shouldSort: true,
    ignoreLocation: false,
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

    const trimmedQuery = query.trim();

    // Numeric search (by ID) - exact match for better performance
    if (/^\d+$/.test(trimmedQuery)) {
      const queryNum = parseInt(trimmedQuery, 10);
      return this.pokemonData
        .filter(p => p.id === queryNum || p.nationalDexId === queryNum)
        .map(p => ({ ...p, score: 0 }));
    }

    // Fuzzy search for names - let Fuse.js handle the ranking
    const results = this.fuse.search(trimmedQuery);

    return results.map(result => ({
      ...result.item,
      score: result.score || 0,
    }));
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
