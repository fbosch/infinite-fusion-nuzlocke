import {
  experimental_createQueryPersister,
  type PersistedQuery,
} from "@tanstack/query-persist-client-core";
import { createStore, del, get, set } from "idb-keyval";
import { z } from "zod";

const readEnvVar = (key: "NODE_ENV" | "NEXT_PUBLIC_BUILD_ID") => {
  if (typeof process === "undefined") {
    return undefined;
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
  setItem: (key: string, value: string) => set(key, value, queryStore),
  removeItem: (key: string) => del(key, queryStore),
};

const PersistedQuerySchema = z.custom<PersistedQuery>((value) => {
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
});

const deserializePersistedQuery = (data: unknown): PersistedQuery => {
  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    return PersistedQuerySchema.parse(parsed);
  } catch {
    throw new Error("Invalid persisted query payload");
  }
};

export const queryPersister = experimental_createQueryPersister({
  storage: idbStorage,
  prefix: `query:`,
  buster: getCacheBuster().toString(),
  deserialize: deserializePersistedQuery,
  serialize: JSON.stringify,
  maxAge: isDevelopment
    ? 1000 * 60 * 5 // 5 minutes in dev
    : 1000 * 60 * 60 * 24 * 7, // 1 week in production
});
