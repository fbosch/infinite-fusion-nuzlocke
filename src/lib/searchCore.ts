import Fuse, { type IFuseOptions } from 'fuse.js';
import type { Pokemon } from '@/loaders/pokemon';

// Define the Pokemon data interface
export interface PokemonData {
  id: number;
  name: string;
  nationalDexId: number;
}

export interface SearchResult extends PokemonData {
  score: number;
}

export interface InitializeResult {
  success: boolean;
  dataCount: number;
}

export interface SearchStats {
  initialized: boolean;
  dataCount: number;
  hasFuseInstance: boolean;
}

/**
 * Core search functionality that works in both main thread and workers
 */
export class SearchCore {
  private fuse: Fuse<PokemonData> | null = null;
  private pokemonData: PokemonData[] | null = null;
  private initialized = false;

  /**
   * Default Fuse.js options for Pokemon search
   */
  private readonly defaultFuseOptions: IFuseOptions<PokemonData> = {
    keys: ['name'],
    threshold: 0.3,
    includeScore: true,
    minMatchCharLength: 2,
    shouldSort: true,
  };

  /**
   * Create a new SearchCore instance with Pokemon data automatically loaded
   */
  static async create(
    customOptions?: Partial<IFuseOptions<PokemonData>>
  ): Promise<SearchCore> {
    const instance = new SearchCore();
    await instance.initializeWithData(customOptions);
    return instance;
  }

  /**
   * Internal method to load Pokemon data and initialize search
   */
  private async initializeWithData(
    customOptions?: Partial<IFuseOptions<PokemonData>>
  ): Promise<void> {
    try {
      // Import Pokemon data from the data file
      const pokemonDataModule = await import('@data/pokemon-data.json');
      const rawPokemonData = pokemonDataModule.default;

      // Transform the data to match our PokemonData interface
      this.pokemonData = rawPokemonData.map((pokemon: Pokemon) => ({
        id: pokemon.id,
        name: pokemon.name,
        nationalDexId: pokemon.nationalDexId,
      }));

      const fuseOptions: IFuseOptions<PokemonData> = {
        ...this.defaultFuseOptions,
        ...customOptions,
      };

      this.fuse = new Fuse(this.pokemonData, fuseOptions);
      this.initialized = true;
    } catch (error) {
      console.error('Search initialization failed:', error);
      this.initialized = false;
      this.fuse = null;
      this.pokemonData = null;
      throw new Error('Failed to initialize search with Pokemon data');
    }
  }



  /**
   * Search for Pokemon by name or ID
   */
  async search(query: string): Promise<SearchResult[]> {
    if (!this.fuse || !this.pokemonData || !query?.trim()) {
      return [];
    }

    const trimmedQuery = query.trim();

    // Check if query is numeric (for ID searches)
    if (/^\d+$/.test(trimmedQuery)) {
      const queryNum = parseInt(trimmedQuery, 10);
      return this.pokemonData
        .filter(p => p.id === queryNum || p.nationalDexId === queryNum)
        .map(p => ({ ...p, score: 0 }));
    }

    // Fuzzy search for names
    const results = this.fuse.search(trimmedQuery);
    return results.map(result => ({
      ...result.item,
      score: result.score || 0,
    }));
  }

  /**
   * Search for Pokemon synchronously (for main thread usage)
   */
  searchSync(query: string): SearchResult[] {
    if (!this.fuse || !this.pokemonData || !query?.trim()) {
      return [];
    }

    const trimmedQuery = query.trim();

    // Check if query is numeric (for ID searches)
    if (/^\d+$/.test(trimmedQuery)) {
      const queryNum = parseInt(trimmedQuery, 10);
      return this.pokemonData
        .filter(p => p.id === queryNum || p.nationalDexId === queryNum)
        .map(p => ({ ...p, score: 0 }));
    }

    // Fuzzy search for names
    const results = this.fuse.search(trimmedQuery);
    return results.map(result => ({
      ...result.item,
      score: result.score || 0,
    }));
  }

  /**
   * Check if the search is ready
   */
  async isReady(): Promise<boolean> {
    return this.isReadySync();
  }

  /**
   * Check if the search is ready (synchronous version)
   */
  isReadySync(): boolean {
    return this.initialized && this.fuse !== null && this.pokemonData !== null;
  }

  /**
   * Get search statistics and status
   */
  async getStats(): Promise<SearchStats> {
    return this.getStatsSync();
  }

  /**
   * Get search statistics and status (synchronous version)
   */
  getStatsSync(): SearchStats {
    return {
      initialized: this.initialized,
      dataCount: this.pokemonData ? this.pokemonData.length : 0,
      hasFuseInstance: this.fuse !== null,
    };
  }

  /**
   * Reset the search instance
   */
  reset(): void {
    this.fuse = null;
    this.pokemonData = null;
    this.initialized = false;
  }

  /**
   * Get the raw Pokemon data (useful for direct access)
   */
  getPokemonData(): PokemonData[] | null {
    return this.pokemonData;
  }

  /**
   * Update Fuse options without reinitializing
   */
  updateOptions(options: Partial<IFuseOptions<PokemonData>>): boolean {
    if (!this.pokemonData) {
      return false;
    }

    try {
      const fuseOptions: IFuseOptions<PokemonData> = {
        ...this.defaultFuseOptions,
        ...options,
      };

      this.fuse = new Fuse(this.pokemonData, fuseOptions);
      return true;
    } catch (error) {
      console.error('Failed to update search options:', error);
      return false;
    }
  }
}

/**
 * Utility function to check if a query appears to be numeric
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
