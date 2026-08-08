import {
  act as testingAct,
  renderHook as testingRenderHook,
} from "@testing-library/react";
import {
  afterEach as vitestAfterEach,
  beforeEach as vitestBeforeEach,
  describe as vitestDescribe,
  expect as vitestExpect,
  it as vitestIt,
  vi as vitestVi,
} from "vitest";
import type { PokemonOptionType } from "@/loaders/pokemon";
import {
  useActivePlaythrough as playthroughUseActivePlaythrough,
  useEncounters as playthroughUseEncounters,
  useGameMode as playthroughUseGameMode,
  useIsLoading as playthroughUseIsLoading,
  useIsRandomizedMode as playthroughUseIsRandomizedMode,
  useIsRemixMode as playthroughUseIsRemixMode,
  usePlaythroughById as playthroughUsePlaythroughById,
  usePlaythroughsSnapshot as playthroughUsePlaythroughsSnapshot,
} from "@/stores/playthroughs/hooks";
// Import modules after mocks are set up (mocks should be imported in each test file)
import { playthroughActions as storePlaythroughActions } from "@/stores/playthroughs/index";
import { playthroughsStore as storePlaythroughsStore } from "@/stores/playthroughs/store";

export const act = testingAct;
export const afterEach = vitestAfterEach;
export const beforeEach = vitestBeforeEach;
export const describe = vitestDescribe;
export const expect = vitestExpect;
export const it = vitestIt;
export const playthroughActions = storePlaythroughActions;
export const playthroughsStore = storePlaythroughsStore;
export const renderHook = testingRenderHook;
export const useActivePlaythrough = playthroughUseActivePlaythrough;
export const useEncounters = playthroughUseEncounters;
export const useGameMode = playthroughUseGameMode;
export const useIsLoading = playthroughUseIsLoading;
export const useIsRandomizedMode = playthroughUseIsRandomizedMode;
export const useIsRemixMode = playthroughUseIsRemixMode;
export const usePlaythroughById = playthroughUsePlaythroughById;
export const usePlaythroughsSnapshot = playthroughUsePlaythroughsSnapshot;
export const vi = vitestVi;

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
  vitestVi.clearAllMocks();

  // Reset store state completely
  storePlaythroughsStore.playthroughs = [];
  storePlaythroughsStore.activePlaythroughId = undefined;
  storePlaythroughsStore.isLoading = false;
  storePlaythroughsStore.isSaving = false;
};

// Common test setup function that creates a playthrough
export const setupPlaythroughTest = () => {
  setupCleanSlate();

  // Create a test playthrough
  const playthroughId = storePlaythroughActions.createPlaythrough("Test Run");
  storePlaythroughActions.setActivePlaythrough(playthroughId);

  return playthroughId;
};
