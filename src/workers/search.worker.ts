import { SearchCore } from '@/lib/searchCore';
import * as Comlink from 'comlink';

let searchCoreInstance: SearchCore | null = null;

const searchAPI = {
  async search(query: string) {
    if (!searchCoreInstance) {
      searchCoreInstance = await SearchCore.create();
    }
    return searchCoreInstance.search(query);
  },
};

Comlink.expose(searchAPI);
