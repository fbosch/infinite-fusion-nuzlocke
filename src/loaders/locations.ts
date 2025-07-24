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
  placementAfterLocationId: z
    .string()
    .min(1, { error: 'Placement after location ID is required' }),
});

export type Location = z.infer<typeof LocationSchema>;

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
