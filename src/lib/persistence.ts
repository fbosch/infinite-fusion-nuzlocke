import {
  experimental_createQueryPersister,
  type PersistedQuery,
} from "@tanstack/query-persist-client-core";
import { createStore, del, get, set } from "idb-keyval";
import { EncounterSource } from "@/types/encounters";

const readEnvVar = (key: "NODE_ENV" | "NEXT_PUBLIC_BUILD_ID") => {
  if (typeof process === "undefined") {
    return;
  }

  return process.env[key];
};

const isDevelopment = readEnvVar("NODE_ENV") === "development";

// Cache busting mechanism using build ID
export const getCacheBuster = () => {
  if (isDevelopment) {
    return Math.floor(Date.now() / (1 * 60 * 1000)); // Updates every minute
  }

  // Use Vercel commit SHA (exposed as NEXT_PUBLIC_BUILD_ID) or fallback
  return readEnvVar("NEXT_PUBLIC_BUILD_ID") || "v1";
};

const queryStore = createStore("query-client", "queries");

const idbStorage = {
  getItem: (key: string) => get(key, queryStore),
  removeItem: (key: string) => del(key, queryStore),
  setItem: (key: string, value: string) => set(key, value, queryStore),
};

const isPersistedQuery = (value: unknown): value is PersistedQuery => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as {
    buster?: unknown;
    queryHash?: unknown;
    queryKey?: unknown;
    state?: unknown;
  };

  return (
    typeof candidate.buster === "string" &&
    typeof candidate.queryHash === "string" &&
    Array.isArray(candidate.queryKey) &&
    typeof candidate.state === "object" &&
    candidate.state !== null
  );
};

const isRouteEncounters = (value: unknown): boolean =>
  Array.isArray(value) &&
  value.every(
    (route) =>
      typeof route === "object" &&
      route !== null &&
      typeof (route as { routeName?: unknown }).routeName === "string" &&
      Array.isArray((route as { pokemon?: unknown }).pokemon) &&
      (route as { pokemon: unknown[] }).pokemon.every((pokemon) => {
        if (typeof pokemon !== "object" || pokemon === null) {
          return false;
        }

        const { id, source } = pokemon as {
          id?: unknown;
          source?: unknown;
        };
        return (
          typeof id === "number" &&
          Number.isInteger(id) &&
          (id === -1 || id > 0) &&
          typeof source === "string" &&
          Object.values(EncounterSource).includes(source as EncounterSource)
        );
      }),
  );

const deserializePersistedQuery = (data: unknown): PersistedQuery => {
  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    if (isPersistedQuery(parsed) === false) {
      throw new Error("Invalid persisted query payload");
    }
    const persistedQuery = parsed;

    if (
      persistedQuery.queryKey[0] === "encounters" &&
      isRouteEncounters(persistedQuery.state.data) === false
    ) {
      throw new Error("Invalid persisted encounters query payload");
    }

    return persistedQuery;
  } catch {
    throw new Error("Invalid persisted query payload");
  }
};

export const queryPersister = experimental_createQueryPersister({
  buster: getCacheBuster().toString(),
  deserialize: deserializePersistedQuery,
  maxAge: isDevelopment
    ? 1000 * 60 * 5 // 5 minutes in dev
    : 1000 * 60 * 60 * 24 * 7, // 1 week in production
  prefix: "query:",
  serialize: JSON.stringify,
  storage: idbStorage,
});
