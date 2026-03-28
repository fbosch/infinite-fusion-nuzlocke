import { emitEvolutionEvent } from "@/lib/events";
import { getCurrentTimestamp } from "../playthroughState";
import {
  createPokemonWithLocationAndUID,
  ensureActivePlaythroughWithEncounters,
  getFusionSpriteIdFromEncounter,
  type PokemonOption,
} from "./shared";

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

  const encounter = {
    head: createPokemonWithLocationAndUID(head, locationId),
    body: createPokemonWithLocationAndUID(body, locationId),
    isFusion: true,
    updatedAt: getCurrentTimestamp(),
  };

  activePlaythrough.encounters[locationId] = encounter;
  if (encounter.head && encounter.body) {
    emitEvolutionEvent(locationId);
  }
};
