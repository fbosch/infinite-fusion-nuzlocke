import { z } from 'zod';
import locationsData from '@data/shared/locations.json';
import { encountersData, encountersQueries } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { getStarterPokemonByGameMode } from '@/loaders/starters';
import { isStarterLocation } from '@/constants/special-locations';
import { GameMode } from '../stores/playthroughs';

// Location schema
export const LocationSchema = z.object({
  id: z.string().min(1, { error: 'Location ID is required' }),
  name: z.string().min(1, { error: 'Location name is required' }),
  region: z.string().min(1, { error: 'Region is required' }),
  description: z.string().min(1, { error: 'Description is required' }),
});

export type Location = z.infer<typeof LocationSchema>;

// Legacy custom location schema for migration
const LegacyCustomLocationSchema = z.object({
  id: z.string().min(1, { error: 'Location ID is required' }),
  name: z.string().min(1, { error: 'Location name is required' }),
  order: z.number().positive({ error: 'Order must be a positive number' }),
});

// Modern custom location schema
const ModernCustomLocationSchema = z.object({
  id: z.string().min(1, { error: 'Location ID is required' }),
  name: z.string().min(1, { error: 'Location name is required' }),
  insertAfterLocationId: z
    .string()
    .min(1, { error: 'Insert after location ID is required' }),
});

// Custom location schema with migration support
export const CustomLocationSchema = z
  .union([LegacyCustomLocationSchema, ModernCustomLocationSchema])
  .transform(data => {
    // If it's a legacy location with order, migrate it
    if ('order' in data) {
      return migrateCustomLocationFromOrder(data);
    }
    // Otherwise, it's already in the modern format
    return data as z.infer<typeof ModernCustomLocationSchema>;
  });

// Migration function to convert order-based custom locations
function migrateCustomLocationFromOrder(
  legacyLocation: z.infer<typeof LegacyCustomLocationSchema>
): z.infer<typeof ModernCustomLocationSchema> {
  const defaultLocations = getLocations();

  // Find the location that would have been "before" this custom location based on order
  const beforeLocationIndex = Math.floor(legacyLocation.order) - 1;

  // Ensure we have a valid index
  const safeIndex = Math.max(
    0,
    Math.min(beforeLocationIndex, defaultLocations.length - 1)
  );
  const insertAfterLocationId =
    defaultLocations[safeIndex]?.id || defaultLocations[0]?.id;

  if (!insertAfterLocationId) {
    throw new Error(
      'Cannot migrate custom location: no valid location to insert after'
    );
  }

  return {
    id: legacyLocation.id,
    name: legacyLocation.name,
    insertAfterLocationId,
  };
}

export type CustomLocation = z.infer<typeof CustomLocationSchema>;

// Combined type for locations that can be either default or custom
export type CombinedLocation =
  | Location
  | (CustomLocation & { region: string; description: string; isCustom: true });

export const LocationsArraySchema = z.array(LocationSchema);

// Validate and load locations
function loadLocations(): Location[] {
  const result = z.array(LocationSchema).safeParse(locationsData);
  if (!result.success) {
    console.error('Invalid locations data:', result.error.issues);
    throw new Error('Invalid locations data');
  }
  return result.data;
}

// Cache the locations
let locationsCache: Location[] | null = null;

export function getLocations(): Location[] {
  if (!locationsCache) {
    locationsCache = loadLocations();
  }
  return locationsCache;
}

// Function to clear cache if needed (for testing or data updates)
export function clearLocationsCache(): void {
  locationsCache = null;
}

// Get locations by region
export function getLocationsByRegion(region: string): Location[] {
  return getLocations().filter(location => location.region === region);
}

// Get locations by specific region (case-insensitive)
export function getLocationsBySpecificRegion(region: string): Location[] {
  const normalizedRegion = region.toLowerCase();
  return getLocations().filter(
    location => location.region.toLowerCase() === normalizedRegion
  );
}

// Get locations in their natural order (array position)
export function getLocationsSortedByOrder(): Location[] {
  return getLocations();
}

// Get encounters for a location by its name
export async function getLocationEncountersByName(
  locationName: string,
  gameMode: 'classic' | 'remix' = 'classic'
): Promise<number[]> {
  // Find the location by name to get its ID
  const location = getLocations().find(loc => loc.name === locationName);
  if (!location) {
    return [];
  }

  // Special case for starter location
  if (isStarterLocation(location.id)) {
    return await getStarterPokemonByGameMode(gameMode);
  }

  // Get all encounters for the game mode and find the specific route
  const encounters = await encountersData.getAllEncounters(gameMode);
  const encounter = encounters.find(e => e.routeName === locationName);
  return encounter?.pokemonIds || [];
}

// Get encounters for a location by its ID
export async function getLocationEncountersById(
  locationId: string,
  gameMode: 'classic' | 'remix' = 'classic'
): Promise<number[]> {
  // Find the location by ID
  const location = getLocations().find(loc => loc.id === locationId);
  if (!location) {
    return [];
  }

  // Special case for starter location
  if (isStarterLocation(locationId)) {
    return await getStarterPokemonByGameMode(gameMode);
  }

  // Use TanStack Query to get encounters
  const encounters = await encountersData.getAllEncounters(gameMode);
  const encounter = encounters.find(e => e.routeName === location.name);
  return encounter?.pokemonIds || [];
}

// Hook variant for getting encounters by location ID
export function useLocationEncountersById(
  locationId: string | undefined,
  gameMode: GameMode
) {
  // Find the location by ID
  const location = getLocations().find(loc => loc.id === locationId);
  const isStarter = !!locationId && isStarterLocation(locationId);
  const isRandomized = gameMode == 'randomized';

  const {
    data: encounters = [],
    isLoading,
    error,
  } = useQuery({
    ...encountersQueries.all(gameMode as 'remix' | 'classic'),
    enabled: !isStarter && !isRandomized,
  });

  // Get starter Pokemon data (always call this hook)
  const {
    data: starterPokemon = [],
    isLoading: starterLoading,
    error: starterError,
  } = useQuery({
    queryKey: ['starter-pokemon', gameMode],
    queryFn: () => getStarterPokemonByGameMode(gameMode as 'remix' | 'classic'),
    enabled: isStarter && !isRandomized,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  if (gameMode === 'randomized') {
    return {
      pokemonIds: [],
      isLoading: false,
      error: null,
    };
  }

  if (isStarter) {
    return {
      pokemonIds: starterPokemon,
      isLoading: starterLoading,
      error: starterError,
    };
  }

  const encounter = (
    encounters && 'data' in encounters ? encounters.data : encounters
  )?.find(e => e.routeName === location?.name);

  return {
    pokemonIds: encounter?.pokemonIds || [],
    isLoading,
    error,
  };
}

// Get all locations with their available encounters
export async function getLocationsWithEncounters(
  gameMode: 'classic' | 'remix' = 'classic'
): Promise<Array<Location & { encounters: number[] }>> {
  const locations = getLocations();
  const locationsWithEncounters: Array<Location & { encounters: number[] }> =
    [];

  for (const location of locations) {
    const encounters = await getLocationEncountersById(location.id, gameMode);
    if (encounters.length > 0) {
      locationsWithEncounters.push({
        ...location,
        encounters,
      });
    }
  }

  return locationsWithEncounters;
}

// Check if a location has encounters
export async function hasLocationEncounters(
  location: Location,
  gameMode: 'classic' | 'remix' = 'classic'
): Promise<boolean> {
  const encounters = await getLocationEncountersById(location.id, gameMode);
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

// Get the index where a custom location should be inserted after a given location
export function getCustomLocationInsertIndex(
  afterLocationId: string,
  customLocations: CustomLocation[] = []
): number {
  const allLocations = mergeLocationsWithCustom(
    getLocations(),
    customLocations
  );

  const afterLocationIndex = allLocations.findIndex(
    loc => loc.id === afterLocationId
  );
  if (afterLocationIndex === -1) {
    throw new Error(`Location with ID ${afterLocationId} not found`);
  }

  // Return the index where the new location should be inserted (after the found location)
  return afterLocationIndex + 1;
}

// Merge default locations with custom locations, inserting at specified positions
export function mergeLocationsWithCustom(
  defaultLocations: Location[] = getLocations(),
  customLocations: CustomLocation[] = []
): CombinedLocation[] {
  // Early return if no custom locations
  if (customLocations.length === 0) {
    return defaultLocations;
  }

  // Start with a copy of default locations
  const result: CombinedLocation[] = [...defaultLocations];

  // Sort custom locations by their desired insertion order
  // (process from end to beginning to maintain correct indices)
  const sortedCustoms = [...customLocations].sort((a, b) => {
    const aIndex = result.findIndex(loc => loc.id === a.insertAfterLocationId);
    const bIndex = result.findIndex(loc => loc.id === b.insertAfterLocationId);
    return bIndex - aIndex; // Reverse order
  });

  // Insert custom locations at their specified positions
  for (const custom of sortedCustoms) {
    const afterIndex = result.findIndex(
      loc => loc.id === custom.insertAfterLocationId
    );
    if (afterIndex !== -1) {
      const customLocation: CombinedLocation = {
        id: custom.id,
        name: custom.name,
        region: 'Custom',
        description: 'Custom location',
        isCustom: true as const,
      };
      result.splice(afterIndex + 1, 0, customLocation);
    }
  }

  return result;
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
  location?: CombinedLocation | null
): location is CustomLocation & {
  region: string;
  description: string;
  isCustom: true;
} {
  return !!location && 'isCustom' in location && location.isCustom === true;
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _customLocations: CustomLocation[] = []
): CustomLocation {
  return {
    id: generateCustomLocationId(),
    name: name.trim(),
    insertAfterLocationId: afterLocationId,
  };
}

// Validate that a custom location can be placed after the specified location
export function validateCustomLocationPlacement(
  afterLocationId: string,
  customLocations: CustomLocation[] = []
): boolean {
  try {
    getCustomLocationInsertIndex(afterLocationId, customLocations);
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
      encounters = await getLocationEncountersByName(location.name, gameMode);
    }

    locationsWithEncounters.push({
      ...location,
      encounters,
    });
  }

  return locationsWithEncounters;
}

export function getLocationById(id?: string) {
  const locations = getLocations();
  return locations.find(loc => loc.id === id) || null;
}
