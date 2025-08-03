import { z } from 'zod';

/**
 * Shared encounter type definition for consistency across the codebase.
 * This type defines all valid encounter types that can be used in the application.
 */
export const EncounterTypeSchema = z.enum(
  ['grass', 'surf', 'fishing', 'special', 'cave', 'rock_smash', 'pokeradar'],
  {
    error:
      'Invalid encounter type. Must be one of: grass, surf, fishing, special, cave, rock_smash, pokeradar',
  }
);

export type EncounterType = z.infer<typeof EncounterTypeSchema>;

/**
 * Array of all valid encounter types for validation and iteration
 */
export const ENCOUNTER_TYPES: EncounterType[] = [
  'grass',
  'surf',
  'fishing',
  'special',
  'cave',
  'rock_smash',
  'pokeradar',
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
