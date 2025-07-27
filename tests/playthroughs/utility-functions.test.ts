import { describe, it, expect, beforeEach, vi } from 'vitest';
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

// Now import the modules
import {
  playthroughActions,
  playthroughsStore,
} from '../../src/stores/playthroughs';
import { PokemonOptionSchema } from '../../src/loaders/pokemon';

type PokemonOption = z.infer<typeof PokemonOptionSchema>;

const createMockPokemon = (name: string, id: number): PokemonOption => ({
  id,
  name,
  nationalDexId: id,
  originalLocation: undefined,
});

describe('Playthroughs Store - Utility Functions', () => {
  beforeEach(() => {
    // Reset store state
    playthroughsStore.playthroughs = [];
    playthroughsStore.activePlaythroughId = undefined;

    // Create a test playthrough
    const playthroughId = playthroughActions.createPlaythrough('Test Run');
    playthroughActions.setActivePlaythrough(playthroughId);
  });

  describe('getLocationFromComboboxId', () => {
    it('should parse head combobox ID correctly', () => {
      const result =
        playthroughActions.getLocationFromComboboxId('route-1-head');
      expect(result).toEqual({ locationId: 'route-1', field: 'head' });
    });

    it('should parse body combobox ID correctly', () => {
      const result =
        playthroughActions.getLocationFromComboboxId('route-2-body');
      expect(result).toEqual({ locationId: 'route-2', field: 'body' });
    });

    it('should parse single combobox ID correctly', () => {
      const result =
        playthroughActions.getLocationFromComboboxId('route-3-single');
      expect(result).toEqual({ locationId: 'route-3', field: 'head' });
    });

    it('should fallback to head for plain location ID', () => {
      const result = playthroughActions.getLocationFromComboboxId('route-4');
      expect(result).toEqual({ locationId: 'route-4', field: 'head' });
    });
  });

  describe('clearEncounterFromLocation', () => {
    beforeEach(async () => {
      // Set up test encounters
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Regular encounter
      await playthroughActions.updateEncounter('route-1', pikachu);

      // Fusion encounter
      await playthroughActions.updateEncounter(
        'route-2',
        pikachu,
        'head',
        true
      );
      await playthroughActions.updateEncounter(
        'route-2',
        charmander,
        'body',
        false
      );
    });

    it('should clear entire encounter when no field specified', async () => {
      await playthroughActions.clearEncounterFromLocation('route-1');

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1']).toBeUndefined();
    });

    it('should remove regular encounter when clearing head', async () => {
      await playthroughActions.clearEncounterFromLocation('route-1', 'head');

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1']).toBeUndefined();
    });

    it('should preserve fusion structure when clearing head only', async () => {
      await playthroughActions.clearEncounterFromLocation('route-2', 'head');

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-2']).toBeDefined();
      expect(encounters!['route-2'].isFusion).toBe(true);
      expect(encounters!['route-2'].head).toBeNull();
      expect(encounters!['route-2'].body).toBeDefined();
      expect(encounters!['route-2'].body?.name).toBe('Charmander');
    });

    it('should preserve fusion structure when clearing body only', async () => {
      await playthroughActions.clearEncounterFromLocation('route-2', 'body');

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-2']).toBeDefined();
      expect(encounters!['route-2'].isFusion).toBe(true);
      expect(encounters!['route-2'].head).toBeDefined();
      expect(encounters!['route-2'].head?.name).toBe('Pikachu');
      expect(encounters!['route-2'].body).toBeNull();
    });

    it('should preserve fusion structure even when both head and body are cleared', async () => {
      await playthroughActions.clearEncounterFromLocation('route-2', 'head');
      await playthroughActions.clearEncounterFromLocation('route-2', 'body');

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-2']).toBeDefined();
      expect(encounters!['route-2'].isFusion).toBe(true);
      expect(encounters!['route-2'].head).toBeNull();
      expect(encounters!['route-2'].body).toBeNull();
    });

    it('should handle clearing from non-existent location gracefully', async () => {
      await playthroughActions.clearEncounterFromLocation(
        'non-existent',
        'head'
      );

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['non-existent']).toBeUndefined();
    });
  });
});
