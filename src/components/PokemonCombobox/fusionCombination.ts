import type { PokemonOptionType } from "@/loaders/pokemon";

export interface FusionCombination {
  body: PokemonOptionType;
  head: PokemonOptionType;
}

type PokemonSearchResult = Pick<
  PokemonOptionType,
  "id" | "name" | "nationalDexId"
>;

const FUSION_COMBINATION_PATTERN = /^(\d+)\.(\d+)$/;

const isPokemonSearchResult = (
  pokemon: unknown,
): pokemon is PokemonSearchResult =>
  typeof pokemon === "object" &&
  pokemon !== null &&
  Number.isInteger((pokemon as PokemonSearchResult).id) &&
  typeof (pokemon as PokemonSearchResult).name === "string" &&
  (pokemon as PokemonSearchResult).name.length > 0 &&
  Number.isInteger((pokemon as PokemonSearchResult).nationalDexId);

export function resolveFusionCombination(
  query: string,
  pokemon: PokemonSearchResult[],
): FusionCombination | null {
  if (Array.isArray(pokemon) === false) {
    return null;
  }

  const match = FUSION_COMBINATION_PATTERN.exec(query.trim());
  if (!match) {
    return null;
  }

  const headId = Number(match[1]);
  const bodyId = Number(match[2]);
  const head = pokemon.find(
    (candidate) => isPokemonSearchResult(candidate) && candidate.id === headId,
  );
  const body = pokemon.find(
    (candidate) => isPokemonSearchResult(candidate) && candidate.id === bodyId,
  );

  if (!(head && body)) {
    return null;
  }

  return {
    body: toPokemonOption(body),
    head: toPokemonOption(head),
  };
}

function toPokemonOption(pokemon: PokemonSearchResult): PokemonOptionType {
  return {
    id: pokemon.id,
    name: pokemon.name,
    nationalDexId: pokemon.nationalDexId,
  };
}
