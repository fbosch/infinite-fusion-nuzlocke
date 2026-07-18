import { type PokemonOptionType, PokemonStatus } from "@/loaders/pokemon";

export type TeamPokemonSelection = {
  pokemon: PokemonOptionType;
  locationId: string;
};

export type TeamSelectionSlot = "head" | "body";

export type ExistingTeamMemberSelection = {
  isEmpty: boolean;
  headPokemon?: PokemonOptionType | null;
  bodyPokemon?: PokemonOptionType | null;
};

export type TeamMemberUsage = {
  headPokemonUid?: string;
  bodyPokemonUid?: string;
} | null;

export const getTeamSelectionNickname = (
  headPokemon: PokemonOptionType | null | undefined,
  bodyPokemon: PokemonOptionType | null | undefined,
) =>
  headPokemon?.nickname?.trim()
    ? headPokemon.nickname
    : bodyPokemon?.nickname?.trim()
      ? bodyPokemon.nickname
      : "";

export const getTeamNicknameUpdate = (
  headPokemon: PokemonOptionType | null | undefined,
  bodyPokemon: PokemonOptionType | null | undefined,
  nickname: string,
) => {
  const pokemon = headPokemon ?? bodyPokemon;

  if (!pokemon?.uid || nickname === pokemon.nickname) {
    return null;
  }

  return {
    uid: pokemon.uid,
    nickname: nickname === "" ? undefined : nickname,
  };
};

export const initializeExistingTeamMemberSelection = (
  existingTeamMember: ExistingTeamMemberSelection,
  findSelection: (uid: string) => TeamPokemonSelection | null,
) => {
  const selectedHead = existingTeamMember.headPokemon?.uid
    ? findSelection(existingTeamMember.headPokemon.uid)
    : null;
  const selectedBody = existingTeamMember.bodyPokemon?.uid
    ? findSelection(existingTeamMember.bodyPokemon.uid)
    : null;
  const nickname = getTeamSelectionNickname(
    selectedHead?.pokemon,
    selectedBody?.pokemon,
  );
  const hasHead = Boolean(existingTeamMember.headPokemon);
  const hasBody = Boolean(existingTeamMember.bodyPokemon);
  const suggestedActiveSlot: TeamSelectionSlot | null | undefined =
    hasHead && hasBody ? null : hasHead ? "body" : hasBody ? "head" : undefined;

  return {
    selectedHead,
    selectedBody,
    nickname,
    previewNickname: nickname,
    suggestedActiveSlot,
  };
};

export const filterAvailableTeamPokemon = (
  allPokemon: TeamPokemonSelection[],
  teamMembers: TeamMemberUsage[],
  position: number,
  existingTeamMember: ExistingTeamMemberSelection | null | undefined,
) => {
  const usedPokemonUids = new Set<string>();

  teamMembers.forEach((member, index) => {
    if (index === position || !member) return;

    if (member.headPokemonUid) usedPokemonUids.add(member.headPokemonUid);
    if (member.bodyPokemonUid) usedPokemonUids.add(member.bodyPokemonUid);
  });

  if (!existingTeamMember?.isEmpty) {
    if (existingTeamMember?.headPokemon?.uid) {
      usedPokemonUids.delete(existingTeamMember.headPokemon.uid);
    }
    if (existingTeamMember?.bodyPokemon?.uid) {
      usedPokemonUids.delete(existingTeamMember.bodyPokemon.uid);
    }
  }

  return allPokemon.filter(
    ({ pokemon }) =>
      pokemon.status &&
      pokemon.status !== PokemonStatus.MISSED &&
      pokemon.status !== PokemonStatus.DECEASED &&
      pokemon.uid &&
      !usedPokemonUids.has(pokemon.uid),
  );
};

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
