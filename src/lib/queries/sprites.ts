import { queryOptions, mutationOptions } from '@tanstack/react-query';
import {
  getSpriteId,
  getArtworkVariants,
  getSpriteCredits,
} from '@/lib/sprites';
import { setPreferredVariant } from '@/lib/preferredVariants';
import ms from 'ms';

// Query key factories for consistent key generation
export const spriteKeys = {
  variants: (headId?: number | null, bodyId?: number | null) =>
    ['sprite', 'variants', getSpriteId(headId, bodyId)] as const,
  credits: (headId?: number | null, bodyId?: number | null) =>
    ['sprite', 'credits', getSpriteId(headId, bodyId)] as const,
};

// Sprite query options
export const spriteQueries = {
  variants: (headId?: number | null, bodyId?: number | null) =>
    queryOptions({
      queryKey: spriteKeys.variants(headId, bodyId),
      queryFn: () => getArtworkVariants(headId, bodyId),
      enabled: !!(headId || bodyId),
      staleTime: ms('24h'), // Cache variants for 24 hours
      gcTime: ms('48h'),
    }),

  credits: (headId?: number | null, bodyId?: number | null) =>
    queryOptions({
      queryKey: spriteKeys.credits(headId, bodyId),
      queryFn: () => getSpriteCredits(headId, bodyId),
      enabled: !!(headId || bodyId),
      staleTime: ms('3d'),
      gcTime: ms('48h'),
    }),
};

// Sprite mutation options
export const spriteMutations = {
  setPreferredVariant: () =>
    mutationOptions({
      mutationFn: async ({
        headId,
        bodyId,
        variant,
      }: {
        headId?: number | null;
        bodyId?: number | null;
        variant?: string;
      }) => {
        return await setPreferredVariant(headId, bodyId, variant);
      },
    }),
};
