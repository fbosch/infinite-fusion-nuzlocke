import { queryOptions, mutationOptions } from '@tanstack/react-query';
import spriteService from '@/services/spriteService';
import ms from 'ms';

// Sprite query options
export const spriteQueries = {
  variants: (headId?: number | null, bodyId?: number | null) =>
    queryOptions({
      queryKey: [
        'sprite',
        'variants',
        (headId && bodyId
          ? `${headId}.${bodyId}`
          : headId || bodyId
        )?.toString(),
      ],
      queryFn: () => spriteService.getArtworkVariants(headId, bodyId),
      enabled: !!(headId || bodyId),
      staleTime: ms('24h'), // Cache variants for 24 hours
      gcTime: ms('48h'),
    }),

  credits: (headId?: number | null, bodyId?: number | null) =>
    queryOptions({
      queryKey: [
        'sprite',
        'credits',
        (headId && bodyId
          ? `${headId}.${bodyId}`
          : headId || bodyId
        )?.toString(),
      ],
      queryFn: () => spriteService.getSpriteCredits(headId, bodyId),
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
        return await spriteService.setPreferredVariant(headId, bodyId, variant);
      },
    }),
};
