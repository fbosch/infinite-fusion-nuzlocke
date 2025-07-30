import { experimental_createQueryPersister } from '@tanstack/query-persist-client-core';
import { createStore, get, set, del } from 'idb-keyval';

// Create a specific store for the query client
const queryStore = createStore('query-client', 'queries');

// Create an IndexedDB storage adapter for idb-keyval
const idbStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const value = await get(key, queryStore);
    return value ? String(value) : null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    await set(key, value, queryStore);
  },

  removeItem: async (key: string): Promise<void> => {
    await del(key, queryStore);
  },

  entries: async (): Promise<Array<[string, string]>> => {
    // Note: idb-keyval doesn't have a built-in entries method
    // This is a limitation for the experimental persister
    return [];
  },
};

// Create the experimental query persister for individual queries
export const queryPersister = experimental_createQueryPersister({
  storage: idbStorage,
  prefix: 'query:',
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
});
