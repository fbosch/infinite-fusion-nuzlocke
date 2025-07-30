import {
  experimental_createQueryPersister,
  PersistedQuery,
} from '@tanstack/query-persist-client-core';
import { createStore, get, set, del } from 'idb-keyval';

// Create a specific store for the query client
const queryStore = createStore('query-client', 'queries');

// Create an IndexedDB storage adapter for idb-keyval
const idbStorage = {
  getItem: (key: string) => get(key, queryStore),
  setItem: (key: string, value: string) => set(key, value, queryStore),
  removeItem: (key: string) => del(key, queryStore),
};

// Create the experimental query persister for individual queries
export const queryPersister = experimental_createQueryPersister({
  storage: idbStorage,
  prefix: 'query:',
  deserialize: data => data as unknown as PersistedQuery,
  serialize: data => data as unknown as string,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
});
