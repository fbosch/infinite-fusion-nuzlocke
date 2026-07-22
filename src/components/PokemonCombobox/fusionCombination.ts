import type { PokemonOptionType } from "@/loaders/pokemon";

export interface FusionCombination {
  head: PokemonOptionType;
  body: PokemonOptionType;
}

type PokemonSearchResult = Pick<
  PokemonOptionType,
  "id" | "name" | "nationalDexId"
>;

const FUSION_COMBINATION_PATTERN = /^(\d+)\.(\d+)$/;

export function resolveFusionCombination(
  query: string,
  pokemon: PokemonSearchResult[],
): FusionCombination | null {
  const match = FUSION_COMBINATION_PATTERN.exec(query.trim());
  if (!match) {
    return null;
  }

  const headId = Number(match[1]);
  const bodyId = Number(match[2]);
  const head = pokemon.find(({ id }) => id === headId);
  const body = pokemon.find(({ id }) => id === bodyId);

  if (!head || !body) {
    return null;
  }

  return {
    head: toPokemonOption(head),
    body: toPokemonOption(body),
  };
}

function toPokemonOption(pokemon: PokemonSearchResult): PokemonOptionType {
  return {
    id: pokemon.id,
    name: pokemon.name,
    nationalDexId: pokemon.nationalDexId,
  };
}
