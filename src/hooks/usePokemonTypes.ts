import { useMemo } from 'react';
import { useAllPokemon } from '@/loaders/pokemon';
import type { TypeName } from '@/lib/typings';
import { getTypesForPokemon, TypeQuery } from '@/lib/typings';

export interface UsePokemonTypesResult {
  primary?: TypeName;
  secondary?: TypeName;
  isLoading: boolean;
}

export function usePokemonTypes(
  query: TypeQuery | undefined
): UsePokemonTypesResult {
  const { data: allPokemon = [], isLoading } = useAllPokemon();

  const result = useMemo<UsePokemonTypesResult>(() => {
    if (!query) return { isLoading };
    if (!allPokemon || allPokemon.length === 0) return { isLoading: true };

    const resolveBy = (q: TypeQuery) => {
      if ('name' in q) {
        const p = allPokemon.find(
          x => x.name.toLowerCase() === q.name?.toLowerCase()
        );
        return p ? getTypesForPokemon(p) : undefined;
      }
      if ('id' in q) {
        const p = allPokemon.find(x => x.id === q.id);
        return p ? getTypesForPokemon(p) : undefined;
      }
      if ('nationalDexId' in q) {
        const p = allPokemon.find(x => x.nationalDexId === q.nationalDexId);
        return p ? getTypesForPokemon(p) : undefined;
      }
      return undefined;
    };

    const types = resolveBy(query);
    if (!types) return { isLoading };
    return { ...types, isLoading: false };
  }, [allPokemon, isLoading, query]);

  return result;
}

export default usePokemonTypes;
