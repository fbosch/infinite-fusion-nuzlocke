import { type SearchCore } from '@/lib/searchCore';
import * as Comlink from 'comlink';

let mainThreadInstance: SearchCore | null = null;
let instance: Comlink.Remote<SearchCore> | SearchCore | null = null;

const getMainThreadInstance = async () => {
  if (!mainThreadInstance) {
    const { SearchCore: MainThreadSearchCore } = await import(
      '@/lib/searchCore'
    );
    mainThreadInstance = await MainThreadSearchCore.create();
  }
  return mainThreadInstance as SearchCore;
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
    instance = Comlink.wrap<SearchCore>(worker);
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
    const instance = await getInstance();
    return instance.search(query);
  },
};

export default service;
