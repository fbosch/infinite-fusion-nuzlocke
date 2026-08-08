import type { TypeName } from "@/lib/typings";
import { getFusionTyping, type TypeQuery } from "@/lib/typings";
import type { Pokemon, PokemonOptionType } from "@/loaders/pokemon";
import { useAllPokemon } from "@/loaders/pokemon";
import { usePokemonTypes } from "./usePokemonTypes";

export interface UseFusionTypesResult {
  isLoading: boolean;
  primary?: TypeName;
  secondary?: TypeName;
}

function findPokemonByQuery(
  pokemon: Pokemon[],
  query: TypeQuery,
): Pokemon | undefined {
  if ("id" in query && query.id) {
    return pokemon.find((entry) => entry.id === query.id);
  }
  if ("nationalDexId" in query && query.nationalDexId) {
    return pokemon.find((entry) => entry.nationalDexId === query.nationalDexId);
  }
  if ("name" in query && query.name) {
    return pokemon.find(
      (entry) => entry.name.toLowerCase() === query.name?.toLowerCase(),
    );
  }
}

function getFusionTypesResult(
  head: Pokemon,
  body: Pokemon,
): UseFusionTypesResult {
  const { primary, secondary } = getFusionTyping(head, body);
  return {
    isLoading: false,
    primary,
    secondary: primary === secondary ? undefined : secondary,
  };
}

function useFusionTypes(
  headQuery: TypeQuery | undefined,
  bodyQuery: TypeQuery | undefined,
): UseFusionTypesResult {
  const hasPokemonQuery = Boolean(headQuery || bodyQuery);
  const { data: allPokemon = [], isLoading } = useAllPokemon(hasPokemonQuery);

  const headSingle = usePokemonTypes(headQuery);
  const bodySingle = usePokemonTypes(bodyQuery);

  if (!headQuery) {
    return bodyQuery ? bodySingle : { isLoading };
  }
  if (!bodyQuery) {
    return headSingle;
  }
  if (!allPokemon || allPokemon.length === 0) {
    return { isLoading: true };
  }

  const head = findPokemonByQuery(allPokemon, headQuery);
  const body = findPokemonByQuery(allPokemon, bodyQuery);
  if (!(head && body)) {
    return { isLoading };
  }

  return getFusionTypesResult(head, body);
}

/**
 * Simplified hook that directly handles fusion logic from Pokémon objects.
 * This eliminates the need for separate utility functions.
 */
export function useFusionTypesFromPokemon(
  head: PokemonOptionType | null,
  body: PokemonOptionType | null,
  isFusion: boolean,
): UseFusionTypesResult {
  const headQuery = head?.id ? { id: head.id } : undefined;
  const bodyQuery = isFusion && body?.id ? { id: body.id } : undefined;

  // If it's not a fusion, prioritize head over body
  const finalHeadQuery = headQuery || (body?.id ? { id: body.id } : undefined);

  return useFusionTypes(finalHeadQuery, bodyQuery);
}
