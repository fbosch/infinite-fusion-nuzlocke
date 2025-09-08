import { DexEntry } from '../../scripts/utils/data-loading-utils';
import { useAllPokemon } from '@/loaders/pokemon';
import { useMemo } from 'react';

export function useBaseEntries() {
  // Use the existing Pokemon data hook and transform to DexEntry format
  const { data: allPokemon, isLoading, error } = useAllPokemon();

  // Transform Pokemon data to DexEntry format for backwards compatibility
  const baseEntries = useMemo((): DexEntry[] => {
    if (!allPokemon) return [];

    return allPokemon.map(pokemon => ({
      id: pokemon.id,
      name: pokemon.name,
      headNamePart: pokemon.headNamePart,
      bodyNamePart: pokemon.bodyNamePart,
    }));
  }, [allPokemon]);

  const getBaseEntryById = (id: number): DexEntry | undefined => {
    return baseEntries.find(entry => entry.id === id);
  };

  return {
    baseEntries,
    isLoading,
    error,
    getBaseEntryById,
  };
}
