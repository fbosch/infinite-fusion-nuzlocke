import { useQuery } from "@tanstack/react-query";
import ms from "ms";
import {
  getPreferredVariant,
  preferredVariants,
  setPreferredVariant,
} from "@/lib/preferredVariants";
import { spriteQueries } from "@/lib/queries/sprites";
import { useValtioSync } from "./useValtioSync";

/**
 * Hook to get artwork variants for a Pokémon or fusion
 */
export function useSpriteVariants(
  headId?: number | null,
  bodyId?: number | null,
  enabled: boolean = true,
) {
  return useQuery({
    ...spriteQueries.variants(headId, bodyId),
    staleTime: ms("24h"), // Cache variants for 24 hours
    gcTime: ms("48h"),
    enabled: !!(headId || bodyId) && enabled,
  });
}

/**
 * Hook to get sprite credits for a Pokémon or fusion
 */
export function useSpriteCredits(
  headId?: number | null,
  bodyId?: number | null,
  enabled: boolean = true,
) {
  return useQuery({
    ...spriteQueries.credits(headId, bodyId),
    staleTime: ms("3d"),
    gcTime: ms("48h"),
    enabled: !!(headId || bodyId) && enabled,
  });
}

/**
 * Simple hook for preferred variants - uses Valtio for reactivity
 * Compatible with React Compiler by using useValtioSync utility
 */
export function usePreferredVariantState(
  headId: number | null,
  bodyId: number | null,
) {
  // Use useValtioSync for React Compiler compatibility
  const variant = useValtioSync(
    preferredVariants,
    () => getPreferredVariant(headId, bodyId) ?? "",
    "",
  );

  // Update function that immediately updates the Valtio store
  const updateVariant = async (newVariant: string) => {
    setPreferredVariant(headId, bodyId, newVariant);
  };

  return {
    variant,
    updateVariant,
    isLoading: false,
  };
}
