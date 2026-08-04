import {
  keepPreviousData,
  type QueryOptions,
  useQuery,
} from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { pokemonData, pokemonQueries } from "@/lib/queryClient";
import { SearchCore } from "@/lib/searchCore";
import searchService from "@/services/searchService";
import { type Pokemon, PokemonSchema } from "@/types/pokemon";

export type { Pokemon } from "@/types/pokemon";

// Utility function to generate unique identifiers
export function generatePokemonUID(): string {
  return uuidv4();
}

export const isEggId = (id: number | undefined): boolean => id === -1;
export function isEgg(pokemon?: PokemonOptionType): boolean {
  return isEggId(pokemon?.id);
}

// Utility function to create an Egg encounter
export function createEggEncounter(
  locationId?: string,
  nickname?: string,
): PokemonOptionType {
  return {
    id: -1,
    name: "Egg",
    nationalDexId: -1,
    nickname,
    originalLocation: locationId,
    uid: generatePokemonUID(),
  };
}

// Utility function to get encounter display name
export function getEncounterDisplayName(encounter: PokemonOptionType): string {
  if (isEgg(encounter)) {
    return encounter.nickname || "Egg";
  }
  return encounter.nickname || encounter.name;
}

// Status enum for Pokemon tracking
export const PokemonStatus = {
  CAPTURED: "captured",
  RECEIVED: "received",
  TRADED: "traded",
  MISSED: "missed",
  STORED: "stored",
  DECEASED: "deceased",
} as const;

export type PokemonStatusType =
  (typeof PokemonStatus)[keyof typeof PokemonStatus];

// Zod schema for Pokemon status
const PokemonStatusSchema = z.enum(
  [
    PokemonStatus.CAPTURED,
    PokemonStatus.RECEIVED,
    PokemonStatus.TRADED,
    PokemonStatus.MISSED,
    PokemonStatus.STORED,
    PokemonStatus.DECEASED,
  ],
  { error: "Invalid Pokemon status" },
);

// Zod schema for Pokemon option (search results)
export const PokemonOptionSchema = z.object({
  id: z.number().int({ error: "Pokemon ID must be an integer" }),
  name: z.string().min(1, { error: "Pokemon name is required" }),
  nationalDexId: z
    .number()
    .int({ error: "National Dex ID must be an integer" }),
  nickname: z.string().optional(),
  originalLocation: z.string().optional(),
  status: PokemonStatusSchema.optional(),
  originalReceivalStatus: z
    .enum([
      PokemonStatus.CAPTURED,
      PokemonStatus.RECEIVED,
      PokemonStatus.TRADED,
    ])
    .optional(), // Track original status when Pokémon was first received (captured, traded, or received)
  uid: z.string().optional(), // Unique identifier for React reconciliation
});

// Pokemon option type for search results (inferred from schema)
export type PokemonOptionType = z.infer<typeof PokemonOptionSchema>;

// Evolution helper functions using centralized query client
export async function getPokemonEvolutionIds(
  pokemonId: number,
): Promise<number[]> {
  try {
    const allPokemon = await pokemonData.getAllPokemon();
    const pokemon = allPokemon.find((p) => p.id === pokemonId);
    if (!pokemon?.evolution?.evolves_to) {
      return [];
    }
    return pokemon.evolution.evolves_to.map((e) => e.id);
  } catch (error) {
    console.error("Error fetching evolution IDs:", error);
    return [];
  }
}

export async function getPokemonPreEvolutionId(
  pokemonId: number,
): Promise<number | null> {
  try {
    const allPokemon = await pokemonData.getAllPokemon();
    const pokemon = allPokemon.find((p) => p.id === pokemonId);
    if (!pokemon?.evolution?.evolves_from) {
      return null;
    }
    return pokemon.evolution.evolves_from.id;
  } catch (error) {
    console.error("Error fetching pre-evolution ID:", error);
    return null;
  }
}

export async function isPokemonEvolution(
  currentPokemon: PokemonOptionType,
  newPokemon: PokemonOptionType,
): Promise<boolean> {
  if (currentPokemon.id === newPokemon.id) {
    return false;
  }

  try {
    const evolutionIds = await getPokemonEvolutionIds(currentPokemon.id);
    return evolutionIds.includes(newPokemon.id);
  } catch (error) {
    console.error("Error checking evolution relationship:", error);
    return false;
  }
}

export async function isPokemonPreEvolution(
  currentPokemon: PokemonOptionType,
  newPokemon: PokemonOptionType,
): Promise<boolean> {
  if (currentPokemon.id === newPokemon.id) {
    return false;
  }

  try {
    const preEvolutionId = await getPokemonPreEvolutionId(currentPokemon.id);
    return preEvolutionId === newPokemon.id;
  } catch (error) {
    console.error("Error checking pre-evolution relationship:", error);
    return false;
  }
}

// Search function using local SearchCore (kept separate from API approach)
export async function searchPokemon(
  query: string,
): Promise<PokemonOptionType[]> {
  try {
    const searchCore = new SearchCore();
    await searchCore.initialize();
    const searchResults = searchCore.search(query);

    return searchResults.map((result) => ({
      id: result.id,
      name: result.name,
      nationalDexId: result.nationalDexId,
      uid: generatePokemonUID(),
    }));
  } catch (error) {
    console.error("Failed to search Pokemon:", error);
    return [];
  }
}

// Helper functions using centralized query client
export async function getPokemonByName(name: string): Promise<Pokemon | null> {
  try {
    const allPokemon = await pokemonData.getAllPokemon();
    return (
      allPokemon.find((p) => p.name.toLowerCase() === name.toLowerCase()) ||
      null
    );
  } catch (error) {
    console.error("Error fetching Pokemon by name:", error);
    return null;
  }
}

// Legacy function for backward compatibility - uses centralized query client
export async function getPokemon(): Promise<Pokemon[]> {
  try {
    return await pokemonData.getAllPokemon();
  } catch (error) {
    console.error("Failed to fetch Pokemon data:", error);
    throw new Error("Failed to load Pokemon data");
  }
}

// Legacy function for backward compatibility - uses centralized query client
export async function getPokemonById(id: number): Promise<Pokemon | null> {
  try {
    return await pokemonData.getPokemonById(id);
  } catch (error) {
    console.error(`Failed to fetch Pokemon with ID ${id}:`, error);
    return null;
  }
}

// Legacy function for backward compatibility - uses centralized query client
async function getPokemonByType(type: string): Promise<Pokemon[]> {
  try {
    return await pokemonData.getPokemonByType(type);
  } catch (error) {
    console.error(`Failed to fetch Pokemon by type ${type}:`, error);
    return [];
  }
}

// Legacy function for backward compatibility - uses the hook approach
export async function getPokemonNameMap(): Promise<Map<number, string>> {
  try {
    const allPokemon = await pokemonData.getAllPokemon();
    return new Map(allPokemon.map((p) => [p.id, p.name]));
  } catch (error) {
    console.error("Failed to fetch Pokemon name map:", error);
    return new Map();
  }
}

async function getPokemonNamesByIds(ids: number[]): Promise<string[]> {
  try {
    const pokemon = await pokemonData.getPokemonByIds(ids);
    return pokemon.map((p) => p.name);
  } catch (error) {
    console.error("Failed to fetch Pokemon names by IDs:", error);
    return [];
  }
}

async function getAllPokemonTypes(): Promise<string[]> {
  try {
    const pokemon = await pokemonData.getAllPokemon();
    const typeSet = new Set<string>();

    pokemon.forEach((p) => {
      p.types.forEach((type) => {
        typeSet.add(type.name);
      });
    });

    return Array.from(typeSet).sort();
  } catch (error) {
    console.error("Failed to fetch Pokemon types:", error);
    return [];
  }
}

async function getNationalDexIdFromInfiniteFusionId(
  infiniteFusionId: number,
): Promise<number | null> {
  try {
    const allPokemon = await pokemonData.getAllPokemon();
    const pokemon = allPokemon.find((p) => p.id === infiniteFusionId);
    return pokemon?.nationalDexId || null;
  } catch (error) {
    console.error("Error fetching National Dex ID:", error);
    return null;
  }
}

async function getInfiniteFusionIdFromNationalDexId(
  nationalDexId: number,
): Promise<number | null> {
  try {
    const allPokemon = await pokemonData.getAllPokemon();
    const found = allPokemon.find((p) => p.nationalDexId === nationalDexId);
    return found?.id || null;
  } catch (error) {
    console.error("Error fetching Infinite Fusion ID:", error);
    return null;
  }
}

export async function getPokemonByNationalDexId(
  nationalDexId: number,
): Promise<Pokemon | null> {
  try {
    const allPokemon = await pokemonData.getAllPokemon();
    return allPokemon.find((p) => p.nationalDexId === nationalDexId) || null;
  } catch (error) {
    console.error("Error fetching Pokemon by National Dex ID:", error);
    return null;
  }
}

async function getNationalDexToInfiniteFusionMap(): Promise<
  Map<number, number>
> {
  try {
    const pokemon = await pokemonData.getAllPokemon();
    const map = new Map<number, number>();

    pokemon.forEach((p) => {
      map.set(p.nationalDexId, p.id);
    });

    return map;
  } catch (error) {
    console.error("Error creating National Dex to Infinite Fusion map:", error);
    return new Map();
  }
}

async function getInfiniteFusionToNationalDexMap(): Promise<
  Map<number, number>
> {
  try {
    const pokemon = await pokemonData.getAllPokemon();
    const map = new Map<number, number>();

    pokemon.forEach((p) => {
      map.set(p.id, p.nationalDexId);
    });

    return map;
  } catch (error) {
    console.error("Error creating Infinite Fusion to National Dex map:", error);
    return new Map();
  }
}

// React Query hooks using centralized query options
export function useAllPokemon(enabled = true) {
  return useQuery({
    ...pokemonQueries.all(),
    enabled,
  });
}

function usePokemonById(id: number) {
  return useQuery(pokemonQueries.byId(id));
}

function usePokemonByType(type: string) {
  return useQuery(pokemonQueries.byType(type));
}

// Name map hook that transforms existing Pokemon data
export function usePokemonNameMap(enabled = true) {
  const { data: allPokemon = [] } = useAllPokemon(enabled);

  const nameMap = new Map(allPokemon.map((p) => [p.id, p.name]));

  return nameMap;
}

export function usePokemonEvolutionData(
  pokemonId: number | undefined,
  enabled: boolean = true,
) {
  const { data: allPokemon, isLoading } = useQuery({
    ...pokemonQueries.all(),
    enabled,
  });

  if (!pokemonId || !allPokemon || !enabled)
    return { evolutions: [], preEvolution: null, isLoading };

  const currentPokemon = allPokemon.find((p) => p.id === pokemonId);
  if (!currentPokemon)
    return {
      evolutions: [],
      preEvolution: null,
      isLoading,
    };

  const evolutionIds = new Set(
    currentPokemon.evolution?.evolves_to.map((e) => e.id) || [],
  );
  const preEvolutionId = currentPokemon.evolution?.evolves_from?.id || null;
  const evolutions = allPokemon.filter((p) =>
    evolutionIds.has(p.nationalDexId),
  );
  const preEvolution = preEvolutionId
    ? allPokemon.find((p) => p.nationalDexId === preEvolutionId) || null
    : null;
  return {
    evolutions,
    preEvolution,
    isLoading,
  };
}

// Hook for searching Pokemon with debounced query
interface UsePokemonSearchOptions {
  query: string;
  enabled?: boolean;
  queryOptions?: Omit<
    QueryOptions<PokemonOptionType[], Error>,
    "queryKey" | "queryFn"
  >;
}

export function usePokemonSearch({
  query,
  enabled = true,
  queryOptions = {},
}: UsePokemonSearchOptions) {
  const { data: allPokemon = [] } = useAllPokemon(enabled);

  // Debounce the query to reduce search frequency
  const [debouncedQuery] = useDebounce(query, 50, {
    maxWait: 250,
    leading: true,
    trailing: true,
  });

  return useQuery<PokemonOptionType[], Error>({
    queryKey: ["pokemon", "search", debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery === "") return [];

      try {
        const searchResults = await searchService.search(debouncedQuery);
        return searchResults.map((result) => ({
          id: result.id,
          name: result.name,
          nationalDexId: result.nationalDexId,
        }));
      } catch (err) {
        console.warn(
          "searchService failed, using client-side filtering fallback",
          err,
        );
        const normalizedQuery = debouncedQuery.toLowerCase();
        const matches: PokemonOptionType[] = [];
        for (const pokemon of allPokemon) {
          if (pokemon.name.toLowerCase().includes(normalizedQuery)) {
            matches.push({
              id: pokemon.id,
              name: pokemon.name,
              nationalDexId: pokemon.nationalDexId,
            });
          }
        }
        return matches;
      }
    },
    select: (data) => {
      return data?.filter((p) => p.id !== 0) ?? [];
    },
    enabled: enabled && allPokemon.length > 0 && debouncedQuery !== "",
    placeholderData: keepPreviousData,
    staleTime: 0, // Don't cache - always fetch fresh data
    gcTime: 0, // Don't keep in garbage collection
    ...queryOptions,
    persister: undefined,
  });
}
