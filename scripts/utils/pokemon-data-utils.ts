import type { DexEntry } from "../scrape-pokedex";

interface PokemonType {
  name: string;
}

export interface PokemonSpeciesData {
  is_legendary: boolean;
  is_mythical: boolean;
  generation: string | null;
  evolution_chain?: {
    url: string;
  };
}

export interface PokemonSpeciesApiData {
  is_legendary: boolean;
  is_mythical: boolean;
  generation?: {
    name: string;
  } | null;
  evolution_chain?: {
    url: string;
  };
}

export interface EvolutionDetail {
  id: number;
  name: string;
  trigger?: string;
  min_level?: number;
  item?: string;
  location?: string;
  condition?: string;
}

export interface EvolutionData {
  evolves_from?: EvolutionDetail;
  evolves_to: EvolutionDetail[];
}

export interface ProcessedPokemonData {
  id: number;
  nationalDexId: number;
  name: string;
  types: PokemonType[];
  species: PokemonSpeciesData;
  evolution?: EvolutionData;
}

type PokemonApiData = {
  id: number;
  species: {
    name: string;
  };
  types: Array<{
    type: {
      name: string;
    };
  }>;
};

export function createProcessedPokemonData(
  entry: DexEntry,
  pokemon: PokemonApiData,
  species: PokemonSpeciesApiData,
  evolution: EvolutionData | undefined,
): ProcessedPokemonData {
  return {
    id: entry.id,
    nationalDexId: pokemon.id,
    name: entry.name,
    types: pokemon.types.map((type) => ({ name: type.type.name })),
    species: {
      is_legendary: species.is_legendary,
      is_mythical: species.is_mythical,
      generation: species.generation?.name ?? null,
      evolution_chain: species.evolution_chain,
    },
    evolution,
  };
}
