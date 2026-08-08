import { emitEvolutionEvent } from "@/lib/events";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { getCurrentTimestamp } from "../playthroughState";
import type { EncounterData } from "../types";
import {
  createPokemonWithLocationAndUID,
  ensureActivePlaythroughWithEncounters,
  type PlaythroughWithEncounters,
} from "./shared";
import { removeTeamMembersWithPokemon } from "./team";
import { trackFusionCreatedIfNew } from "./transition";

const getPokemonUID = (pokemon: PokemonOptionType | null) => pokemon?.uid;

const clearEncounterField = (
  activePlaythrough: PlaythroughWithEncounters,
  locationId: string,
  encounter: EncounterData,
  field: "head" | "body",
) => {
  encounter[field] = null;

  if (encounter.isFusion) {
    encounter.updatedAt = getCurrentTimestamp();
    return;
  }

  if (field === "head" || !(encounter.head || encounter.body)) {
    delete activePlaythrough.encounters[locationId];
    return;
  }

  encounter.updatedAt = getCurrentTimestamp();
};

const clearEncounter = (
  locationId: string,
  field?: "head" | "body",
  options?: { preserveTeamMembership?: boolean },
) => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough) {
    return;
  }

  const encounter = activePlaythrough.encounters[locationId];
  if (!encounter) {
    return;
  }

  if (field) {
    const removedUID = getPokemonUID(encounter[field]);
    clearEncounterField(activePlaythrough, locationId, encounter, field);

    if (options?.preserveTeamMembership !== true) {
      removeTeamMembersWithPokemon(removedUID ? [removedUID] : []);
    }
    return;
  }

  const removedUIDs = [
    getPokemonUID(encounter.head),
    getPokemonUID(encounter.body),
  ].filter((uid): uid is string => Boolean(uid));
  delete activePlaythrough.encounters[locationId];

  if (options?.preserveTeamMembership !== true) {
    removeTeamMembersWithPokemon(removedUIDs);
  }
};

const withOriginalLocation = (
  pokemon: PokemonOptionType,
  fallbackLocationId: string,
) => ({
  ...pokemon,
  originalLocation: pokemon.originalLocation ?? fallbackLocationId,
});

const setEncounterPokemon = (
  encounter: EncounterData,
  field: "head" | "body",
  pokemon: PokemonOptionType,
) => {
  encounter[field] = pokemon;
};

const isCompleteFusion = (encounter: EncounterData) =>
  Boolean(encounter.isFusion && encounter.head && encounter.body);

// Clear encounter from a specific location (replaces clearCombobox event)
export const clearEncounterFromLocation = async (
  locationId: string,
  field?: "head" | "body",
  options?: { preserveTeamMembership?: boolean },
) => {
  clearEncounter(locationId, field, options);
  await Promise.resolve();
};

export const relocateEncounterSlot = async ({
  sourceLocationId,
  sourceField,
  targetLocationId,
  targetField,
}: {
  sourceLocationId: string;
  sourceField: "head" | "body";
  targetLocationId: string;
  targetField: "head" | "body";
}) => {
  if (sourceLocationId === targetLocationId && sourceField === targetField) {
    return;
  }

  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough) {
    return;
  }

  const sourceEncounter = activePlaythrough.encounters[sourceLocationId];
  const pokemon = sourceEncounter?.[sourceField];
  if (!pokemon) {
    return;
  }

  const targetEncounter = activePlaythrough.encounters[targetLocationId];
  if (targetEncounter?.[targetField]) {
    await swapEncounters(
      sourceLocationId,
      targetLocationId,
      sourceField,
      targetField,
    );
    return;
  }

  await moveEncounterAtomic(
    sourceLocationId,
    sourceField,
    targetLocationId,
    targetField,
    pokemon,
  );
};

// Move encounter atomically from source to destination (for drag and drop)
export const moveEncounterAtomic = async (
  sourceLocationId: string,
  sourceField: "head" | "body",
  targetLocationId: string,
  targetField: "head" | "body",
  pokemon: PokemonOptionType,
) => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough) {
    return;
  }

  const pokemonWithLocationAndUID = createPokemonWithLocationAndUID(
    pokemon,
    targetLocationId,
  );

  const existingTargetEncounter =
    activePlaythrough.encounters[targetLocationId];
  const targetWasCompleteFusion = Boolean(
    existingTargetEncounter?.isFusion &&
      existingTargetEncounter.head &&
      existingTargetEncounter.body,
  );
  const willBeFusion =
    targetField === "body" || existingTargetEncounter?.isFusion === true;

  clearEncounter(sourceLocationId, sourceField, {
    preserveTeamMembership: true,
  });

  const newEncounter: EncounterData = {
    body:
      targetField === "body"
        ? pokemonWithLocationAndUID
        : existingTargetEncounter?.body || null,
    head:
      targetField === "head"
        ? pokemonWithLocationAndUID
        : existingTargetEncounter?.head || null,
    isFusion: willBeFusion,
    updatedAt: getCurrentTimestamp(),
  };

  activePlaythrough.encounters[targetLocationId] = newEncounter;
  const newEncounterIsCompleteFusion = Boolean(
    newEncounter.isFusion && newEncounter.head && newEncounter.body,
  );
  if (newEncounterIsCompleteFusion) {
    emitEvolutionEvent(targetLocationId);
  }

  trackFusionCreatedIfNew(
    activePlaythrough,
    targetLocationId,
    targetWasCompleteFusion,
    newEncounterIsCompleteFusion,
    "drag_drop",
  );

  await Promise.resolve();
};

// Move encounter from one location to another
export const moveEncounter = async (
  fromLocationId: string,
  toLocationId: string,
  pokemon: PokemonOptionType,
  toField: "head" | "body" = "head",
) => {
  if (fromLocationId === toLocationId) {
    return;
  }

  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough) {
    return;
  }

  const sourceEncounter = activePlaythrough.encounters[fromLocationId];
  if (!sourceEncounter) {
    return;
  }

  let sourceField: "head" | "body";
  if (sourceEncounter.head?.uid === pokemon.uid) {
    sourceField = "head";
  } else if (sourceEncounter.body?.uid === pokemon.uid) {
    sourceField = "body";
  } else if (sourceEncounter[toField]) {
    sourceField = toField;
  } else {
    sourceField = sourceEncounter.head ? "head" : "body";
  }

  const targetEncounter = activePlaythrough.encounters[toLocationId];
  if (targetEncounter?.[toField]) {
    await swapEncounters(fromLocationId, toLocationId, sourceField, toField);
    return;
  }

  if (
    sourceEncounter.isFusion &&
    sourceEncounter.head &&
    sourceEncounter.body
  ) {
    const movedEncounter: EncounterData = {
      body: createPokemonWithLocationAndUID(sourceEncounter.body, toLocationId),
      head: createPokemonWithLocationAndUID(sourceEncounter.head, toLocationId),
      isFusion: true,
      updatedAt: getCurrentTimestamp(),
    };

    delete activePlaythrough.encounters[fromLocationId];
    activePlaythrough.encounters[toLocationId] = movedEncounter;
    emitEvolutionEvent(toLocationId);
    return;
  }

  delete activePlaythrough.encounters[fromLocationId];

  const pokemonWithLocationAndUID = createPokemonWithLocationAndUID(
    pokemon,
    toLocationId,
  );

  const movedEncounter: EncounterData = {
    body: toField === "body" ? pokemonWithLocationAndUID : null,
    head: toField === "head" ? pokemonWithLocationAndUID : null,
    isFusion: toField === "body",
    updatedAt: getCurrentTimestamp(),
  };

  activePlaythrough.encounters[toLocationId] = movedEncounter;
};

// Swap encounters between two locations
export const swapEncounters = async (
  locationId1: string,
  locationId2: string,
  field1: "head" | "body" = "head",
  field2: "head" | "body" = "head",
) => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough) {
    return;
  }

  const encounter1 = activePlaythrough.encounters[locationId1];
  const encounter2 = activePlaythrough.encounters[locationId2];
  if (!(encounter1 && encounter2)) {
    return;
  }

  const pokemon1 = encounter1[field1];
  const pokemon2 = encounter2[field2];
  if (!(pokemon1 && pokemon2)) {
    return;
  }

  setEncounterPokemon(
    encounter1,
    field1,
    withOriginalLocation(pokemon2, locationId2),
  );
  setEncounterPokemon(
    encounter2,
    field2,
    withOriginalLocation(pokemon1, locationId1),
  );

  const timestamp = getCurrentTimestamp();
  encounter1.updatedAt = timestamp;
  encounter2.updatedAt = timestamp;

  const encounter1NowFusion = isCompleteFusion(encounter1);
  const encounter2NowFusion = isCompleteFusion(encounter2);

  if (encounter1NowFusion) {
    emitEvolutionEvent(locationId1);
  }
  if (encounter2NowFusion) {
    emitEvolutionEvent(locationId2);
  }

  await Promise.resolve();
};

// Get location ID from combobox ID (helper for drag operations)
export const getLocationFromComboboxId = (
  comboboxId: string,
): { locationId: string; field: "head" | "body" } => {
  if (comboboxId.endsWith("-head")) {
    return {
      field: "head",
      locationId: comboboxId.slice(0, -"-head".length),
    };
  }

  if (comboboxId.endsWith("-body")) {
    return {
      field: "body",
      locationId: comboboxId.slice(0, -"-body".length),
    };
  }

  if (comboboxId.endsWith("-single")) {
    return {
      field: "head",
      locationId: comboboxId.slice(0, -"-single".length),
    };
  }

  return { field: "head", locationId: comboboxId };
};

// Move Pokemon to its original location with smart slot selection
export const moveToOriginalLocation = async (
  sourceLocationId: string,
  sourceField: "head" | "body",
  pokemon: PokemonOptionType,
) => {
  if (!pokemon.originalLocation) {
    return;
  }

  const originalLocationId = pokemon.originalLocation;
  if (originalLocationId === sourceLocationId) {
    return;
  }

  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough) {
    return;
  }

  const originalEncounter = activePlaythrough.encounters[originalLocationId];
  const existingHeadPokemon = originalEncounter?.head;
  const existingBodyPokemon = originalEncounter?.body;

  if (!existingHeadPokemon) {
    await moveEncounterAtomic(
      sourceLocationId,
      sourceField,
      originalLocationId,
      "head",
      pokemon,
    );
    return;
  }

  if (!existingBodyPokemon) {
    await moveEncounterAtomic(
      sourceLocationId,
      sourceField,
      originalLocationId,
      "body",
      pokemon,
    );
    return;
  }

  await swapEncounters(
    sourceLocationId,
    originalLocationId,
    sourceField,
    "head",
  );
};
