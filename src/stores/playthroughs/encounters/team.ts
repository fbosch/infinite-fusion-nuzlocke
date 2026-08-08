import { type PokemonOptionType, PokemonStatus } from "@/loaders/pokemon";
import { getAvailableTeamPositionsForMembers } from "../teamPositions";
import type { EncounterData } from "../types";
import { ensureActivePlaythroughWithEncounters } from "./shared";

const TEAM_SIZE = 6;

const isValidTeamPosition = (position: number) =>
  position >= 0 && position < TEAM_SIZE;

// Update a Pokemon's properties by UID across all encounters
export const updatePokemonByUID = async (
  pokemonUID: string,
  updates: Partial<PokemonOptionType>,
) => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough) {
    return;
  }

  for (const encounter of Object.values(activePlaythrough.encounters)) {
    if (encounter.head?.uid === pokemonUID) {
      encounter.head = { ...encounter.head, ...updates };
      encounter.updatedAt = Date.now();
    }
    if (encounter.body?.uid === pokemonUID) {
      encounter.body = { ...encounter.body, ...updates };
      encounter.updatedAt = Date.now();
    }
  }

  activePlaythrough.updatedAt = Date.now();

  await Promise.resolve();
};

const shouldAutoAssign = (status: string | undefined) =>
  status === PokemonStatus.CAPTURED ||
  status === PokemonStatus.RECEIVED ||
  status === PokemonStatus.TRADED;

const createTeamMember = (
  head: { uid: string } | null,
  body: { uid: string } | null,
) => {
  if (!(head || body)) {
    return null;
  }

  return {
    bodyPokemonUid: body?.uid || "",
    headPokemonUid: head?.uid || "",
  };
};

const getAutoAssignablePokemon = (pokemon: {
  uid?: string;
  status?: string;
}) => {
  if (!(pokemon.uid && shouldAutoAssign(pokemon.status))) {
    return null;
  }

  return { uid: pokemon.uid };
};

const findTeamMemberPosition = (
  members: ReadonlyArray<{
    headPokemonUid: string;
    bodyPokemonUid: string;
  } | null>,
  pokemon: ReadonlyArray<{ uid: string } | null>,
) => {
  const pokemonUids = new Set(
    pokemon.flatMap((teamPokemon) => (teamPokemon ? [teamPokemon.uid] : [])),
  );

  return members.findIndex(
    (member) =>
      member &&
      (pokemonUids.has(member.headPokemonUid) ||
        pokemonUids.has(member.bodyPokemonUid)),
  );
};

export const updateTeamMember = async (
  position: number,
  headPokemon: { uid: string } | null,
  bodyPokemon: { uid: string } | null,
): Promise<boolean> => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough) {
    return false;
  }

  if (!isValidTeamPosition(position)) {
    return false;
  }

  restorePokemonToTeamMembers([headPokemon?.uid || "", bodyPokemon?.uid || ""]);

  activePlaythrough.team.members[position] = createTeamMember(
    headPokemon,
    bodyPokemon,
  );
  activePlaythrough.updatedAt = Date.now();

  await Promise.resolve();

  return true;
};

export const flipTeamMember = (position: number): boolean => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!(activePlaythrough && isValidTeamPosition(position))) {
    return false;
  }

  const member = activePlaythrough.team.members[position];
  if (!(member?.headPokemonUid && member.bodyPokemonUid)) {
    return false;
  }

  activePlaythrough.team.members[position] = {
    bodyPokemonUid: member.headPokemonUid,
    headPokemonUid: member.bodyPokemonUid,
  };
  activePlaythrough.updatedAt = Date.now();

  return true;
};

export const autoAssignCapturedPokemonToTeam = async (
  locationId: string,
): Promise<void> => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough?.team) {
    return;
  }

  const encounter = activePlaythrough.encounters[locationId];
  if (!encounter) {
    return;
  }

  const headPokemon = getAutoAssignablePokemon(encounter.head ?? {});
  const bodyPokemon = getAutoAssignablePokemon(encounter.body ?? {});

  if (!(headPokemon || bodyPokemon)) {
    return;
  }

  const existingPosition = findTeamMemberPosition(
    activePlaythrough.team.members,
    [headPokemon, bodyPokemon],
  );
  const availablePositions = getAvailableTeamPositionsForMembers(
    activePlaythrough.team.members,
  );

  if (existingPosition === -1 && availablePositions.length === 0) {
    return;
  }

  const [nextAvailablePosition] = availablePositions;
  const targetPosition =
    existingPosition === -1 ? nextAvailablePosition : existingPosition;

  const success = await updateTeamMember(
    targetPosition,
    headPokemon,
    bodyPokemon,
  );

  if (success === false) {
    console.error(
      `Failed to auto-assign Pokemon from ${locationId} to team slot ${targetPosition + 1}`,
    );
  }
};

const findPokemonByUID = (
  encounters: Record<string, EncounterData> | undefined,
  uid: string,
) => {
  if (!encounters) {
    return null;
  }

  for (const encounter of Object.values(encounters)) {
    if (encounter?.head?.uid === uid) {
      return encounter.head;
    }

    if (encounter?.body?.uid === uid) {
      return encounter.body;
    }
  }

  return null;
};

const movePokemonToBox = async (
  encounters: Record<string, EncounterData>,
  pokemonUID: string,
) => {
  if (!pokemonUID) {
    return;
  }

  const pokemon = findPokemonByUID(encounters, pokemonUID);
  if (!pokemon) {
    return;
  }

  const updates: Partial<PokemonOptionType> = {
    status: PokemonStatus.STORED,
  };

  if (
    !pokemon.originalReceivalStatus &&
    (pokemon.status === PokemonStatus.CAPTURED ||
      pokemon.status === PokemonStatus.RECEIVED ||
      pokemon.status === PokemonStatus.TRADED)
  ) {
    updates.originalReceivalStatus = pokemon.status;
  }

  await updatePokemonByUID(pokemonUID, updates);
};

export const getTeamMemberUids = (position: number): string[] => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough?.team) {
    return [];
  }

  if (!isValidTeamPosition(position)) {
    return [];
  }

  const member = activePlaythrough.team.members[position];
  if (!member) {
    return [];
  }

  return [member.headPokemonUid, member.bodyPokemonUid].filter(
    (uid) => uid !== "",
  );
};

export const findCanonicalLocationForUids = (uids: string[]) => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough || uids.length === 0) {
    return null;
  }

  const matches = Object.entries(activePlaythrough.encounters).filter(
    ([, encounter]) => {
      const encounterUids = new Set(
        [encounter.head?.uid, encounter.body?.uid].filter(
          (uid): uid is string => uid !== null,
        ),
      );

      return uids.every((uid) => encounterUids.has(uid));
    },
  );

  if (matches.length !== 1) {
    return null;
  }

  return matches[0][0];
};

export const removeTeamMembersWithPokemon = (pokemonUIDs: string[]) => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough?.team || pokemonUIDs.length === 0) {
    return;
  }

  const removedPokemonUids = new Set(pokemonUIDs);
  let hasChanges = false;

  for (let i = 0; i < activePlaythrough.team.members.length; i += 1) {
    const member = activePlaythrough.team.members[i];
    if (!member) {
      continue;
    }

    const hasRemovedPokemon =
      (member.headPokemonUid &&
        removedPokemonUids.has(member.headPokemonUid)) ||
      (member.bodyPokemonUid && removedPokemonUids.has(member.bodyPokemonUid));

    if (hasRemovedPokemon) {
      activePlaythrough.team.members[i] = null;
      hasChanges = true;
    }
  }

  if (hasChanges) {
    activePlaythrough.updatedAt = Date.now();
  }
};

export const moveTeamMemberToBox = async (position: number): Promise<void> => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough?.team) {
    return;
  }

  if (!isValidTeamPosition(position)) {
    return;
  }

  const teamMember = activePlaythrough.team.members[position];
  if (!teamMember) {
    return;
  }

  await movePokemonToBox(
    activePlaythrough.encounters,
    teamMember.headPokemonUid,
  );
  await movePokemonToBox(
    activePlaythrough.encounters,
    teamMember.bodyPokemonUid,
  );

  activePlaythrough.team.members[position] = null;
  activePlaythrough.updatedAt = Date.now();
};

const restorePokemonToTeamMembers = (pokemonUIDs: string[]) => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  const uidsToRestore = new Set(pokemonUIDs.filter(Boolean));
  if (!activePlaythrough || uidsToRestore.size === 0) {
    return;
  }

  let hasChanges = false;

  for (const encounter of Object.values(activePlaythrough.encounters)) {
    const restoredHead = restoreStoredPokemon(encounter.head, uidsToRestore);
    const restoredBody = restoreStoredPokemon(encounter.body, uidsToRestore);
    if (restoredHead || restoredBody) {
      encounter.head = restoredHead ?? encounter.head;
      encounter.body = restoredBody ?? encounter.body;
      encounter.updatedAt = Date.now();
      hasChanges = true;
    }
  }

  if (hasChanges) {
    activePlaythrough.updatedAt = Date.now();
  }
};

const restoreStoredPokemon = <
  Pokemon extends {
    uid?: string;
    status?: string;
    originalReceivalStatus?: string;
  },
>(
  pokemon: Pokemon | null,
  uidsToRestore: ReadonlySet<string>,
): Pokemon | null => {
  if (
    !(pokemon?.uid && uidsToRestore.has(pokemon.uid)) ||
    pokemon.status !== PokemonStatus.STORED
  ) {
    return null;
  }

  return {
    ...pokemon,
    status: pokemon.originalReceivalStatus || PokemonStatus.CAPTURED,
  };
};

export const restorePokemonToTeam = async (
  pokemonUID: string,
): Promise<void> => {
  restorePokemonToTeamMembers([pokemonUID]);
  await Promise.resolve();
};
