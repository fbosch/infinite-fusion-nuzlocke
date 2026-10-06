import { getQueryClient } from "@/shared/query/query-client";
import { encountersQueries } from "./encounters-queries";

// Utility functions for fetching data outside of React components
export const encountersData = {
  getAllEncounters: (gameMode: "classic" | "remix") =>
    getQueryClient().fetchQuery(encountersQueries.all(gameMode)),
};
