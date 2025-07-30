import {
  experimental_createQueryPersister,
  PersistedQuery,
} from '@tanstack/query-persist-client-core';
import { createStore, get, set, del } from 'idb-keyval';

// Cache busting mechanism using Next.js build info
export const getCacheBuster = () => {
  if (process.env.NODE_ENV === 'development') {
    return Math.floor(Date.now() / (1 * 60 * 1000)); // Updates every minute
  }

  return process.env.NEXT_BUILD_ID || process.env.npm_package_version || 'v1';
};

const queryStore = createStore('query-client', 'queries');

const idbStorage = {
  getItem: (key: string) => get(key, queryStore),
  setItem: (key: string, value: string) => set(key, value, queryStore),
  removeItem: (key: string) => del(key, queryStore),
};

export const queryPersister = experimental_createQueryPersister({
  storage: idbStorage,
  prefix: `query:`,
  buster: getCacheBuster().toString(),
  deserialize: data => data as unknown as PersistedQuery,
  serialize: data => data as unknown as string,
  maxAge:
    process.env.NODE_ENV === 'development'
      ? 1000 * 60 * 5
      : 1000 * 60 * 60 * 24 * 7,
});
