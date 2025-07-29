import { z } from 'zod';
import { getStarterPokemonByGameMode } from './starters';
import type { PokemonOptionType } from './pokemon';
/**
 * Type for encounter data with fusion status
 * Used to track Pokemon encounters and their fusion state
 */
export interface EncounterData {
  head: PokemonOptionType | null;
  body: PokemonOptionType | null;
  isFusion: boolean;
  artworkVariant?: string; // Alternative artwork variant for fusions (e.g., 'a', 'b', 'c')
}

// Zod schema for route encounter data
export const RouteEncounterSchema = z.object({
  routeName: z.string().min(1, { error: 'Route name is required' }),
  pokemonIds: z.array(
    z.number().int().positive({ error: 'Pokemon ID must be positive' })
  ),
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
    const classicEncountersData = await import('@data/classic/encounters.json');
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
    const remixEncountersData = await import('@data/remix/encounters.json');
    const data = RouteEncountersArraySchema.parse(remixEncountersData.default);
    remixEncountersCache = data;
    return data;
  } catch (error) {
    console.error('Failed to validate remix encounters data:', error);
    throw new Error('Invalid remix encounters data format');
  }
}

// Get encounters by route name
export async function getEncountersByRouteName(
  routeName: string | null | undefined,
  gameMode: 'classic' | 'remix' = 'classic'
): Promise<RouteEncounter | null> {
  if (!routeName) {
    return null;
  }

  // Special case for starter location
  if (routeName === 'Starter') {
    return {
      routeName: 'Starter',
      pokemonIds: await getStarterPokemonByGameMode(gameMode),
    };
  }

  const encounters = await getEncounters(gameMode);
  return encounters.find(encounter => encounter.routeName === routeName) || null;
}

// Get all encounters for a specific game mode
export async function getEncounters(
  gameMode: 'classic' | 'remix' = 'classic'
): Promise<RouteEncounter[]> {
  return gameMode === 'classic'
    ? await getClassicEncounters()
    : await getRemixEncounters();
}

// Create a map of routeName to encounter for quick lookup
export async function getEncountersMap(
  gameMode: 'classic' | 'remix' = 'classic'
): Promise<Map<string, RouteEncounter>> {
  const encounters = await getEncounters(gameMode);
  const encounterMap = new Map<string, RouteEncounter>();

  encounters.forEach(encounter => {
    encounterMap.set(encounter.routeName, encounter);
  });

  return encounterMap;
}
