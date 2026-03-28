import {
  EncounterSource,
  type RouteEncounterPokemon,
} from "@/loaders/encounters";
import { type PokemonOptionType, PokemonStatus } from "@/loaders/pokemon";

export const getPokemonSources = (
  routeEncounterData: RouteEncounterPokemon[],
  pokemonId: number,
): EncounterSource[] => {
  const pokemonData = routeEncounterData.find(
    (pokemon) => pokemon.id === pokemonId,
  );
  return pokemonData?.sources || [];
};

export const applyEncounterDefaultStatus = (
  pokemon: PokemonOptionType,
  sources: EncounterSource[],
): PokemonOptionType => {
  if (sources.includes(EncounterSource.GIFT)) {
    if (pokemon.status === PokemonStatus.RECEIVED) return pokemon;
    return {
      ...pokemon,
      status: PokemonStatus.RECEIVED,
    };
  }

  if (sources.includes(EncounterSource.TRADE)) {
    if (pokemon.status === PokemonStatus.TRADED) return pokemon;
    return {
      ...pokemon,
      status: PokemonStatus.TRADED,
    };
  }

  return pokemon;
};
