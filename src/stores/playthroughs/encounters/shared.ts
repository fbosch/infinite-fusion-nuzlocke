import type { z } from "zod";
import { getSpriteId } from "@/lib/sprites";
import {
  generatePokemonUID,
  type PokemonOptionSchema,
} from "@/loaders/pokemon";
import { getActivePlaythrough } from "../playthroughState";
import type { Playthrough } from "../types";

export type PokemonOption = z.infer<typeof PokemonOptionSchema>;
export type PlaythroughWithEncounters = Playthrough & {
  encounters: NonNullable<Playthrough["encounters"]>;
};

export const createPokemonWithLocationAndUID = (
  pokemon: PokemonOption,
  locationId: string,
): PokemonOption => {
  return {
    ...pokemon,
    originalLocation: pokemon.originalLocation ?? locationId,
    uid: pokemon.uid || generatePokemonUID(),
  };
};

export const ensureActivePlaythroughWithEncounters =
  (): PlaythroughWithEncounters | null => {
    const activePlaythrough = getActivePlaythrough();
    if (!activePlaythrough) {
      return null;
    }

    if (!activePlaythrough.encounters) {
      activePlaythrough.encounters = {};
    }

    return activePlaythrough as PlaythroughWithEncounters;
  };

export const getFusionSpriteIdFromEncounter = (enc?: {
  head: PokemonOption | null;
  body: PokemonOption | null;
  isFusion?: boolean;
}) => {
  if (!enc?.isFusion || !enc.head || !enc.body) return null;

  const headId = enc.head.id ?? null;
  const bodyId = enc.body.id ?? null;
  if (!headId || !bodyId) return null;

  try {
    return getSpriteId(headId, bodyId);
  } catch {
    return null;
  }
};
