import * as Comlink from 'comlink';
import Fuse, { type IFuseOptions } from 'fuse.js';

// Define the Pokemon data interface
interface PokemonData {
  id: number;
  name: string;
  nationalDexId: number;
}

interface SearchResult extends PokemonData {
  score: number;
}

interface InitializeResult {
  success: boolean;
  dataCount: number;
}

interface WorkerStats {
  initialized: boolean;
  dataCount: number;
  hasFuseInstance: boolean;
}

// Worker state
let fuse: Fuse<PokemonData> | null = null;
let pokemonData: PokemonData[] | null = null;
let initialized = false;

// Search worker implementation
const searchWorker = {
  /**
   * Initialize the search worker with Pokemon data
   */
  async initialize(pokemonList: PokemonData[]): Promise<InitializeResult> {
    try {
      pokemonData = pokemonList;

      const fuseOptions: IFuseOptions<PokemonData> = {
        keys: ['name'],
        threshold: 0.3,
        includeScore: true,
        minMatchCharLength: 2,
        shouldSort: true,
      };

      fuse = new Fuse(pokemonData, fuseOptions);
      initialized = true;

      return {
        success: true,
        dataCount: pokemonData.length,
      };
    } catch (error) {
      console.error('Worker initialization failed:', error);
      initialized = false;
      return {
        success: false,
        dataCount: 0,
      };
    }
  },

  /**
   * Search for Pokemon by name or ID
   */
  async search(query: string): Promise<SearchResult[]> {
    if (!fuse || !pokemonData || !query?.trim()) {
      return [];
    }

    // Check if query is numeric (for ID searches)
    if (/^\d+$/.test(query.trim())) {
      const queryNum = parseInt(query, 10);
      return pokemonData
        .filter(p => p.id === queryNum || p.nationalDexId === queryNum)
        .map(p => ({ ...p, score: 0 }));
    }

    // Fuzzy search for names
    const results = fuse.search(query);
    return results.map(result => ({
      ...result.item,
      score: result.score || 0,
    }));
  },

  /**
   * Check if the worker is ready for searches
   */
  async isReady(): Promise<boolean> {
    return initialized && fuse !== null && pokemonData !== null;
  },

  /**
   * Get worker statistics and status
   */
  async getStats(): Promise<WorkerStats> {
    return {
      initialized,
      dataCount: pokemonData ? pokemonData.length : 0,
      hasFuseInstance: fuse !== null,
    };
  },
};

// Export the worker interface for Comlink
export type SearchWorkerType = typeof searchWorker;

// Expose the worker API through Comlink
Comlink.expose(searchWorker);
