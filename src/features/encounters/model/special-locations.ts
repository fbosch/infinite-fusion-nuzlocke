/**
 * Special locations that have their own encounter logic
 * These locations don't follow the standard wild encounter pattern
 * Using GUIDs instead of names for robustness
 */

export const SPECIAL_LOCATIONS = {
  STARTER_LOCATION: "f47ac10b-58cc-4372-a567-0e02b2c3d479", // Oak's Lab
} as const;

/**
 * Check if a location ID is the starter location
 */
export function isStarterLocation(locationId: string | undefined): boolean {
  if (!locationId) {
    return false;
  }
  return locationId === SPECIAL_LOCATIONS.STARTER_LOCATION;
}
