import { useQuery } from '@tanstack/react-query';
import { spriteQueries } from '@/lib/queries/sprites';
import { useSnapshot } from 'valtio';
import {
  getPreferredVariant,
  setPreferredVariant,
  preferredVariants,
} from '@/lib/preferredVariants';
import ms from 'ms';

/**
 * Hook to get artwork variants for a Pokémon or fusion
 */
export function useSpriteVariants(
  headId?: number | null,
  bodyId?: number | null,
  enabled: boolean = true
) {
  return useQuery({
    ...spriteQueries.variants(headId, bodyId),
    staleTime: ms('24h'), // Cache variants for 24 hours
    gcTime: ms('48h'),
    enabled: !!(headId || bodyId) && enabled,
  });
}

/**
 * Hook to get sprite credits for a Pokémon or fusion
 */
export function useSpriteCredits(
  headId?: number | null,
  bodyId?: number | null,
  enabled: boolean = true
) {
  return useQuery({
    ...spriteQueries.credits(headId, bodyId),
    staleTime: ms('3d'),
    gcTime: ms('48h'),
    enabled: !!(headId || bodyId) && enabled,
  });
}

/**
 * Simple hook for preferred variants - uses Valtio for reactivity
 */
export function usePreferredVariantState(
  headId: number | null,
  bodyId: number | null
) {
  // Use useSnapshot to make the component reactive to changes in the Valtio store
  useSnapshot(preferredVariants);

  // Get the current value from the Valtio store
  const variant = getPreferredVariant(headId, bodyId) ?? '';

  // Update function that immediately updates the Valtio store
  const updateVariant = async (newVariant: string) => {
    setPreferredVariant(headId, bodyId, newVariant);
  };

  return {
    variant,
    updateVariant,
    isLoading: false, // No loading state needed
  };
}

// Deprecated hooks - these are no longer used
export function useSetPrefferedVariant() {
  throw new Error(
    'useSetPrefferedVariant is deprecated. Use usePreferredVariantState instead.'
  );
}

export function useCyclePreferredVariant() {
  throw new Error(
    'useCyclePreferredVariant is deprecated. Use usePreferredVariantState instead.'
  );
}
