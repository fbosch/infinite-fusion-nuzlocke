import { useMemo } from 'react';
import { usePreferredVariantQuery } from '@/hooks/useSprite';
import { getDisplayPokemon } from '@/components/PokemonSummaryCard/utils';
import { type PokemonOptionType } from '@/loaders/pokemon';
import { UseQueryResult } from '@tanstack/react-query';

/**
 * Hook to get the artwork variant for Pokemon/fusion display from global preferences
 */
export function usePreferredVariant(
  head: PokemonOptionType | null | undefined,
  body: PokemonOptionType | null | undefined,
  isFusion: boolean
): UseQueryResult<string, Error> {
  const normalizedHead = head ?? null;
  const normalizedBody = body ?? null;

  const displayState = useMemo(
    () => getDisplayPokemon(normalizedHead, normalizedBody, isFusion),
    [normalizedHead, normalizedBody, isFusion]
  );

  return usePreferredVariantQuery(displayState.head?.id, displayState.body?.id);
}
