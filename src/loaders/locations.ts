import { z } from 'zod';
import locationsData from '@data/locations.json';
import { getStarterPokemonByGameMode } from './starters';

// Zod schema for location data
export const LocationSchema = z.object({
  id: z.string().min(1, { error: 'Location ID is required' }),
  name: z.string().min(1, { error: 'Location name is required' }),
  routeId: z.number().int().min(0, { error: 'Route ID must be non-negative' }),
  order: z
    .number()
    .int()
    .positive({ error: 'Order must be a positive integer' }),
  region: z.string().min(1, { error: 'Region is required' }),
  description: z.string().min(1, { error: 'Description is required' }),
});

export const CustomLocationSchema = z.object({
  id: z.string().min(1, { error: 'Location ID is required' }),
  name: z.string().min(1, { error: 'Location name is required' }),
  order: z.number().positive({ error: 'Order must be a positive number' }),
});

export type Location = z.infer<typeof LocationSchema>;
export type CustomLocation = z.infer<typeof CustomLocationSchema>;

// Combined type for locations that can be either default or custom
export type CombinedLocation = Location | (CustomLocation & { isCustom: true });

export const LocationsArraySchema = z.array(LocationSchema);

// Simple data loader for locations
export function getLocations(): Location[] {
  try {
    return LocationsArraySchema.parse(locationsData);
  } catch (error) {
    console.error('Failed to validate locations data:', error);
    throw new Error('Invalid locations data format');
  }
}

export function getLocationsByRegion(): Record<string, Location[]> {
  const locations = getLocations();
  const grouped: Record<string, Location[]> = {};

  locations.forEach(location => {
    if (!grouped[location.region]) {
      grouped[location.region] = [];
    }
    grouped[location.region].push(location);
  });

  return grouped;
}

export function getLocationsBySpecificRegion(region: string): Location[] {
  return getLocations().filter(location => location.region === region);
}

export function getLocationsSortedByOrder(): Location[] {
  return getLocations().sort((a, b) => a.order - b.order);
}

// Special handling for starter Pokémon encounters
export async function getLocationEncounters(
  location: Location,
  gameMode: 'classic' | 'remix' = 'classic'
): Promise<number[]> {
  // Special case for starter location (routeId 0)
  if (location.routeId === 0) {
    return await getStarterPokemonByGameMode(gameMode);
  }

  // For other locations, return empty array (encounters handled separately)
  return [];
}

// Get location name by route ID
export function getLocationNameByRouteId(routeId: number): string | null {
  const locations = getLocations();
  const location = locations.find(loc => loc.routeId === routeId);
  return location ? location.name : null;
}

// Get location name by ID (guid)
export function getLocationNameById(id: string): string | null {
  const locations = getLocations();
  const location = locations.find(loc => loc.id === id);
  return location ? location.name : null;
}

// Get location by route ID
export function getLocationByRouteId(routeId: number): Location | null {
  const locations = getLocations();
  return locations.find(loc => loc.routeId === routeId) || null;
}

// Get all locations with their available encounters
export async function getLocationsWithEncounters(
  gameMode: 'classic' | 'remix' = 'classic'
): Promise<Array<Location & { encounters: number[] }>> {
  const locations = getLocationsSortedByOrder();
  const locationsWithEncounters = [];

  for (const location of locations) {
    const encounters = await getLocationEncounters(location, gameMode);
    locationsWithEncounters.push({
      ...location,
      encounters,
    });
  }

  return locationsWithEncounters;
}

// Check if a location has encounters available
export async function hasLocationEncounters(
  location: Location,
  gameMode: 'classic' | 'remix' = 'classic'
): Promise<boolean> {
  const encounters = await getLocationEncounters(location, gameMode);
  return encounters.length > 0;
}

// Custom location management functions

/**
 * Custom Location Usage Example:
 *
 * // Get the active playthrough's custom locations
 * const customLocations = playthroughActions.getCustomLocations();
 *
 * // Add a new custom location after Route 1
 * const newLocationId = playthroughActions.addCustomLocation('My Custom Route', 'route-1-id');
 *
 * // Get merged locations (default + custom) for display
 * const allLocations = playthroughActions.getMergedLocations();
 *
 * // Remove a custom location
 * playthroughActions.removeCustomLocation(newLocationId);
 */

// Generate a unique ID for custom locations
export function generateCustomLocationId(): string {
  return `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Calculate the order for a new custom location after a given location
export function calculateCustomLocationOrder(
  afterLocationId: string,
  customLocations: CustomLocation[] = []
): number {
  const defaultLocations = getLocations();
  const allLocations = mergeLocationsWithCustom(
    defaultLocations,
    customLocations
  );

  const afterLocation = allLocations.find(loc => loc.id === afterLocationId);
  if (!afterLocation) {
    throw new Error(`Location with ID ${afterLocationId} not found`);
  }

  // Find the next location in order to determine spacing
  const currentOrder = afterLocation.order;
  const nextLocation = allLocations
    .filter(loc => loc.order > currentOrder)
    .sort((a, b) => a.order - b.order)[0];

  if (nextLocation) {
    // Place the custom location between the current and next location
    const gap = nextLocation.order - currentOrder;
    if (gap > 1) {
      // There's space, place it in the middle
      return currentOrder + Math.floor(gap / 2);
    } else {
      // No space, we need to use decimal ordering
      return currentOrder + 0.5;
    }
  } else {
    // No next location, place it after the current one
    return currentOrder + 1;
  }
}

// Merge default locations with custom locations, sorted by order
export function mergeLocationsWithCustom(
  defaultLocations: Location[] = getLocations(),
  customLocations: CustomLocation[] = []
): CombinedLocation[] {
  // Convert custom locations to combined type
  const customAsCombined: CombinedLocation[] = customLocations.map(custom => ({
    ...custom,
    isCustom: true as const,
  }));

  // Combine all locations and sort by order
  const allLocations = [...defaultLocations, ...customAsCombined];
  return allLocations.sort((a, b) => a.order - b.order);
}

// Get merged locations sorted by order for a specific playthrough
export function getLocationsSortedWithCustom(
  customLocations: CustomLocation[] = []
): CombinedLocation[] {
  return mergeLocationsWithCustom(getLocations(), customLocations);
}

// Alias function for compatibility with AddCustomLocationModal
export function getCombinedLocationsSortedByOrder(
  customLocations: CustomLocation[] = []
): CombinedLocation[] {
  return getLocationsSortedWithCustom(customLocations);
}

// Helper to check if a location is custom
export function isCustomLocation(
  location: CombinedLocation
): location is CustomLocation & { isCustom: true } {
  return 'isCustom' in location && location.isCustom === true;
}

// Get location by ID from merged locations (including custom)
export function getLocationByIdFromMerged(
  locationId: string,
  customLocations: CustomLocation[] = []
): CombinedLocation | null {
  const mergedLocations = mergeLocationsWithCustom(
    getLocations(),
    customLocations
  );
  return mergedLocations.find(loc => loc.id === locationId) || null;
}

// Create a new custom location
export function createCustomLocation(
  name: string,
  afterLocationId: string,
  customLocations: CustomLocation[] = []
): CustomLocation {
  const order = calculateCustomLocationOrder(afterLocationId, customLocations);

  return {
    id: generateCustomLocationId(),
    name: name.trim(),
    order,
  };
}

// Validate that a custom location can be placed after the specified location
export function validateCustomLocationPlacement(
  afterLocationId: string,
  customLocations: CustomLocation[] = []
): boolean {
  try {
    calculateCustomLocationOrder(afterLocationId, customLocations);
    return true;
  } catch {
    return false;
  }
}

// Get all locations that can be used as "after" locations for custom placement
export function getAvailableAfterLocations(
  customLocations: CustomLocation[] = []
): CombinedLocation[] {
  // Return all locations except the last one (since you can't place after the last)
  const mergedLocations = mergeLocationsWithCustom(
    getLocations(),
    customLocations
  );
  return mergedLocations.slice(0, -1); // Remove the last location
}

// Get merged locations with encounters for a specific game mode
export async function getMergedLocationsWithEncounters(
  customLocations: CustomLocation[] = [],
  gameMode: 'classic' | 'remix' = 'classic'
): Promise<Array<CombinedLocation & { encounters: number[] }>> {
  const mergedLocations = getLocationsSortedWithCustom(customLocations);
  const locationsWithEncounters = [];

  for (const location of mergedLocations) {
    let encounters: number[] = [];

    // Only default locations have encounters (custom locations are user-defined)
    if (!isCustomLocation(location)) {
      encounters = await getLocationEncounters(location, gameMode);
    }

    locationsWithEncounters.push({
      ...location,
      encounters,
    });
  }

  return locationsWithEncounters;
}

export function getLocationById(id: string) {
  const locations = getLocations();
  return locations.find(loc => loc.id === id) || null;
}
