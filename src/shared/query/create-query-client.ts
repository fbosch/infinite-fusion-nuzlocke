import { QueryClient, type QueryClientConfig } from "@tanstack/react-query";
import ms from "ms";

type QueryPersister = NonNullable<
  NonNullable<QueryClientConfig["defaultOptions"]>["queries"]
>["persister"];

export function createQueryClient(persister?: QueryPersister) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: ms("30m"), // Increased for better UX
        persister: process.env.NODE_ENV === "test" ? undefined : persister,
        refetchOnReconnect: "always",
        // Network-first in dev, cache-first in prod for better DX
        refetchOnWindowFocus: process.env.NODE_ENV === "production",
        retry: 2,
        retryDelay: (attemptIndex) =>
          Math.min(1000 * 2 ** attemptIndex, 30_000),
        // Conservative default - most data changes occasionally
        staleTime: ms("5m"),
      },
    },
  });
}
