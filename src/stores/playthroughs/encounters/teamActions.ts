import { PokemonStatus } from "@/loaders/pokemon";
import { ensureActivePlaythroughWithEncounters } from "./shared";
import { markEncounterAsDeceased } from "./status";
import {
  findCanonicalLocationForUids,
  flipTeamMember,
  getTeamMemberUids,
  updatePokemonByUID,
  updateTeamMember,
} from "./team";

export const markTeamMemberAsDeceased = async (
  position: number,
): Promise<void> => {
  const uids = getTeamMemberUids(position);
  if (uids.length === 0) {
    return;
  }

  const hasFullFusionPair = uids.length === 2;
  const locationId = hasFullFusionPair
    ? findCanonicalLocationForUids(uids)
    : null;

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
  flipTeamMember(position);
};
