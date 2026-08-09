export interface PokemonType {
  name: string;
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

export interface Pokemon {
  evolution?: {
    evolves_to: EvolutionDetail[];
    evolves_from?: EvolutionDetail;
  };
  id: number;
  name: string;
  nationalDexId: number;
  species: {
    is_legendary: boolean;
    is_mythical: boolean;
    generation: string | null;
    evolution_chain: { url: string } | null;
  };
  types: PokemonType[];
}
