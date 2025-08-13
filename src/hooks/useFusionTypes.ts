import { useMemo } from 'react';
import { useAllPokemon } from '@/loaders/pokemon';
import type { TypeName } from '@/lib/typings';
import { getFusionTyping, TypeQuery } from '@/lib/typings';
import { usePokemonTypes } from './usePokemonTypes';

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
    return { primary, secondary, isLoading: false };
  }, [allPokemon, isLoading, headQuery, bodyQuery, headSingle, bodySingle]);

  return result;
}

export default useFusionTypes;
