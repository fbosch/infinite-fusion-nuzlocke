import type { QueryClient } from "@tanstack/react-query";
import { createQueryClient } from "./create-query-client";

let queryClient: QueryClient | undefined;

export function configureQueryClient(client: QueryClient): void {
  queryClient = client;
}

export function getQueryClient(): QueryClient {
  queryClient ??= createQueryClient();
  return queryClient;
}
