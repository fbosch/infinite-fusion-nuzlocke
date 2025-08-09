import {
  useQuery,
  useMutation,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { spriteQueries, spriteMutations } from '@/lib/queries/sprites';
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

export function useSpriteCredits(
  headId?: number | null,
  bodyId?: number | null,
  enabled: boolean = true
) {
  return useQuery({
    ...spriteQueries.credits(headId, bodyId),
    staleTime: ms('24h'), // Cache credits for 24 hours
    gcTime: ms('48h'),
    enabled: !!(headId || bodyId) && enabled,
  });
}

export function useSetPrefferedVariant() {
  return useMutation(spriteMutations.setPreferredVariant());
}

type PreferredVariantKey = ReturnType<
  typeof spriteQueries.preferredVariant
>['queryKey'];
type PreferredVariantOptions = Omit<
  UseQueryOptions<string, Error, string, PreferredVariantKey>,
  'queryKey' | 'queryFn'
>;

export function usePreferredVariantQuery(
  headId?: number | null,
  bodyId?: number | null,
  options?: PreferredVariantOptions
) {
  const base = spriteQueries.preferredVariant(headId, bodyId);
  return useQuery({ ...base, ...(options ?? {}) });
}

export function useCyclePreferredVariant() {
  return useMutation(spriteMutations.cyclePreferredVariant());
}
