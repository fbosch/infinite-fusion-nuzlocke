import { expose } from "comlink";
import type { Pokemon } from "../model/pokemon";
import { SearchCore } from "./search-core";

const searchCore = new SearchCore();

const searchAPI = {
  async initialize(pokemon: Pokemon[]) {
    await searchCore.initialize(pokemon);
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
