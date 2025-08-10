import { useQuery } from '@tanstack/react-query';
import { spriteQueries } from '@/lib/queries/sprites';
import { useState, useCallback } from 'react';
import {
  getPreferredVariant,
  setPreferredVariant,
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
 * Simple hook for preferred variants - no React Query, just direct state
 */
export function usePreferredVariantState(
  headId?: number | null,
  bodyId?: number | null
) {
  // Compute initial value directly during render
  const initialVariant =
    headId || bodyId ? (getPreferredVariant(headId, bodyId) ?? '') : '';
  const [variant, setVariant] = useState<string>(initialVariant);

  // Update function that immediately updates both state and localStorage
  const updateVariant = useCallback(
    async (newVariant: string) => {
      if (headId || bodyId) {
        // Update localStorage and in-memory Map
        setPreferredVariant(headId, bodyId, newVariant);
        // Update local state immediately
        setVariant(newVariant);
      }
    },
    [headId, bodyId]
  );

  return {
    variant,
    updateVariant,
    isLoading: false, // No loading state needed
  };
}

export function useSetPrefferedVariant() {
  // This hook is no longer needed since we're using direct state management
  throw new Error(
    'useSetPrefferedVariant is deprecated. Use usePreferredVariantState instead.'
  );
}

export function usePreferredVariantQuery(
  _headId?: number | null,
  _bodyId?: number | null,
  _opts?: { enabled?: boolean }
) {
  // This hook is no longer needed since we're using direct state management
  throw new Error(
    'usePreferredVariantQuery is deprecated. Use usePreferredVariantState instead.'
  );
}

export function useCyclePreferredVariant() {
  // This hook is no longer needed since we're using direct state management
  throw new Error(
    'useCyclePreferredVariant is deprecated. Use usePreferredVariantState instead.'
  );
}

export function usePreferredVariantSuspenseQuery(
  _headId?: number | null,
  _bodyId?: number | null
) {
  // This hook is no longer needed since we're using direct state management
  throw new Error(
    'usePreferredVariantSuspenseQuery is deprecated. Use usePreferredVariantState instead.'
  );
}
