const ENCOUNTER_SOURCE_ENTRIES = [
  ["WILD", "wild"],
  ["GRASS", "grass"],
  ["SURF", "surf"],
  ["FISHING", "fishing"],
  ["CAVE", "cave"],
  ["ROCK_SMASH", "rock_smash"],
  ["POKERADAR", "pokeradar"],
  ["GIFT", "gift"],
  ["TRADE", "trade"],
  ["QUEST", "quest"],
  ["NEST", "nest"],
  ["EGG", "egg"],
  ["STATIC", "static"],
  ["LEGENDARY", "legendary"],
] as const;

export const EncounterSource = Object.fromEntries(ENCOUNTER_SOURCE_ENTRIES) as {
  [Entry in (typeof ENCOUNTER_SOURCE_ENTRIES)[number] as Entry[0]]: Entry[1];
};

export type EncounterSource =
  (typeof EncounterSource)[keyof typeof EncounterSource];

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
