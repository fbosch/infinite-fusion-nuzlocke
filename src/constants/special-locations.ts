/**
 * Special locations that have their own encounter logic
 * These locations don't follow the standard wild encounter pattern
 * Using GUIDs instead of names for robustness
 */

export const SPECIAL_LOCATIONS = {
  STARTER_LOCATION: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Oak's Lab
  // Add other special locations here as needed
  // GIFT_LOCATIONS: ["guid-1", "guid-2"],
  // TRADE_LOCATIONS: ["guid-3", "guid-4"],
} as const;

export type SpecialLocationType =
  (typeof SPECIAL_LOCATIONS)[keyof typeof SPECIAL_LOCATIONS];

/**
 * Check if a location ID is a special location
 */
export function isSpecialLocation(locationId: string): boolean {
  return Object.values(SPECIAL_LOCATIONS).includes(
    locationId as SpecialLocationType
  );
}

/**
 * Check if a location ID is the starter location
 */
export function isStarterLocation(locationId: string): boolean {
  return locationId === SPECIAL_LOCATIONS.STARTER_LOCATION;
}

/**
 * Get the encounter type for a special location
 */
export function getSpecialLocationEncounterType(
  locationId: string
): 'starter' | 'gift' | 'trade' | null {
  if (isStarterLocation(locationId)) {
    return 'starter';
  }
  // Add other special location types here as needed
  return null;
}
