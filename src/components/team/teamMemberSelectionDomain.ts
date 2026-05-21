import type { PokemonOptionType } from "@/loaders/pokemon";

export type TeamPokemonSelection = {
  pokemon: PokemonOptionType;
  locationId: string;
};

export type TeamSelectionSlot = "head" | "body";

export const getTeamSelectionNickname = (
  headPokemon: PokemonOptionType | null | undefined,
  bodyPokemon: PokemonOptionType | null | undefined,
) =>
  headPokemon?.nickname?.trim()
    ? headPokemon.nickname
    : bodyPokemon?.nickname?.trim()
      ? bodyPokemon.nickname
      : "";

export const selectTeamPokemon = ({
  selectedHead,
  selectedBody,
  activeSlot,
  pokemon,
  locationId,
  nickname,
  previewNickname,
}: {
  selectedHead: TeamPokemonSelection | null;
  selectedBody: TeamPokemonSelection | null;
  activeSlot: TeamSelectionSlot | null;
  pokemon: PokemonOptionType;
  locationId: string;
  nickname: string;
  previewNickname: string;
}) => {
  if (selectedHead?.pokemon.uid === pokemon.uid) {
    return {
      selectedHead: null,
      selectedBody,
      activeSlot: "head" as const,
      nickname: "",
      previewNickname: "",
    };
  }

  if (selectedBody?.pokemon.uid === pokemon.uid) {
    return {
      selectedHead,
      selectedBody: null,
      activeSlot: "body" as const,
      nickname: "",
      previewNickname: "",
    };
  }

  if (activeSlot === "head") {
    const nextSelectedHead = { pokemon, locationId };
    const nickname = getTeamSelectionNickname(pokemon, selectedBody?.pokemon);

    return {
      selectedHead: nextSelectedHead,
      selectedBody,
      activeSlot: selectedBody ? activeSlot : ("body" as const),
      nickname,
      previewNickname: nickname,
    };
  }

  if (activeSlot === "body") {
    const nextSelectedBody = { pokemon, locationId };
    const nickname = getTeamSelectionNickname(selectedHead?.pokemon, pokemon);

    return {
      selectedHead,
      selectedBody: nextSelectedBody,
      activeSlot: "body" as const,
      nickname,
      previewNickname: nickname,
    };
  }

  return {
    selectedHead,
    selectedBody,
    activeSlot,
    nickname,
    previewNickname,
  };
};
