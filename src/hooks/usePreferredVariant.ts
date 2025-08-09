import { useMemo } from 'react';
import { usePreferredVariantQuery } from '@/hooks/useSprite';
import { getDisplayPokemon } from '@/components/PokemonSummaryCard/utils';
import { type PokemonOptionType } from '@/loaders/pokemon';

/**
 * Hook to get the artwork variant for Pokemon/fusion display from global preferences
 */
export function usePreferredVariant(
  head: PokemonOptionType | null | undefined,
  body: PokemonOptionType | null | undefined,
  isFusion: boolean
): string | undefined {
  // Convert undefined to null for consistency with getDisplayPokemon
  const normalizedHead = head ?? null;
  const normalizedBody = body ?? null;

  // Determine which Pokemon to get variant for based on display state
  const displayState = useMemo(
    () => getDisplayPokemon(normalizedHead, normalizedBody, isFusion),
    [normalizedHead, normalizedBody, isFusion]
  );

  // Get the query parameters for the preferred variant
  const { queryHeadId, queryBodyId } = useMemo(() => {
    if (displayState.isFusion && displayState.head && displayState.body) {
      // For fusion display
      return {
        queryHeadId: displayState.head.id,
        queryBodyId: displayState.body.id,
      };
    } else if (displayState.head || displayState.body) {
      // For single Pokemon display
      const pokemon = displayState.head || displayState.body!;
      return {
        queryHeadId: pokemon.id,
        queryBodyId: null,
      };
    }
    return { queryHeadId: null, queryBodyId: null };
  }, [displayState]);

  // Use the reactive query to get preferred variant from global cache
  const { data: preferredVariant } = usePreferredVariantQuery(
    queryHeadId,
    queryBodyId
  );

  return preferredVariant;
}
