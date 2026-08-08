import { queryOptions } from "@tanstack/react-query";
import ms from "ms";
import encountersApiService from "@/services/encountersApiService";

// Encounters query options
export const encountersQueries = {
  all: (gameMode: "classic" | "remix") =>
    queryOptions({
      enabled: !!gameMode,
      gcTime: process.env.NODE_ENV === "development" ? 0 : ms("2h"),
      queryFn: () => encountersApiService.getEncounters(gameMode),
      queryKey: ["encounters", "all", gameMode],
      staleTime: process.env.NODE_ENV === "development" ? 0 : ms("1h"),
    }),
};

// Encounters query keys
const encountersKeys = {
  all: ["encounters"] as const,
  list: (gameMode: "classic" | "remix") =>
    [...encountersKeys.lists(), gameMode] as const,
  lists: () => [...encountersKeys.all, "list"] as const,
};
