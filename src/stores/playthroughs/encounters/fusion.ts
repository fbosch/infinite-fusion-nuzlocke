import { getEncounterCount } from "@/lib/analytics/playthroughEventData";
import { getSharedEventProperties } from "@/lib/analytics/selectors";
import { trackEvent } from "@/lib/analytics/trackEvent";
import { emitEvolutionEvent } from "@/lib/events";
import { getCurrentTimestamp } from "../playthroughState";
import {
  createPokemonWithLocationAndUID,
  ensureActivePlaythroughWithEncounters,
  getFusionSpriteIdFromEncounter,
  type PokemonOption,
} from "./shared";
import {
  autoAssignCapturedPokemonToTeam,
  removeTeamMembersWithPokemon,
  updateTeamMember,
} from "./team";
import { trackEncounterProgress, trackFusionCreatedIfNew } from "./transition";

// Toggle fusion mode for an encounter
export const toggleEncounterFusion = async (locationId: string) => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough) {
    return;
  }

  const currentEncounter = activePlaythrough.encounters[locationId];
  const existingEncounter = currentEncounter || {
    head: null,
    body: null,
    isFusion: false,
    updatedAt: getCurrentTimestamp(),
  };

  const newIsFusion = !existingEncounter.isFusion;

  if (existingEncounter.isFusion && newIsFusion === false) {
    if (!existingEncounter.head && existingEncounter.body) {
      activePlaythrough.encounters[locationId] = {
        head: existingEncounter.body,
        body: null,
        isFusion: false,
        updatedAt: getCurrentTimestamp(),
      };
      return;
    }

    activePlaythrough.encounters[locationId] = {
      ...existingEncounter,
      isFusion: false,
      updatedAt: getCurrentTimestamp(),
    };
    return;
  }

  activePlaythrough.encounters[locationId] = {
    ...existingEncounter,
    isFusion: newIsFusion,
    updatedAt: getCurrentTimestamp(),
  };
};

// Flip head and body in a fusion encounter atomically
export const flipEncounterFusion = async (locationId: string) => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough) {
    return;
  }

  const encounter = activePlaythrough.encounters[locationId];
  if (!encounter?.isFusion) {
    return;
  }

  const prevSpriteId = getFusionSpriteIdFromEncounter(encounter);

  const originalHead = encounter.head;
  const originalBody = encounter.body;

  encounter.head = originalBody;
  encounter.body = originalHead;
  encounter.updatedAt = getCurrentTimestamp();

  const nextSpriteId = getFusionSpriteIdFromEncounter(encounter);
  if (prevSpriteId && nextSpriteId && prevSpriteId !== nextSpriteId) {
    emitEvolutionEvent(locationId);
  }

  trackEvent("fusion_flipped", {
    ...getSharedEventProperties(activePlaythrough),
    location_id: locationId,
  });
};

// Create fusion from drag and drop
export const createFusion = async (
  locationId: string,
  head: PokemonOption,
  body: PokemonOption,
) => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough) {
    return;
  }

  const previousEncounterCount = getEncounterCount(activePlaythrough);
  const encounter = {
    head: createPokemonWithLocationAndUID(head, locationId),
    body: createPokemonWithLocationAndUID(body, locationId),
    isFusion: true,
    updatedAt: getCurrentTimestamp(),
  };

  const retainedUIDs = new Set(
    [encounter.head.uid, encounter.body.uid].filter((uid): uid is string =>
      Boolean(uid),
    ),
  );
  const discardedUIDs = [
    activePlaythrough.encounters[locationId]?.head?.uid,
    activePlaythrough.encounters[locationId]?.body?.uid,
  ].filter((uid): uid is string => Boolean(uid && !retainedUIDs.has(uid)));
  const existingTeamPosition = activePlaythrough.team.members.findIndex(
    (member) =>
      member &&
      (retainedUIDs.has(member.headPokemonUid) ||
        retainedUIDs.has(member.bodyPokemonUid)),
  );

  activePlaythrough.encounters[locationId] = encounter;
  removeTeamMembersWithPokemon([...retainedUIDs, ...discardedUIDs]);
  if (
    existingTeamPosition === -1 ||
    !encounter.head.uid ||
    !encounter.body.uid
  ) {
    await autoAssignCapturedPokemonToTeam(locationId);
  } else {
    await updateTeamMember(
      existingTeamPosition,
      { uid: encounter.head.uid },
      { uid: encounter.body.uid },
    );
  }
  const isCompleteFusion = Boolean(encounter.head && encounter.body);

  trackFusionCreatedIfNew(
    activePlaythrough,
    locationId,
    false,
    isCompleteFusion,
    "create_fusion",
  );
  trackEncounterProgress(activePlaythrough, locationId, previousEncounterCount);
};
