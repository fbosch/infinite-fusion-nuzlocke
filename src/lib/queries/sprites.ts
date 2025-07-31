import { queryOptions } from '@tanstack/react-query';
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
};

// Query key factories for consistent key generation
export const spriteKeys = {
  variants: (headId?: number | null, bodyId?: number | null) =>
    [
      'sprite',
      'variants',
      (headId && bodyId ? `${headId}.${bodyId}` : headId || bodyId)?.toString(),
    ] as const,
};
