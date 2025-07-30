import { SearchCore } from '@/lib/searchCore';
import * as Comlink from 'comlink';

const searchCore = new SearchCore();

const searchAPI = {
  async search(query: string) {
    if (!searchCore.isReady()) {
      await searchCore.initialize();
    }
    return searchCore.search(query);
  },
};

Comlink.expose(searchAPI);
