import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { z } from 'zod';

// Mock IndexedDB operations first
vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  createStore: vi.fn(() => ({
    // Mock store object that can be passed as second parameter
    name: 'mock-store',
    storeName: 'mock-object-store',
  })),
}));

// Mock sprite service to avoid Worker issues in tests
vi.mock('../../src/services/spriteService', () => ({
  default: {
    generateSpriteUrl: vi.fn(
      (headId, bodyId, variant = '') =>
        `mock-sprite-url-${headId || 'unknown'}-${bodyId || 'unknown'}${variant ? `-${variant}` : ''}`
    ),
    getArtworkVariants: vi.fn().mockResolvedValue(['']),
    getPreferredVariant: vi.fn().mockResolvedValue(undefined),
    setPreferredVariant: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock search service to avoid Worker issues in tests
vi.mock('../../src/services/searchService', () => ({
  default: {
    search: vi.fn().mockResolvedValue([]),
  },
}));

// Import the modules after mocks are set up
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

type PokemonOption = z.infer<typeof PokemonOptionSchema>;

const createMockPokemon = (name: string, id: number): PokemonOption => ({
  id,
  name,
  nationalDexId: id,
  originalLocation: undefined,
});

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
  createMockPokemon,
};
