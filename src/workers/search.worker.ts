import { expose } from "comlink";
import { SearchCore } from "@/lib/search-core";
import type { Pokemon } from "@/loaders/pokemon";

const searchCore = new SearchCore();

const searchAPI = {
  async initialize(pokemonData: Pokemon[]) {
    await searchCore.initialize(pokemonData);
  },

  isReady() {
    return searchCore.isReady();
  },

  async search(query: string) {
    if (!searchCore.isReady()) {
      throw new Error("SearchCore not initialized. Call initialize() first.");
    }
    return await searchCore.search(query);
  },
};

expose(searchAPI);
