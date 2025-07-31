import { SearchCore } from '@/lib/searchCore';
import type { Pokemon } from '@/loaders/pokemon';
import * as Comlink from 'comlink';

const searchCore = new SearchCore();

const searchAPI = {
  async initialize(pokemonData: Pokemon[]) {
    await searchCore.initialize(pokemonData);
  },

  async search(query: string) {
    if (!searchCore.isReady()) {
      throw new Error('SearchCore not initialized. Call initialize() first.');
    }
    return searchCore.search(query);
  },

  isReady() {
    return searchCore.isReady();
  },
};

Comlink.expose(searchAPI);
