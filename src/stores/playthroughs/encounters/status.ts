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
  await updateEncounterStatus(locationId, PokemonStatus.DECEASED);
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
