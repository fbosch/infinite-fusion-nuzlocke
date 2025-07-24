import * as Comlink from 'comlink';

// TypeScript interface for the search worker
interface SearchWorker {
  initialize(
    pokemonList: Array<{
      id: number;
      name: string;
      nationalDexId: number;
    }>
  ): Promise<{ success: boolean; dataCount: number }>;

  search(query: string): Promise<
    Array<{
      id: number;
      name: string;
      nationalDexId: number;
      score: number;
    }>
  >;

  isReady(): Promise<boolean>;

  getStats(): Promise<{
    initialized: boolean;
    dataCount: number;
    hasFuseInstance: boolean;
  }>;
}

// Service interface
interface SearchWorkerService {
  initialize(
    pokemonData: Array<{
      id: number;
      name: string;
      nationalDexId: number;
    }>
  ): Promise<void>;

  search(query: string): Promise<
    Array<{
      id: number;
      name: string;
      nationalDexId: number;
      score: number;
    }>
  >;

  isReady(): Promise<boolean>;

  getStats(): Promise<{
    initialized: boolean;
    dataCount: number;
    hasFuseInstance: boolean;
  }>;
}

// Singleton service instance
let serviceInstance: SearchWorkerService | null = null;
let worker: Worker | null = null;
let searchWorker: Comlink.Remote<SearchWorker> | null = null;

class SearchWorkerServiceImpl implements SearchWorkerService {
  private initialized = false;

  async initialize(
    pokemonData: Array<{
      id: number;
      name: string;
      nationalDexId: number;
    }>
  ): Promise<void> {
    if (!searchWorker && typeof Worker !== 'undefined') {
      worker = new Worker('/search-worker.js');
      searchWorker = Comlink.wrap<SearchWorker>(worker);
    }

    if (searchWorker) {
      try {
        const result = await searchWorker.initialize(pokemonData);
        this.initialized = result.success;
        console.log(
          `Search worker initialized with ${result.dataCount} Pokemon`
        );
      } catch (error) {
        console.error('Failed to initialize search worker:', error);
        this.initialized = false;
      }
    }
  }

  async search(query: string): Promise<
    Array<{
      id: number;
      name: string;
      nationalDexId: number;
      score: number;
    }>
  > {
    if (!searchWorker || !this.initialized) {
      return [];
    }

    // Handle empty queries
    if (!query.trim()) {
      return [];
    }

    try {
      return await searchWorker.search(query);
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  async isReady(): Promise<boolean> {
    if (!searchWorker) {
      return false;
    }

    try {
      return await searchWorker.isReady();
    } catch (error) {
      console.error('Failed to check worker readiness:', error);
      return false;
    }
  }

  async getStats(): Promise<{
    initialized: boolean;
    dataCount: number;
    hasFuseInstance: boolean;
  }> {
    if (!searchWorker) {
      return {
        initialized: false,
        dataCount: 0,
        hasFuseInstance: false,
      };
    }

    try {
      return await searchWorker.getStats();
    } catch (error) {
      console.error('Failed to get worker stats:', error);
      return {
        initialized: false,
        dataCount: 0,
        hasFuseInstance: false,
      };
    }
  }
}

export function getSearchWorkerService(): SearchWorkerService {
  if (!serviceInstance) {
    serviceInstance = new SearchWorkerServiceImpl();
  }
  return serviceInstance;
}

export function cleanupSearchWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  searchWorker = null;
  serviceInstance = null;
}

// Legacy exports for backward compatibility
export async function initializeSearchWorker(
  pokemonData: Array<{
    id: number;
    name: string;
    nationalDexId: number;
  }>
): Promise<void> {
  const service = getSearchWorkerService();
  return service.initialize(pokemonData);
}

export async function searchPokemonInWorker(query: string): Promise<
  Array<{
    id: number;
    name: string;
    nationalDexId: number;
    score: number;
  }>
> {
  const service = getSearchWorkerService();
  return service.search(query);
}
