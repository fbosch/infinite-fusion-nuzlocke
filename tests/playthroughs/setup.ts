import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PokemonOptionType } from "@/loaders/pokemon";
import {
  useActivePlaythrough,
  useEncounters,
  useGameMode,
  useIsLoading,
  useIsRandomizedMode,
  useIsRemixMode,
  usePlaythroughById,
  usePlaythroughsSnapshot,
} from "@/stores/playthroughs/hooks";
// Import modules after mocks are set up (mocks should be imported in each test file)
import { playthroughActions } from "@/stores/playthroughs/index";
import { playthroughsStore } from "@/stores/playthroughs/store";

// Types
export type PokemonOption = PokemonOptionType;

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
  vi,
};
