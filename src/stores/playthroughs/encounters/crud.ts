import type { z } from "zod";
import { emitEvolutionEvent } from "@/lib/events";
import type { PokemonOptionSchema, PokemonOptionType } from "@/loaders/pokemon";
import { getActivePlaythrough, getCurrentTimestamp } from "../store";
import type { EncounterDataSchema, Playthrough } from "../types";
import {
  createPokemonWithLocationAndUID,
  ensureActivePlaythroughWithEncounters,
  type PokemonOption,
} from "./shared";
import {
  autoAssignCapturedPokemonToTeam,
  removeTeamMembersWithPokemon,
} from "./team";

// Create encounter data (variants are managed globally)
export const createEncounterData = async (
  pokemon: PokemonOption | null,
  field: "head" | "body" = "head",
  shouldCreateFusion: boolean = false,
  locationId?: string,
): Promise<z.infer<typeof EncounterDataSchema>> => {
  const pokemonWithLocationAndUID = pokemon
    ? createPokemonWithLocationAndUID(pokemon, locationId ?? "")
    : null;

  const encounterData: z.infer<typeof EncounterDataSchema> = {
    head: field === "head" ? pokemonWithLocationAndUID : null,
    body: field === "body" ? pokemonWithLocationAndUID : null,
    isFusion: shouldCreateFusion,
    updatedAt: getCurrentTimestamp(),
  };

  return encounterData;
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
  updates: Partial<z.infer<typeof PokemonOptionSchema>>,
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
};

// Update encounter for a location
export const updateEncounter = async (
  locationId: string,
  pokemon: PokemonOptionType | null,
  field: "head" | "body" = "head",
  shouldCreateFusion: boolean = false,
) => {
  const activePlaythrough = ensureActivePlaythroughWithEncounters();
  if (!activePlaythrough) {
    return;
  }

  let encounter = activePlaythrough.encounters[locationId];
  if (!encounter) {
    const encounterData = await createEncounterData(
      pokemon,
      field,
      shouldCreateFusion,
      locationId,
    );
    encounter = encounterData;
    activePlaythrough.encounters[locationId] = encounter;

    if (encounterData.isFusion && encounterData.head && encounterData.body) {
      emitEvolutionEvent(locationId);
    }

    if (pokemon?.status) {
      await autoAssignCapturedPokemonToTeam(locationId);
    }

    return;
  }

  if (pokemon) {
    const pokemonWithLocationAndUID = createPokemonWithLocationAndUID(
      pokemon,
      locationId,
    );

    const willBeFusion =
      shouldCreateFusion || encounter.isFusion || field === "body";

    const previousFieldId = encounter[field]?.id ?? null;
    if (willBeFusion) {
      encounter[field] = pokemonWithLocationAndUID;
      encounter.isFusion = true;

      if (
        pokemonWithLocationAndUID.status &&
        encounter.head &&
        encounter.body
      ) {
        const otherField = field === "head" ? "body" : "head";
        const otherPokemon = encounter[otherField];

        if (otherPokemon && !otherPokemon.status) {
          encounter[otherField] = {
            ...otherPokemon,
            status: pokemonWithLocationAndUID.status,
          };
        }
      }
    } else {
      encounter.head = pokemonWithLocationAndUID;
      encounter.body = null;
      encounter.isFusion = false;
    }

    encounter.updatedAt = getCurrentTimestamp();

    const newFieldId = encounter[field]?.id ?? null;
    const fieldChanged = previousFieldId !== newFieldId;
    if (
      encounter.isFusion &&
      encounter.head &&
      encounter.body &&
      fieldChanged
    ) {
      emitEvolutionEvent(locationId);
    }

    if (pokemonWithLocationAndUID.status) {
      await autoAssignCapturedPokemonToTeam(locationId);
    }

    return;
  }

  const removedUIDs: string[] = [];
  if (encounter[field]?.uid) {
    removedUIDs.push(encounter[field].uid);
  }

  encounter[field] = null;
  encounter.updatedAt = getCurrentTimestamp();

  removeTeamMembersWithPokemon(removedUIDs);
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
