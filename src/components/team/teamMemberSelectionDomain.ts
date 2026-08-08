import { type PokemonOptionType, PokemonStatus } from "@/loaders/pokemon";

export interface TeamPokemonSelection {
  locationId: string;
  pokemon: PokemonOptionType;
}

export type TeamSelectionSlot = "head" | "body";

export interface ExistingTeamMemberSelection {
  bodyPokemon?: PokemonOptionType | null;
  headPokemon?: PokemonOptionType | null;
  isEmpty: boolean;
}

export type TeamMemberUsage = {
  headPokemonUid?: string;
  bodyPokemonUid?: string;
} | null;

export const getTeamSelectionNickname = (
  headPokemon: PokemonOptionType | null | undefined,
  bodyPokemon: PokemonOptionType | null | undefined,
) => {
  if (headPokemon?.nickname?.trim()) {
    return headPokemon.nickname;
  }

  if (bodyPokemon?.nickname?.trim()) {
    return bodyPokemon.nickname;
  }

  return "";
};

export const flipTeamPokemonSelection = (
  selectedHead: TeamPokemonSelection | null,
  selectedBody: TeamPokemonSelection | null,
) => {
  const nickname =
    (selectedBody === null ? undefined : selectedBody.pokemon.nickname) ||
    (selectedHead === null ? undefined : selectedHead.pokemon.nickname) ||
    "";

  return {
    nickname,
    previewNickname: nickname,
    selectedBody: selectedHead,
    selectedHead: selectedBody,
  };
};

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
    nickname: nickname === "" ? undefined : nickname,
    uid: pokemon.uid,
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
  let suggestedActiveSlot: TeamSelectionSlot | null | undefined;

  if (hasHead && hasBody) {
    suggestedActiveSlot = null;
  } else if (hasHead) {
    suggestedActiveSlot = "body";
  } else if (hasBody) {
    suggestedActiveSlot = "head";
  }

  return {
    nickname,
    previewNickname: nickname,
    selectedBody,
    selectedHead,
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
    if (index === position || !member) {
      return;
    }

    if (member.headPokemonUid) {
      usedPokemonUids.add(member.headPokemonUid);
    }
    if (member.bodyPokemonUid) {
      usedPokemonUids.add(member.bodyPokemonUid);
    }
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
  if (selectedHead !== null && selectedHead.pokemon.uid === pokemon.uid) {
    return {
      activeSlot: "head" as const,
      nickname: "",
      previewNickname: "",
      selectedBody,
      selectedHead: null,
    };
  }

  if (selectedBody !== null && selectedBody.pokemon.uid === pokemon.uid) {
    return {
      activeSlot: "body" as const,
      nickname: "",
      previewNickname: "",
      selectedBody: null,
      selectedHead,
    };
  }

  if (activeSlot === "head") {
    const nextSelectedHead = { locationId, pokemon };
    const selectionNickname = getTeamSelectionNickname(
      pokemon,
      selectedBody?.pokemon,
    );

    return {
      activeSlot: selectedBody ? activeSlot : ("body" as const),
      nickname: selectionNickname,
      previewNickname: selectionNickname,
      selectedBody,
      selectedHead: nextSelectedHead,
    };
  }

  if (activeSlot === "body") {
    const nextSelectedBody = { locationId, pokemon };
    const selectionNickname = getTeamSelectionNickname(
      selectedHead?.pokemon,
      pokemon,
    );

    return {
      activeSlot: "body" as const,
      nickname: selectionNickname,
      previewNickname: selectionNickname,
      selectedBody: nextSelectedBody,
      selectedHead,
    };
  }

  return {
    activeSlot,
    nickname,
    previewNickname,
    selectedBody,
    selectedHead,
  };
};
