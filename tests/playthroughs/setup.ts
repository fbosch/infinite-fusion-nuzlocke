import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { z } from 'zod';

// Import modules after mocks are set up (mocks should be imported in each test file)
import {
  playthroughActions,
  playthroughsStore,
  PlaythroughSchema,
  useActivePlaythrough,
  useIsRemixMode,
  useGameMode,
  useIsRandomizedMode,
  usePlaythroughById,
  useIsLoading,
  useEncounters,
  usePlaythroughsSnapshot,
  usePreferredVariant,
} from '../../src/stores/playthroughs';
import { PokemonOptionSchema } from '../../src/loaders/pokemon';

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
  const playthroughId = playthroughActions.createPlaythrough('Test Run');
  playthroughActions.setActivePlaythrough(playthroughId);

  return playthroughId;
};

// Export everything needed by test files
export {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  afterEach,
  renderHook,
  act,
  playthroughActions,
  playthroughsStore,
  PlaythroughSchema,
  useActivePlaythrough,
  useIsRemixMode,
  useGameMode,
  useIsRandomizedMode,
  usePlaythroughById,
  useIsLoading,
  useEncounters,
  usePlaythroughsSnapshot,
  usePreferredVariant,
};
