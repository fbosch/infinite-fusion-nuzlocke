import { queryOptions } from "@tanstack/react-query";
import ms from "ms";
import { getPreferredVariant } from "@/lib/preferredVariants";
import {
  getArtworkVariants,
  getSpriteCredits,
  getSpriteId,
} from "@/lib/sprites";

// Query key factories for consistent key generation
export const spriteKeys = {
  credits: (headId?: number | null, bodyId?: number | null) =>
    ["sprite", "credits", getSpriteId(headId, bodyId)] as const,
  preferredVariant: (headId?: number | null, bodyId?: number | null) =>
    ["sprite", "preferredVariant", getSpriteId(headId, bodyId)] as const,
  variants: (headId?: number | null, bodyId?: number | null) =>
    ["sprite", "variants", getSpriteId(headId, bodyId)] as const,
};

// Sprite query options
export const spriteQueries = {
  credits: (headId?: number | null, bodyId?: number | null) =>
    queryOptions({
      enabled: !!(headId || bodyId),
      gcTime: ms("48h"),
      queryFn: () => getSpriteCredits(headId, bodyId),
      queryKey: spriteKeys.credits(headId, bodyId),
      staleTime: ms("3d"),
    }),

  preferredVariant: (headId?: number | null, bodyId?: number | null) =>
    queryOptions({
      enabled: !!(headId || bodyId),
      gcTime: Number.POSITIVE_INFINITY, // Keep in cache indefinitely
      queryFn: () => getPreferredVariant(headId ?? null, bodyId ?? null) ?? "",
      queryKey: spriteKeys.preferredVariant(headId, bodyId),
      refetchOnMount: true, // Always refetch when component mounts
      refetchOnWindowFocus: false, // Don't refetch on window focus
      staleTime: 1, // Very short stale time (1ms)
    }),
  variants: (headId?: number | null, bodyId?: number | null) =>
    queryOptions({
      enabled: !!(headId || bodyId),
      gcTime: ms("48h"),
      queryFn: () => getArtworkVariants(headId, bodyId),
      queryKey: spriteKeys.variants(headId, bodyId),
      staleTime: ms("24h"), // Cache variants for 24 hours
    }),
};
