import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import type { PokemonOptionSchema } from "../../src/loaders/pokemon";
// Import modules after mocks are set up (mocks should be imported in each test file)
import {
  PlaythroughSchema,
  playthroughActions,
  playthroughsStore,
  useActivePlaythrough,
  useEncounters,
  useGameMode,
  useIsLoading,
  useIsRandomizedMode,
  useIsRemixMode,
  usePlaythroughById,
  usePlaythroughsSnapshot,
  usePreferredVariant,
} from "../../src/stores/playthroughs";

// Types
export type PokemonOption = z.infer<typeof PokemonOptionSchema>;

// Utility functions
export const createMockPokemon = (name: string, id: number): PokemonOption => ({
  id,
  name,
  nationalDexId: id,
  originalLocation: undefined,
});

// Clean slate setup function - resets everything to empty state
export const setupCleanSlate = () => {
  // Clear all mocks
  vi.clearAllMocks();

  // Reset store state completely
  playthroughsStore.playthroughs = [];
  playthroughsStore.activePlaythroughId = undefined;
  playthroughsStore.isLoading = false;
  playthroughsStore.isSaving = false;
};

// Common test setup function that creates a playthrough
export const setupPlaythroughTest = () => {
  setupCleanSlate();

  // Create a test playthrough
  const playthroughId = playthroughActions.createPlaythrough("Test Run");
  playthroughActions.setActivePlaythrough(playthroughId);

  return playthroughId;
};

// Export everything needed by test files
export {
  act,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  PlaythroughSchema,
  playthroughActions,
  playthroughsStore,
  renderHook,
  useActivePlaythrough,
  useEncounters,
  useGameMode,
  useIsLoading,
  useIsRandomizedMode,
  useIsRemixMode,
  usePlaythroughById,
  usePlaythroughsSnapshot,
  usePreferredVariant,
  vi,
};
