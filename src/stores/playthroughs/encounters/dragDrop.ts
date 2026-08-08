import { emitEvolutionEvent } from "@/lib/events";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { getCurrentTimestamp } from "../playthroughState";
import type { EncounterData } from "../types";
import {
  createPokemonWithLocationAndUID,
  ensureActivePlaythroughWithEncounters,
} from "./shared";
import { removeTeamMembersWithPokemon } from "./team";
import { trackFusionCreatedIfNew } from "./transition";

// Clear encounter from a specific location (replaces clearCombobox event)
export const clearEncounterFromLocation = async (
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

  const removedUIDs: string[] = [];

  if (field) {
    if (encounter[field]?.uid) {
      removedUIDs.push(encounter[field].uid);
    }

    encounter[field] = null;

    if (encounter.isFusion) {
      encounter.updatedAt = getCurrentTimestamp();
    } else if (field === "head" || !(encounter.head || encounter.body)) {
      delete activePlaythrough.encounters[locationId];
    } else {
      encounter.updatedAt = getCurrentTimestamp();
    }
  } else {
    if (encounter.head?.uid) {
      removedUIDs.push(encounter.head.uid);
    }
    if (encounter.body?.uid) {
      removedUIDs.push(encounter.body.uid);
    }

    delete activePlaythrough.encounters[locationId];
  }

  if (options?.preserveTeamMembership !== true) {
    removeTeamMembersWithPokemon(removedUIDs);
  }
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

  void clearEncounterFromLocation(sourceLocationId, sourceField, {
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
  const isCompleteFusion = Boolean(
    newEncounter.isFusion && newEncounter.head && newEncounter.body,
  );
  if (isCompleteFusion) {
    emitEvolutionEvent(targetLocationId);
  }

  trackFusionCreatedIfNew(
    activePlaythrough,
    targetLocationId,
    targetWasCompleteFusion,
    isCompleteFusion,
    "drag_drop",
  );
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

  const sourceField: "head" | "body" =
    sourceEncounter.head?.uid === pokemon.uid
      ? "head"
      : sourceEncounter.body?.uid === pokemon.uid
        ? "body"
        : sourceEncounter[toField]
          ? toField
          : sourceEncounter.head
            ? "head"
            : "body";

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

  const pokemon1 = field1 === "head" ? encounter1.head : encounter1.body;
  const pokemon2 = field2 === "head" ? encounter2.head : encounter2.body;
  if (!(pokemon1 && pokemon2)) {
    return;
  }

  const pokemon1WithLocation = {
    ...pokemon1,
    originalLocation: pokemon1.originalLocation ?? locationId1,
  };
  const pokemon2WithLocation = {
    ...pokemon2,
    originalLocation: pokemon2.originalLocation ?? locationId2,
  };

  if (field1 === "head") {
    encounter1.head = pokemon2WithLocation;
  } else {
    encounter1.body = pokemon2WithLocation;
  }

  if (field2 === "head") {
    encounter2.head = pokemon1WithLocation;
  } else {
    encounter2.body = pokemon1WithLocation;
  }

  const timestamp = getCurrentTimestamp();
  encounter1.updatedAt = timestamp;
  encounter2.updatedAt = timestamp;

  const encounter1NowFusion =
    encounter1.isFusion && encounter1.head && encounter1.body;
  const encounter2NowFusion =
    encounter2.isFusion && encounter2.head && encounter2.body;

  if (encounter1NowFusion) {
    emitEvolutionEvent(locationId1);
  }
  if (encounter2NowFusion) {
    emitEvolutionEvent(locationId2);
  }
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
