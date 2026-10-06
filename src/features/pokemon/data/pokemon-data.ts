import { getQueryClient } from "@/shared/query/query-client";
import { pokemonQueries } from "./pokemon-queries";

export const pokemonData = {
  getAllPokemon: () => getQueryClient().fetchQuery(pokemonQueries.all()),
  getPokemonById: (id: number) =>
    getQueryClient().fetchQuery(pokemonQueries.byId(id)),
  getPokemonByIds: (ids: number[]) =>
    getQueryClient().fetchQuery(pokemonQueries.byIds(ids)),
  getPokemonByType: (type: string) =>
    getQueryClient().fetchQuery(pokemonQueries.byType(type)),
};
