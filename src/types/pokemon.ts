export type PokemonType = { name: string };

export type EvolutionDetail = {
  id: number;
  name: string;
  min_level?: number;
  trigger?: string;
  item?: string;
  location?: string;
  condition?: string;
};

export type Pokemon = {
  id: number;
  nationalDexId: number;
  name: string;
  types: PokemonType[];
  species: {
    is_legendary: boolean;
    is_mythical: boolean;
    generation: string | null;
    evolution_chain: { url: string } | null;
  };
  evolution?: {
    evolves_to: EvolutionDetail[];
    evolves_from?: EvolutionDetail;
  };
};
