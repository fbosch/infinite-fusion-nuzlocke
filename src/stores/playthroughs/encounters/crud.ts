import { getEncounterCount } from "@/lib/analytics/playthroughEventData";
import { emitEvolutionEvent } from "@/lib/events";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { getActivePlaythrough, getCurrentTimestamp } from "../playthroughState";
import type { EncounterData, Playthrough } from "../types";
import {
  createPokemonWithLocationAndUID,
  ensureActivePlaythroughWithEncounters,
  type PlaythroughWithEncounters,
  type PokemonOption,
} from "./shared";
import {
  autoAssignCapturedPokemonToTeam,
  removeTeamMembersWithPokemon,
} from "./team";
import { trackEncounterProgress, trackFusionCreatedIfNew } from "./transition";

const isCompleteFusion = (encounter: EncounterData) =>
  Boolean(encounter.isFusion && encounter.head && encounter.body);

const inheritFusionStatus = (
  encounter: EncounterData,
  field: "head" | "body",
  status: PokemonOptionType["status"],
) => {
  if (!(status && encounter.head && encounter.body)) {
    return;
  }

  const otherField = field === "head" ? "body" : "head";
  const otherPokemon = encounter[otherField];
  if (otherPokemon && !otherPokemon.status) {
    encounter[otherField] = { ...otherPokemon, status };
  }
};

// Create encounter data (variants are managed globally)
const createEncounterData = (
  pokemon: PokemonOption | null,
  field: "head" | "body" = "head",
  shouldCreateFusion = false,
  locationId?: string,
): EncounterData => {
  const pokemonWithLocationAndUID = pokemon
    ? createPokemonWithLocationAndUID(pokemon, locationId ?? "")
    : null;

  const encounterData: EncounterData = {
    body: field === "body" ? pokemonWithLocationAndUID : null,
    head: field === "head" ? pokemonWithLocationAndUID : null,
    isFusion: shouldCreateFusion,
    updatedAt: getCurrentTimestamp(),
  };

  return encounterData;
};

const createAndTrackEncounter = async (
  activePlaythrough: PlaythroughWithEncounters,
  locationId: string,
  pokemon: PokemonOptionType | null,
  field: "head" | "body",
  shouldCreateFusion: boolean,
  previousEncounterCount: number,
) => {
  const encounter = createEncounterData(
    pokemon,
    field,
    shouldCreateFusion,
    locationId,
  );
  activePlaythrough.encounters[locationId] = encounter;

  if (
    encounter.isFusion &&
    (encounter.head !== null || encounter.body !== null)
  ) {
    emitEvolutionEvent(locationId);
  }

  if (pokemon?.status) {
    await autoAssignCapturedPokemonToTeam(locationId);
  }

  trackEncounterProgress(activePlaythrough, locationId, previousEncounterCount);
};

const replacePokemonInEncounter = (
  encounter: EncounterData,
  pokemon: PokemonOptionType,
  locationId: string,
  field: "head" | "body",
  shouldCreateFusion: boolean,
) => {
  const previousPokemon = encounter[field];
  const pokemonWithLocationAndUID = createPokemonWithLocationAndUID(
    pokemon,
    locationId,
  );

  if (shouldCreateFusion || encounter.isFusion || field === "body") {
    encounter[field] = pokemonWithLocationAndUID;
    encounter.isFusion = true;
    inheritFusionStatus(encounter, field, pokemonWithLocationAndUID.status);
  } else {
    encounter.head = pokemonWithLocationAndUID;
    encounter.body = null;
    encounter.isFusion = false;
  }

  encounter.updatedAt = getCurrentTimestamp();
  return { pokemonWithLocationAndUID, previousPokemon };
};

const emitEvolutionForUpdatedFusion = (
  encounter: EncounterData,
  previousPokemon: PokemonOptionType | null,
  field: "head" | "body",
  locationId: string,
) => {
  if (
    isCompleteFusion(encounter) &&
    previousPokemon?.id !== encounter[field]?.id
  ) {
    emitEvolutionEvent(locationId);
  }
};

const updateEncounterWithPokemon = async (
  activePlaythrough: PlaythroughWithEncounters,
  locationId: string,
  encounter: EncounterData,
  pokemon: PokemonOptionType,
  field: "head" | "body",
  shouldCreateFusion: boolean,
  previousEncounterCount: number,
) => {
  const wasCompleteFusion = isCompleteFusion(encounter);
  const { pokemonWithLocationAndUID, previousPokemon } =
    replacePokemonInEncounter(
      encounter,
      pokemon,
      locationId,
      field,
      shouldCreateFusion,
    );

  emitEvolutionForUpdatedFusion(encounter, previousPokemon, field, locationId);

  if (previousPokemon?.uid && previousPokemon.uid !== encounter[field]?.uid) {
    removeTeamMembersWithPokemon([previousPokemon.uid]);
  }

  if (pokemonWithLocationAndUID.status) {
    await autoAssignCapturedPokemonToTeam(locationId);
  }

  trackFusionCreatedIfNew(
    activePlaythrough,
    locationId,
    wasCompleteFusion,
    isCompleteFusion(encounter),
    "update_encounter",
  );
  trackEncounterProgress(activePlaythrough, locationId, previousEncounterCount);
};

const clearEncounterField = (
  activePlaythrough: PlaythroughWithEncounters,
  locationId: string,
  encounter: EncounterData,
  field: "head" | "body",
  previousEncounterCount: number,
) => {
  const removedUID = encounter[field]?.uid;
  encounter[field] = null;
  encounter.updatedAt = getCurrentTimestamp();

  removeTeamMembersWithPokemon(removedUID ? [removedUID] : []);
  trackEncounterProgress(activePlaythrough, locationId, previousEncounterCount);
};

// Get encounters for active playthrough
export const getEncounters = (): Playthrough["encounters"] => {
  const activePlaythrough = getActivePlaythrough();
  return activePlaythrough?.encounters || {};
};

// Update a Pokemon's properties in a specific encounter by UID and field
export const updatePokemonInEncounter = async (
  locationId: string,
  pokemonUID: string,
  field: "head" | "body",
  updates: Partial<PokemonOptionType>,
) => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough?.encounters?.[locationId]) {
    return;
  }

  const encounter = activePlaythrough.encounters[locationId];
  const pokemon = encounter[field];

  if (pokemon?.uid === pokemonUID) {
    encounter[field] = { ...pokemon, ...updates };
    encounter.updatedAt = getCurrentTimestamp();
    activePlaythrough.updatedAt = getCurrentTimestamp();
  }

  await Promise.resolve();
};

// Update encounter for a location
export const updateEncounter = async (
  locationId: string,
  pokemon: PokemonOptionType | null,
  field: "head" | "body" = "head",
  shouldCreateFusion = false,
) => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough) {
    return;
  }

  const previousEncounterCount = getEncounterCount(activePlaythrough);

  const encounter = activePlaythrough.encounters[locationId];
  if (!encounter) {
    await createAndTrackEncounter(
      activePlaythrough,
      locationId,
      pokemon,
      field,
      shouldCreateFusion,
      previousEncounterCount,
    );
    return;
  }

  if (pokemon) {
    await updateEncounterWithPokemon(
      activePlaythrough,
      locationId,
      encounter,
      pokemon,
      field,
      shouldCreateFusion,
      previousEncounterCount,
    );
    return;
  }

  clearEncounterField(
    activePlaythrough,
    locationId,
    encounter,
    field,
    previousEncounterCount,
  );
};

// Reset encounter for a location
export const resetEncounter = (locationId: string) => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough) {
    return;
  }

  const encounter = activePlaythrough.encounters[locationId];
  const removedUIDs: string[] = [];

  if (encounter) {
    if (encounter.head?.uid) {
      removedUIDs.push(encounter.head.uid);
    }
    if (encounter.body?.uid) {
      removedUIDs.push(encounter.body.uid);
    }
  }

  delete activePlaythrough.encounters[locationId];
  removeTeamMembersWithPokemon(removedUIDs);
};
