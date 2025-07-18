import { z } from 'zod';
import classicEncountersData from '@data/route-encounters-classic.json';
import remixEncountersData from '@data/route-encounters-remix.json';

// Zod schema for route encounter data
export const RouteEncounterSchema = z.object({
  routeName: z.string().min(1, { error: "Route name is required" }),
  pokemonIds: z.array(z.number().int().positive({ error: "Pokemon ID must be positive" })),
  routeId: z.number().int().positive({ error: "Route ID must be positive" }),
});

export type RouteEncounter = z.infer<typeof RouteEncounterSchema>;

export const RouteEncountersArraySchema = z.array(RouteEncounterSchema);

// Data loaders for encounters
export function getClassicEncounters(): RouteEncounter[] {
  try {
    return RouteEncountersArraySchema.parse(classicEncountersData);
  } catch (error) {
    console.error('Failed to validate classic encounters data:', error);
    throw new Error('Invalid classic encounters data format');
  }
}

export function getRemixEncounters(): RouteEncounter[] {
  try {
    return RouteEncountersArraySchema.parse(remixEncountersData);
  } catch (error) {
    console.error('Failed to validate remix encounters data:', error);
    throw new Error('Invalid remix encounters data format');
  }
}

// Get encounters by route ID
export function getEncountersByRouteId(routeId: number, gameMode: 'classic' | 'remix' = 'classic'): RouteEncounter | null {
  const encounters = gameMode === 'classic' ? getClassicEncounters() : getRemixEncounters();
  return encounters.find(encounter => encounter.routeId === routeId) || null;
}

// Get all encounters for a specific game mode
export function getEncounters(gameMode: 'classic' | 'remix' = 'classic'): RouteEncounter[] {
  return gameMode === 'classic' ? getClassicEncounters() : getRemixEncounters();
}

// Create a map of routeId to encounter for quick lookup
export function getEncountersMap(gameMode: 'classic' | 'remix' = 'classic'): Map<number, RouteEncounter> {
  const encounters = getEncounters(gameMode);
  const encounterMap = new Map<number, RouteEncounter>();

  encounters.forEach(encounter => {
    encounterMap.set(encounter.routeId, encounter);
  });

  return encounterMap;
} 