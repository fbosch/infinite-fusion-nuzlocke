import { queryOptions } from '@tanstack/react-query';
import { getArtworkVariants } from '@/lib/sprites';
import { getSpriteCredits } from '@/lib/sprites';
import { getSpriteId } from '@/lib/sprites';
import { getPreferredVariant } from '@/lib/preferredVariants';
import ms from 'ms';

// Query key factories for consistent key generation
export const spriteKeys = {
  variants: (headId?: number | null, bodyId?: number | null) =>
    ['sprite', 'variants', getSpriteId(headId, bodyId)] as const,
  credits: (headId?: number | null, bodyId?: number | null) =>
    ['sprite', 'credits', getSpriteId(headId, bodyId)] as const,
  preferredVariant: (headId?: number | null, bodyId?: number | null) =>
    ['sprite', 'preferredVariant', getSpriteId(headId, bodyId)] as const,
};

// Sprite query options
export const spriteQueries = {
  variants: (headId?: number | null, bodyId?: number | null) =>
    queryOptions({
      queryKey: spriteKeys.variants(headId, bodyId),
      queryFn: () => getArtworkVariants(headId, bodyId),
      staleTime: ms('24h'), // Cache variants for 24 hours
      gcTime: ms('48h'),
      enabled: !!(headId || bodyId),
    }),

  credits: (headId?: number | null, bodyId?: number | null) =>
    queryOptions({
      queryKey: spriteKeys.credits(headId, bodyId),
      queryFn: () => getSpriteCredits(headId, bodyId),
      staleTime: ms('3d'),
      gcTime: ms('48h'),
      enabled: !!(headId || bodyId),
    }),

  preferredVariant: (headId?: number | null, bodyId?: number | null) =>
    queryOptions({
      queryKey: spriteKeys.preferredVariant(headId, bodyId),
      queryFn: () => getPreferredVariant(headId, bodyId) ?? '',
      enabled: !!(headId || bodyId),
      staleTime: 1, // Very short stale time (1ms)
      gcTime: Infinity, // Keep in cache indefinitely
      refetchOnMount: true, // Always refetch when component mounts
      refetchOnWindowFocus: false, // Don't refetch on window focus
    }),
};
