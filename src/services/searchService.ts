import { SearchCore } from '@/lib/searchCore';
import * as Comlink from 'comlink';

let mainThreadInstance: SearchCore | null = null;
let mainThreadInitPromise: Promise<SearchCore> | null = null;
let instance: Comlink.Remote<SearchCore> | SearchCore | null = null;

const getMainThreadInstance = async () => {
  if (mainThreadInstance && mainThreadInstance.isReady()) {
    return mainThreadInstance;
  }

  if (mainThreadInitPromise) {
    return await mainThreadInitPromise;
  }

  mainThreadInitPromise = (async () => {
    try {
      const newInstance = new SearchCore();
      await newInstance.initialize();
      mainThreadInstance = newInstance;
      return newInstance;
    } catch (error) {
      console.error('Failed to initialize main thread SearchCore:', error);
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
      new URL('@/workers/search.worker', import.meta.url)
    );
    const wrappedInstance = Comlink.wrap<SearchCore>(worker);

    // Warm up the worker by calling a dummy search to ensure initialization
    try {
      await wrappedInstance.search('');
    } catch (error) {
      console.warn(
        'Worker warm-up failed, falling back to main thread:',
        error
      );
      return await getMainThreadInstance();
    }

    instance = wrappedInstance;
  } catch (error) {
    console.error(
      'Failed to initialize search worker, falling back to main thread:',
      error
    );
    instance = await getMainThreadInstance();
  }

  return instance as SearchCore;
};

const service = {
  search: async (query: string) => {
    try {
      const instance = await getInstance();
      return instance.search(query);
    } catch (error) {
      console.error('Search service failed:', error);
      return [];
    }
  },
};

export default service;
