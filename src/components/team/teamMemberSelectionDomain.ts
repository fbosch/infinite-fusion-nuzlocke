import type { PokemonOptionType } from "@/loaders/pokemon";

export const getTeamSelectionNickname = (
  headPokemon: PokemonOptionType | null | undefined,
  bodyPokemon: PokemonOptionType | null | undefined,
) =>
  headPokemon?.nickname?.trim()
    ? headPokemon.nickname
    : bodyPokemon?.nickname?.trim()
      ? bodyPokemon.nickname
      : "";
