import { queryOptions, mutationOptions } from '@tanstack/react-query';
import {
  getSpriteId,
  getArtworkVariants,
  getSpriteCredits,
} from '@/lib/sprites';
import {
  setPreferredVariant,
  getPreferredVariant,
} from '@/lib/preferredVariants';
import { queryClient } from '@/lib/client';
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

  preferredVariant: (headId?: number | null, bodyId?: number | null) =>
    queryOptions({
      queryKey: spriteKeys.preferredVariant(headId, bodyId),
      queryFn: () => getPreferredVariant(headId, bodyId),
      enabled: !!(headId || bodyId),
      staleTime: 0, // Always fetch fresh data to check for cache updates
      gcTime: ms('5m'), // Keep in memory for 5 minutes
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
      onSuccess: (_, { headId, bodyId }) => {
        // Invalidate the preferred variant query for this specific Pokemon/fusion
        // This will trigger re-renders of components using the preferred variant query
        queryClient.invalidateQueries({
          queryKey: spriteKeys.preferredVariant(headId, bodyId),
        });
      },
    }),

  cyclePreferredVariant: () =>
    mutationOptions({
      mutationFn: async ({
        headId,
        bodyId,
        reverse = false,
      }: {
        headId?: number | null;
        bodyId?: number | null;
        reverse?: boolean;
      }) => {
        // Try to get variants from cache first
        const variantsKey = spriteKeys.variants(headId, bodyId);
        let availableVariants = queryClient.getQueryData<string[]>(variantsKey);

        // If not cached, fetch from service
        if (!availableVariants) {
          availableVariants = await getArtworkVariants(headId, bodyId);
        }

        // If no variants or only default, do nothing
        if (!availableVariants || availableVariants.length <= 1) {
          return null;
        }

        // Determine current and next variant
        const currentVariant = getPreferredVariant(headId, bodyId) || '';
        const currentIndex = availableVariants.indexOf(currentVariant);
        const nextIndex = reverse
          ? (currentIndex - 1 + availableVariants.length) %
            availableVariants.length
          : (currentIndex + 1) % availableVariants.length;

        const newVariant = availableVariants[nextIndex] || undefined;

        // Update global preferred variant
        await setPreferredVariant(headId, bodyId, newVariant);
        return newVariant;
      },
      onSuccess: (_newVariant, { headId, bodyId }) => {
        // Invalidate the preferred variant query to update any consumers
        queryClient.invalidateQueries({
          queryKey: spriteKeys.preferredVariant(headId, bodyId),
        });
      },
    }),
};
