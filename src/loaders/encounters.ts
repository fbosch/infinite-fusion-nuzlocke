import { encountersData } from "@/lib/queryClient";
import {
  EncounterSource,
  type PokemonEncounter,
  type RouteEncounter,
  RouteEncountersArraySchema,
} from "@/types/encounters";
import { useLocationEncountersById } from "./locations";
import type { Pokemon, PokemonOptionType } from "./pokemon";
import { useAllPokemon, usePokemonNameMap } from "./pokemon";
import { getStarterPokemonByGameMode } from "./starters";

/**
 * Type for encounter data with fusion status
 * Used to track Pokemon encounters and their fusion state
 */
interface EncounterData {
  head: PokemonOptionType | null;
  body: PokemonOptionType | null;
  isFusion: boolean;
}

// Data loaders for encounters using TanStack Query
async function getClassicEncounters(): Promise<RouteEncounter[]> {
  try {
    return await encountersData.getAllEncounters("classic");
  } catch (error) {
    console.error("Failed to fetch classic encounters:", error);
    throw new Error("Failed to load classic encounters data");
  }
}

async function getRemixEncounters(): Promise<RouteEncounter[]> {
  try {
    return await encountersData.getAllEncounters("remix");
  } catch (error) {
    console.error("Failed to fetch remix encounters:", error);
    throw new Error("Failed to load remix encounters data");
  }
}

// Get encounters by route name
async function getEncountersByRouteName(
  routeName: string | null | undefined,
  gameMode: "classic" | "remix" = "classic",
): Promise<RouteEncounter | null> {
  if (!routeName) {
    return null;
  }

  // Special case for starter location
  if (routeName === "Starter") {
    const starterIds = await getStarterPokemonByGameMode(gameMode);
    return {
      routeName: "Starter",
      pokemon: starterIds.map((id) => ({ id, source: EncounterSource.GIFT })),
    };
  }

  try {
    // Get all encounters for the game mode and find the specific route
    const encounters = await encountersData.getAllEncounters(gameMode);
    return (
      encounters.find((encounter) => encounter.routeName === routeName) || null
    );
  } catch (error) {
    console.error(`Failed to fetch encounter for route '${routeName}':`, error);
    return null;
  }
}

// Get all encounters for a specific game mode
async function getEncounters(
  gameMode: "classic" | "remix" = "classic",
): Promise<RouteEncounter[]> {
  return gameMode === "classic"
    ? await getClassicEncounters()
    : await getRemixEncounters();
}

// Create a map of routeName to encounter for quick lookup
async function getEncountersMap(
  gameMode: "classic" | "remix" = "classic",
): Promise<Map<string, RouteEncounter>> {
  const encounters = await getEncounters(gameMode);
  const encounterMap = new Map<string, RouteEncounter>();

  encounters.forEach((encounter) => {
    encounterMap.set(encounter.routeName, encounter);
  });

  return encounterMap;
}

// Function to clear cache if needed (for testing or data updates)
function clearEncountersCache(): void {
  // This will be handled by TanStack Query's cache invalidation
  // You can use queryClient.invalidateQueries(['encounters']) if needed
}

// Hook to get processed encounter data for a location
interface UseEncounterDataOptions {
  locationId?: string;
  enabled?: boolean;
  gameMode?: "classic" | "remix";
}

export type RouteEncounterPokemon = PokemonOptionType & {
  sources: EncounterSource[];
};

export function useEncountersForLocation({
  locationId,
  enabled = false,
  gameMode = "classic",
}: UseEncounterDataOptions) {
  // Use the hook variant to fetch encounters
  const { pokemonEncounters, isLoading, error } = useLocationEncountersById(
    enabled ? locationId : undefined,
    gameMode,
  );

  // Use existing hooks for Pokemon data and name map
  const { data: allPokemon = [] } = useAllPokemon();
  const nameMap = usePokemonNameMap();

  // Process encounter data, merging duplicates with multiple sources
  let routeEncounterData: RouteEncounterPokemon[] = [];

  if (enabled && pokemonEncounters.length && allPokemon.length) {
    // Group encounters by Pokemon ID to merge duplicates
    const encounterMap = new Map<number, EncounterSource[]>();

    pokemonEncounters.forEach(({ id, source }) => {
      if (!encounterMap.has(id)) {
        encounterMap.set(id, []);
      }
      const sources = encounterMap.get(id)!;
      if (!sources.includes(source as EncounterSource)) {
        sources.push(source as EncounterSource);
      }
    });

    // Convert back to array with merged sources
    routeEncounterData = Array.from(encounterMap.entries()).map(
      ([id, sources]) => {
        const pokemon = allPokemon.find((p: Pokemon) => p.id === id);
        return {
          id,
          name: nameMap.get(id) || `Unknown Pokemon (${id})`,
          nationalDexId: pokemon?.nationalDexId || 0,
          originalLocation: locationId,
          sources,
        };
      },
    );
  }

  const routePokemonIds = new Set(
    routeEncounterData.map((pokemon) => pokemon.id),
  );

  // Predicate function to check if a Pokemon is in the current route
  const isRoutePokemon = (pokemonId: number): boolean =>
    routePokemonIds.has(pokemonId);

  return {
    routeEncounterData,
    isLoading,
    error,
    isRoutePokemon,
  };
}
