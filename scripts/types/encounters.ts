/**
 * Shared encounter type definition for consistency across the codebase.
 * This type defines all valid encounter types that can be used in the application.
 */
export type EncounterType = 
  | 'grass'
  | 'surf' 
  | 'fishing'
  | 'special'
  | 'cave'
  | 'rock_smash'
  | 'pokeradar';

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
  return typeof value === 'string' && ENCOUNTER_TYPES.includes(value as EncounterType);
} 