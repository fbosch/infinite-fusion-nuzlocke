import { z } from 'zod';
import locationsData from '@data/locations.json';

// Zod schema for location data
export const LocationSchema = z.object({
  name: z.string().min(1, { error: "Location name is required" }),
  routeId: z.number().nullable(),
  order: z.number().int().positive({ error: "Order must be a positive integer" }),
  region: z.string().min(1, { error: "Region is required" }),
  description: z.string().min(1, { error: "Description is required" }),
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