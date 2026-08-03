import { queryClient } from "./client";
import { encountersQueries } from "./queries/encounters";
import { pokemonQueries } from "./queries/pokemon";

// Utility functions for fetching data outside of React components
export const pokemonData = {
  getAllPokemon: () => queryClient.fetchQuery(pokemonQueries.all()),
  getPokemonById: (id: number) =>
    queryClient.fetchQuery(pokemonQueries.byId(id)),
  getPokemonByIds: (ids: number[]) =>
    queryClient.fetchQuery(pokemonQueries.byIds(ids)),
  getPokemonByType: (type: string) =>
    queryClient.fetchQuery(pokemonQueries.byType(type)),
};

export const encountersData = {
  getAllEncounters: (gameMode: "classic" | "remix") =>
    queryClient.fetchQuery(encountersQueries.all(gameMode)),
};
