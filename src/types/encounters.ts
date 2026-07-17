import { z } from "zod";

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

export const PokemonEncounterSchema = z.object({
  id: z
    .number()
    .int()
    .refine((value) => value > 0 || value === -1, {
      error: "Pokemon ID must be positive or -1 for egg locations",
    }),
  source: z.enum([
    EncounterSource.WILD,
    EncounterSource.GRASS,
    EncounterSource.SURF,
    EncounterSource.FISHING,
    EncounterSource.CAVE,
    EncounterSource.ROCK_SMASH,
    EncounterSource.POKERADAR,
    EncounterSource.GIFT,
    EncounterSource.TRADE,
    EncounterSource.QUEST,
    EncounterSource.NEST,
    EncounterSource.EGG,
    EncounterSource.STATIC,
    EncounterSource.LEGENDARY,
  ]),
});

export type PokemonEncounter = z.infer<typeof PokemonEncounterSchema>;

export const RouteEncounterSchema = z.object({
  routeName: z.string().min(1, { error: "Route name is required" }),
  pokemon: z.array(PokemonEncounterSchema),
});

export type RouteEncounter = z.infer<typeof RouteEncounterSchema>;

export const RouteEncountersArraySchema = z.array(RouteEncounterSchema);

/**
 * Shared encounter type definition for consistency across the codebase.
 * This type defines all valid encounter types that can be used in the application.
 */
export const EncounterTypeSchema = z.enum(
  ["grass", "surf", "fishing", "special", "cave", "rock_smash", "pokeradar"],
  {
    error:
      "Invalid encounter type. Must be one of: grass, surf, fishing, special, cave, rock_smash, pokeradar",
  },
);

export type EncounterType = z.infer<typeof EncounterTypeSchema>;

/**
 * Array of all valid encounter types for validation and iteration
 */
export const ENCOUNTER_TYPES: EncounterType[] = [
  "grass",
  "surf",
  "fishing",
  "special",
  "cave",
  "rock_smash",
  "pokeradar",
];

/**
 * Type guard to check if a value is a valid encounter type
 */
export function isValidEncounterType(value: unknown): value is EncounterType {
  return EncounterTypeSchema.safeParse(value).success;
}

/**
 * Safely parse an encounter type, returning null if invalid
 */
export function safeParseEncounterType(value: unknown): EncounterType | null {
  const result = EncounterTypeSchema.safeParse(value);
  return result.success ? result.data : null;
}
