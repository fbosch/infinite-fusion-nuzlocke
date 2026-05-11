import type { z } from "zod";
import { type PokemonOptionSchema, PokemonStatus } from "@/loaders/pokemon";
import type { EncounterData } from "../types";
import { ensureActivePlaythroughWithEncounters } from "./shared";

const TEAM_SIZE = 6;

const isValidTeamPosition = (position: number) =>
  position >= 0 && position < TEAM_SIZE;

// Update a Pokemon's properties by UID across all encounters
export const updatePokemonByUID = async (
  pokemonUID: string,
  updates: Partial<z.infer<typeof PokemonOptionSchema>>,
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
};

const shouldAutoAssign = (status: string | undefined) =>
  status === PokemonStatus.CAPTURED ||
  status === PokemonStatus.RECEIVED ||
  status === PokemonStatus.TRADED;

const createTeamMember = (
  head: { uid: string } | null,
  body: { uid: string } | null,
) => {
  if (!head && !body) {
    return null;
  }

  return {
    headPokemonUid: head?.uid || "",
    bodyPokemonUid: body?.uid || "",
  };
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

  if (headPokemon?.uid) {
    await restorePokemonToTeam(headPokemon.uid);
  }

  if (bodyPokemon?.uid) {
    await restorePokemonToTeam(bodyPokemon.uid);
  }

  activePlaythrough.team.members[position] = createTeamMember(
    headPokemon,
    bodyPokemon,
  );
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

  const availablePositions = activePlaythrough.team.members
    .map((member, index) => ({ member, index }))
    .filter(({ member }) => member === null)
    .map(({ index }) => index);

  if (availablePositions.length === 0) {
    return;
  }

  const nextAvailablePosition = availablePositions[0];

  let headPokemon: { uid: string } | null = null;
  let bodyPokemon: { uid: string } | null = null;

  const headUid = encounter.head?.uid;
  if (
    encounter.head?.status &&
    shouldAutoAssign(encounter.head.status) &&
    headUid
  ) {
    headPokemon = { uid: headUid };
  }

  const bodyUid = encounter.body?.uid;
  if (
    encounter.body?.status &&
    shouldAutoAssign(encounter.body.status) &&
    bodyUid
  ) {
    bodyPokemon = { uid: bodyUid };
  }

  if (!headPokemon && !bodyPokemon) {
    return;
  }

  let targetPosition = nextAvailablePosition;

  if (headPokemon || bodyPokemon) {
    for (let i = 0; i < activePlaythrough.team.members.length; i++) {
      const member = activePlaythrough.team.members[i];
      if (!member) {
        continue;
      }

      if (
        (headPokemon && member.headPokemonUid === headPokemon.uid) ||
        (bodyPokemon && member.bodyPokemonUid === bodyPokemon.uid) ||
        (headPokemon && member.bodyPokemonUid === headPokemon.uid) ||
        (bodyPokemon && member.headPokemonUid === bodyPokemon.uid)
      ) {
        targetPosition = i;
        break;
      }
    }
  }

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
      const encounterUids = [encounter.head?.uid, encounter.body?.uid].filter(
        (uid) => uid != null,
      );

      return uids.every((uid) => encounterUids.includes(uid));
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

  let hasChanges = false;

  for (let i = 0; i < activePlaythrough.team.members.length; i++) {
    const member = activePlaythrough.team.members[i];
    if (!member) {
      continue;
    }

    const hasRemovedPokemon =
      (member.headPokemonUid && pokemonUIDs.includes(member.headPokemonUid)) ||
      (member.bodyPokemonUid && pokemonUIDs.includes(member.bodyPokemonUid));

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

  if (teamMember.headPokemonUid) {
    const headPokemon = findPokemonByUID(
      activePlaythrough.encounters,
      teamMember.headPokemonUid,
    );

    if (headPokemon) {
      const updates: Partial<z.infer<typeof PokemonOptionSchema>> = {
        status: PokemonStatus.STORED,
      };

      if (
        !headPokemon.originalReceivalStatus &&
        (headPokemon.status === PokemonStatus.CAPTURED ||
          headPokemon.status === PokemonStatus.RECEIVED ||
          headPokemon.status === PokemonStatus.TRADED)
      ) {
        updates.originalReceivalStatus = headPokemon.status;
      }

      await updatePokemonByUID(teamMember.headPokemonUid, updates);
    }
  }

  if (teamMember.bodyPokemonUid) {
    const bodyPokemon = findPokemonByUID(
      activePlaythrough.encounters,
      teamMember.bodyPokemonUid,
    );

    if (bodyPokemon) {
      const updates: Partial<z.infer<typeof PokemonOptionSchema>> = {
        status: PokemonStatus.STORED,
      };

      if (
        !bodyPokemon.originalReceivalStatus &&
        (bodyPokemon.status === PokemonStatus.CAPTURED ||
          bodyPokemon.status === PokemonStatus.RECEIVED ||
          bodyPokemon.status === PokemonStatus.TRADED)
      ) {
        updates.originalReceivalStatus = bodyPokemon.status;
      }

      await updatePokemonByUID(teamMember.bodyPokemonUid, updates);
    }
  }

  activePlaythrough.team.members[position] = null;
  activePlaythrough.updatedAt = Date.now();
};

export const restorePokemonToTeam = async (
  pokemonUID: string,
): Promise<void> => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough) {
    return;
  }

  const pokemon = findPokemonByUID(activePlaythrough.encounters, pokemonUID);
  if (!pokemon) {
    return;
  }

  if (pokemon.status === PokemonStatus.STORED) {
    const statusToRestore =
      pokemon.originalReceivalStatus || PokemonStatus.CAPTURED;

    await updatePokemonByUID(pokemonUID, {
      status: statusToRestore,
    });
  }
};
