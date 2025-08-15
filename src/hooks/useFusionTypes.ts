import { useMemo } from 'react';
import { useAllPokemon } from '@/loaders/pokemon';
import type { TypeName } from '@/lib/typings';
import { getFusionTyping, TypeQuery } from '@/lib/typings';
import { usePokemonTypes } from './usePokemonTypes';
import type { PokemonOptionType } from '@/loaders/pokemon';
import { canFuse } from '@/utils/pokemonPredicates';

export interface UseFusionTypesResult {
  primary?: TypeName;
  secondary?: TypeName;
  isLoading: boolean;
}

export function useFusionTypes(
  headQuery: TypeQuery | undefined,
  bodyQuery: TypeQuery | undefined
): UseFusionTypesResult {
  const { data: allPokemon = [], isLoading } = useAllPokemon();

  // Always compute individual typings so we can fall back when only one Pokémon is provided
  const headSingle = usePokemonTypes(headQuery);
  const bodySingle = usePokemonTypes(bodyQuery);

  const result = useMemo<UseFusionTypesResult>(() => {
    // Fallbacks: if only one query is provided, return that Pokémon's types
    if (headQuery && !bodyQuery) return headSingle;
    if (!headQuery && bodyQuery) return bodySingle;
    if (!headQuery && !bodyQuery) return { isLoading };
    if (!allPokemon || allPokemon.length === 0) return { isLoading: true };

    const findPokemon = (q: TypeQuery) => {
      if ('id' in q && q.id) return allPokemon.find(p => p.id === q.id);
      if ('nationalDexId' in q && q.nationalDexId)
        return allPokemon.find(p => p.nationalDexId === q.nationalDexId);
      if ('name' in q && q.name)
        return allPokemon.find(
          p => p.name.toLowerCase() === q.name!.toLowerCase()
        );
      return undefined;
    };

    const head = findPokemon(headQuery as TypeQuery);
    const body = findPokemon(bodyQuery as TypeQuery);
    if (!head || !body) return { isLoading };
    const { primary, secondary } = getFusionTyping(head, body);
    if (primary === secondary)
      return { primary, secondary: undefined, isLoading: false };
    return { primary, secondary, isLoading: false };
  }, [allPokemon, isLoading, headQuery, bodyQuery, headSingle, bodySingle]);

  return result;
}

/**
 * Simplified hook that directly handles fusion logic from Pokémon objects.
 * This eliminates the need for separate utility functions.
 */
export function useFusionTypesFromPokemon(
  head: PokemonOptionType | null,
  body: PokemonOptionType | null,
  isFusion: boolean
): UseFusionTypesResult {
  const headQuery = head?.id ? { id: head.id } : undefined;
  const bodyQuery =
    isFusion && body?.id && canFuse(head, body) ? { id: body.id } : undefined;

  // If it's not a fusion or can't fuse, prioritize head over body
  const finalHeadQuery = headQuery || (body?.id ? { id: body.id } : undefined);

  return useFusionTypes(finalHeadQuery, bodyQuery);
}

export default useFusionTypes;
