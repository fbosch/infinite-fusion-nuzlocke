import {
  getSharedEventProperties,
  getTeamSizeAfter,
  getViableRosterSize,
  toViableRosterBucket,
} from "@/lib/analytics/playthroughEventData";
import { trackEvent } from "@/lib/analytics/trackEvent";
import { PokemonStatus } from "@/loaders/pokemon";
import { updateEncounter } from "./crud";
import { ensureActivePlaythroughWithEncounters } from "./shared";
import { autoAssignCapturedPokemonToTeam } from "./team";

/**
 * Update both Pokemon in an encounter to the specified status
 */
const updateEncounterStatus = async (
  locationId: string,
  status: (typeof PokemonStatus)[keyof typeof PokemonStatus],
): Promise<void> => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough) {
    return;
  }

  const encounter = activePlaythrough.encounters[locationId];
  if (!encounter) {
    return;
  }

  if (encounter.head) {
    const updatedHead = {
      ...encounter.head,
      status,
    };
    await updateEncounter(locationId, updatedHead, "head", false);
  }

  if (encounter.body) {
    const updatedBody = {
      ...encounter.body,
      status,
    };
    await updateEncounter(locationId, updatedBody, "body", false);
  }
};

/**
 * Mark both Pokemon in an encounter as deceased
 */
export const markEncounterAsDeceased = async (
  locationId: string,
): Promise<void> => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough) {
    return;
  }

  const encounterBefore = activePlaythrough.encounters[locationId];
  if (!encounterBefore) {
    return;
  }

  const hasPokemonBefore = Boolean(
    encounterBefore.head || encounterBefore.body,
  );
  const alreadyDeceased =
    hasPokemonBefore &&
    [encounterBefore.head, encounterBefore.body]
      .filter((pokemon) => pokemon != null)
      .every((pokemon) => pokemon.status === PokemonStatus.DECEASED);

  if (alreadyDeceased) {
    return;
  }

  const wasFused = Boolean(
    encounterBefore.isFusion && encounterBefore.head && encounterBefore.body,
  );

  await updateEncounterStatus(locationId, PokemonStatus.DECEASED);

  const encounterAfter = activePlaythrough.encounters[locationId];
  if (!encounterAfter) {
    return;
  }

  const nowDeceased = [encounterAfter.head, encounterAfter.body]
    .filter((pokemon) => pokemon != null)
    .every((pokemon) => pokemon.status === PokemonStatus.DECEASED);

  if (!nowDeceased) {
    return;
  }

  trackEvent("encounter_marked_deceased", {
    ...getSharedEventProperties(activePlaythrough),
    location_id: locationId,
    was_fused: wasFused,
    team_size_after: getTeamSizeAfter(activePlaythrough),
    viable_roster_bucket_after: toViableRosterBucket(
      getViableRosterSize(activePlaythrough),
    ),
  });
};

/**
 * Move both Pokemon in an encounter to box (stored status)
 */
export const moveEncounterToBox = async (locationId: string): Promise<void> => {
  await updateEncounterStatus(locationId, PokemonStatus.STORED);
};

/**
 * Mark both Pokemon in an encounter as captured
 *
 * Auto-assigns captured Pokemon to available team slots for new playthroughs
 */
export const markEncounterAsCaptured = async (
  locationId: string,
): Promise<void> => {
  await updateEncounterStatus(locationId, PokemonStatus.CAPTURED);
  await autoAssignCapturedPokemonToTeam(locationId);
};

/**
 * Mark both Pokemon in an encounter as missed
 */
export const markEncounterAsMissed = async (
  locationId: string,
): Promise<void> => {
  await updateEncounterStatus(locationId, PokemonStatus.MISSED);
};

/**
 * Mark both Pokemon in an encounter as received
 *
 * Auto-assigns received Pokemon to available team slots for new playthroughs
 */
export const markEncounterAsReceived = async (
  locationId: string,
): Promise<void> => {
  await updateEncounterStatus(locationId, PokemonStatus.RECEIVED);
  await autoAssignCapturedPokemonToTeam(locationId);
};
