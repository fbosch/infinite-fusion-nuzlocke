import { type Remote, wrap } from "comlink";
import { pokemonData } from "@/lib/data";
import { SearchCore } from "@/lib/search-core";

let mainThreadInstance: SearchCore | null = null;
let mainThreadInitPromise: Promise<SearchCore> | null = null;
let instance: Remote<SearchCore> | SearchCore | null = null;

const getMainThreadInstance = async () => {
  if (mainThreadInstance?.isReady()) {
    return mainThreadInstance;
  }

  if (mainThreadInitPromise) {
    return await mainThreadInitPromise;
  }

  mainThreadInitPromise = (async () => {
    try {
      const newInstance = new SearchCore();
      const allPokemon = await pokemonData.getAllPokemon();
      await newInstance.initialize(allPokemon);
      mainThreadInstance = newInstance;
      return newInstance;
    } catch (error) {
      console.error("Failed to initialize main thread SearchCore:", error);
      throw error;
    } finally {
      mainThreadInitPromise = null;
    }
  })();

  return await mainThreadInitPromise;
};

const getInstance = async (mainThread = false) => {
  if (mainThread) {
    return getMainThreadInstance();
  }

  if (instance) {
    return instance;
  }

  try {
    const worker = new Worker(
      new URL("@/workers/search.worker", import.meta.url),
    );
    const wrappedInstance = wrap<SearchCore>(worker);

    // Initialize the worker with Pokemon data
    try {
      const allPokemon = await pokemonData.getAllPokemon();
      await wrappedInstance.initialize(allPokemon);
    } catch (error) {
      console.warn(
        "Worker initialization failed, falling back to main thread:",
        error,
      );
      return await getMainThreadInstance();
    }

    instance = wrappedInstance;
  } catch (error) {
    console.error(
      "Failed to initialize search worker, falling back to main thread:",
      error,
    );
    instance = await getMainThreadInstance();
  }

  return instance;
};

const service = {
  search: async (query: string) => {
    try {
      const searchInstance = await getInstance();
      return searchInstance.search(query);
    } catch (error) {
      console.error("Search service failed:", error);
      return [];
    }
  },
};

export default service;
