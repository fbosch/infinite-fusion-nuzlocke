import { z } from 'zod';
import { getStarterPokemonByGameMode } from './starters';

// Zod schema for route encounter data
export const RouteEncounterSchema = z.object({
  routeName: z.string().min(1, { error: 'Route name is required' }),
  pokemonIds: z.array(
    z.number().int().positive({ error: 'Pokemon ID must be positive' })
  ),
  routeId: z.number().int().positive({ error: 'Route ID must be positive' }),
});

export type RouteEncounter = z.infer<typeof RouteEncounterSchema>;

export const RouteEncountersArraySchema = z.array(RouteEncounterSchema);

// Cache for loaded data
let classicEncountersCache: RouteEncounter[] | null = null;
let remixEncountersCache: RouteEncounter[] | null = null;

// Data loaders for encounters with dynamic imports
export async function getClassicEncounters(): Promise<RouteEncounter[]> {
  if (classicEncountersCache) {
    return classicEncountersCache;
  }

  try {
    const classicEncountersData = await import(
      '@data/route-encounters-classic.json'
    );
    const data = RouteEncountersArraySchema.parse(
      classicEncountersData.default
    );
    classicEncountersCache = data;
    return data;
  } catch (error) {
    console.error('Failed to validate classic encounters data:', error);
    throw new Error('Invalid classic encounters data format');
  }
}

export async function getRemixEncounters(): Promise<RouteEncounter[]> {
  if (remixEncountersCache) {
    return remixEncountersCache;
  }

  try {
    const remixEncountersData = await import(
      '@data/route-encounters-remix.json'
    );
    const data = RouteEncountersArraySchema.parse(remixEncountersData.default);
    remixEncountersCache = data;
    return data;
  } catch (error) {
    console.error('Failed to validate remix encounters data:', error);
    throw new Error('Invalid remix encounters data format');
  }
}

// Get encounters by route ID
export async function getEncountersByRouteId(
  routeId: number | null | undefined,
  gameMode: 'classic' | 'remix' = 'classic'
): Promise<RouteEncounter | null> {
  if (routeId === 0) {
    return {
      routeName: 'Starter',
      pokemonIds: await getStarterPokemonByGameMode(gameMode),
      routeId: 0,
    };
  }
  const encounters = await getEncounters(gameMode);
  return encounters.find(encounter => encounter.routeId === routeId) || null;
}

// Get all encounters for a specific game mode
export async function getEncounters(
  gameMode: 'classic' | 'remix' = 'classic'
): Promise<RouteEncounter[]> {
  return gameMode === 'classic'
    ? await getClassicEncounters()
    : await getRemixEncounters();
}

// Create a map of routeId to encounter for quick lookup
export async function getEncountersMap(
  gameMode: 'classic' | 'remix' = 'classic'
): Promise<Map<number, RouteEncounter>> {
  const encounters = await getEncounters(gameMode);
  const encounterMap = new Map<number, RouteEncounter>();

  encounters.forEach(encounter => {
    encounterMap.set(encounter.routeId, encounter);
  });

  return encounterMap;
}
