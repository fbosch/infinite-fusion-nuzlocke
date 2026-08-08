export enum EncounterSource {
  WILD = "wild",
  GRASS = "grass",
  SURF = "surf",
  FISHING = "fishing",
  CAVE = "cave",
  ROCK_SMASH = "rock_smash",
  POKERADAR = "pokeradar",
  GIFT = "gift",
  TRADE = "trade",
  QUEST = "quest",
  NEST = "nest",
  EGG = "egg",
  STATIC = "static",
  LEGENDARY = "legendary",
}

export interface PokemonEncounter {
  id: number;
  source: EncounterSource;
}

export interface RouteEncounter {
  pokemon: PokemonEncounter[];
  routeName: string;
}

/**
 * Shared encounter type definition for consistency across the codebase.
 * This type defines all valid encounter types that can be used in the application.
 */
export const ENCOUNTER_TYPES = [
  "grass",
  "surf",
  "fishing",
  "special",
  "cave",
  "rock_smash",
  "pokeradar",
] as const;

export type EncounterType = (typeof ENCOUNTER_TYPES)[number];
