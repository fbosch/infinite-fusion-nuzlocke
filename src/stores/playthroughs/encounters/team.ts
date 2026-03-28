import type { z } from "zod";
import { type PokemonOptionSchema, PokemonStatus } from "@/loaders/pokemon";
import { getActivePlaythrough, getCurrentTimestamp } from "../store";
import type { EncounterData } from "../types";

// Update a Pokemon's properties by UID across all encounters
export const updatePokemonByUID = async (
  pokemonUID: string,
  updates: Partial<z.infer<typeof PokemonOptionSchema>>,
) => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough?.encounters) {
    return;
  }

  for (const encounter of Object.values(activePlaythrough.encounters)) {
    if (encounter.head?.uid === pokemonUID) {
      encounter.head = { ...encounter.head, ...updates };
      encounter.updatedAt = getCurrentTimestamp();
    }
    if (encounter.body?.uid === pokemonUID) {
      encounter.body = { ...encounter.body, ...updates };
      encounter.updatedAt = getCurrentTimestamp();
    }
  }

  activePlaythrough.updatedAt = getCurrentTimestamp();
};

const shouldAutoAssign = (status: string | undefined) =>
  status === PokemonStatus.CAPTURED ||
  status === PokemonStatus.RECEIVED ||
  status === PokemonStatus.TRADED;

export const autoAssignCapturedPokemonToTeam = async (
  locationId: string,
): Promise<void> => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough?.team || !activePlaythrough.encounters) {
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

  // Dynamic import intentionally retained to avoid encounter/store circular dependencies.
  const { updateTeamMember } = await import("../store");

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

export const removeTeamMembersWithPokemon = (pokemonUIDs: string[]) => {
  const activePlaythrough = getActivePlaythrough();
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
    activePlaythrough.updatedAt = getCurrentTimestamp();
  }
};

export const moveTeamMemberToBox = async (position: number): Promise<void> => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough?.team) {
    return;
  }

  if (position < 0 || position >= 6) {
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
  activePlaythrough.updatedAt = getCurrentTimestamp();
};

export const restorePokemonToTeam = async (
  pokemonUID: string,
): Promise<void> => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough?.encounters) {
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
