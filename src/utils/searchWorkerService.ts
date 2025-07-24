import * as Comlink from 'comlink';

// TypeScript interface for the search worker
interface SearchWorker {
  initialize(
    pokemonList: Array<{
      id: number;
      name: string;
      nationalDexId: number;
    }>
  ): number;

  search(query: string): Array<{
    id: number;
    name: string;
    nationalDexId: number;
    score: number;
  }>;
}

// Create and initialize search worker
let searchWorker: Comlink.Remote<SearchWorker> | null = null;

export async function initializeSearchWorker(
  pokemonData: Array<{
    id: number;
    name: string;
    nationalDexId: number;
  }>
): Promise<void> {
  if (!searchWorker && typeof Worker !== 'undefined') {
    const worker = new Worker('/search-worker.js');
    searchWorker = Comlink.wrap<SearchWorker>(worker);

    const count = await searchWorker.initialize(pokemonData);
    console.log(`Search worker initialized with ${count} Pokemon`);
  }
}

export async function searchPokemonInWorker(query: string): Promise<
  Array<{
    id: number;
    name: string;
    nationalDexId: number;
    score: number;
  }>
> {
  if (!searchWorker) {
    return [];
  }

  try {
    return await searchWorker.search(query);
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}
