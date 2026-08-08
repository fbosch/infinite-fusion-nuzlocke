import type { DexEntry } from "../scrape-pokedex";

interface PokemonType {
  name: string;
}

export interface PokemonSpeciesData {
  evolution_chain?: {
    url: string;
  };
  generation: string | null;
  is_legendary: boolean;
  is_mythical: boolean;
}

export interface PokemonSpeciesApiData {
  evolution_chain?: {
    url: string;
  };
  generation?: {
    name: string;
  } | null;
  is_legendary: boolean;
  is_mythical: boolean;
}

export interface EvolutionDetail {
  condition?: string;
  id: number;
  item?: string;
  location?: string;
  min_level?: number;
  name: string;
  trigger?: string;
}

export interface EvolutionData {
  evolves_from?: EvolutionDetail;
  evolves_to: EvolutionDetail[];
}

export interface ProcessedPokemonData {
  evolution?: EvolutionData;
  id: number;
  name: string;
  nationalDexId: number;
  species: PokemonSpeciesData;
  types: PokemonType[];
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
    evolution,
    id: entry.id,
    name: entry.name,
    nationalDexId: pokemon.id,
    species: {
      evolution_chain: species.evolution_chain,
      generation: species.generation?.name ?? null,
      is_legendary: species.is_legendary,
      is_mythical: species.is_mythical,
    },
    types: pokemon.types.map((type) => ({ name: type.type.name })),
  };
}
