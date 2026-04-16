import { PokemonStatus } from "@/loaders/pokemon";
import { flipEncounterFusion } from "./fusion";
import { ensureActivePlaythroughWithEncounters } from "./shared";
import { markEncounterAsDeceased } from "./status";
import { updatePokemonByUID, updateTeamMember } from "./team";

const getTeamMemberUids = (position: number) => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough?.team) {
    return [] as string[];
  }

  if (position < 0 || position >= activePlaythrough.team.members.length) {
    return [] as string[];
  }

  const member = activePlaythrough.team.members[position];
  if (!member) {
    return [] as string[];
  }

  return [member.headPokemonUid, member.bodyPokemonUid].filter(
    (uid) => uid !== "",
  );
};

const findCanonicalLocationForUids = (uids: string[]) => {
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

export const markTeamMemberAsDeceased = async (
  position: number,
): Promise<void> => {
  const uids = getTeamMemberUids(position);
  if (uids.length === 0) {
    return;
  }

  const locationId = findCanonicalLocationForUids(uids);
  if (locationId) {
    await markEncounterAsDeceased(locationId);
  } else {
    for (const uid of uids) {
      await updatePokemonByUID(uid, { status: PokemonStatus.DECEASED });
    }
  }

  await updateTeamMember(position, null, null);
};

export const flipTeamMemberFusion = async (position: number): Promise<void> => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough?.team) {
    return;
  }

  if (position < 0 || position >= activePlaythrough.team.members.length) {
    return;
  }

  const member = activePlaythrough.team.members[position];
  if (!member?.headPokemonUid || !member.bodyPokemonUid) {
    return;
  }

  const locationId = findCanonicalLocationForUids([
    member.headPokemonUid,
    member.bodyPokemonUid,
  ]);

  if (locationId) {
    await flipEncounterFusion(locationId);
  }

  await updateTeamMember(
    position,
    { uid: member.bodyPokemonUid },
    { uid: member.headPokemonUid },
  );
};
