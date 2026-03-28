import {
  experimental_createQueryPersister,
  type PersistedQuery,
} from "@tanstack/query-persist-client-core";
import { createStore, del, get, set } from "idb-keyval";

// Cache busting mechanism using build ID
export const getCacheBuster = () => {
  if (process.env.NODE_ENV === "development") {
    return Math.floor(Date.now() / (1 * 60 * 1000)); // Updates every minute
  }

  // Use Vercel commit SHA (exposed as NEXT_PUBLIC_BUILD_ID) or fallback
  return process.env.NEXT_PUBLIC_BUILD_ID || "v1";
};

const queryStore = createStore("query-client", "queries");

const idbStorage = {
  getItem: (key: string) => get(key, queryStore),
  setItem: (key: string, value: string) => set(key, value, queryStore),
  removeItem: (key: string) => del(key, queryStore),
};

const isPersistedQuery = (value: unknown): value is PersistedQuery => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as {
    buster?: unknown;
    clientState?: unknown;
    timestamp?: unknown;
  };

  return (
    typeof candidate.timestamp === "number" &&
    typeof candidate.buster === "string" &&
    typeof candidate.clientState === "object" &&
    candidate.clientState !== null
  );
};

const deserializePersistedQuery = (data: unknown): PersistedQuery => {
  const parsed = typeof data === "string" ? JSON.parse(data) : data;

  if (isPersistedQuery(parsed)) {
    return parsed;
  }

  throw new Error("Invalid persisted query payload");
};

export const queryPersister = experimental_createQueryPersister({
  storage: idbStorage,
  prefix: `query:`,
  buster: getCacheBuster().toString(),
  deserialize: deserializePersistedQuery,
  serialize: JSON.stringify,
  maxAge:
    process.env.NODE_ENV === "development"
      ? 1000 * 60 * 5 // 5 minutes in dev
      : 1000 * 60 * 60 * 24 * 7, // 1 week in production
});
