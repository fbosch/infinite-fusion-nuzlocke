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

describe('Playthroughs Store - Core Movement Operations', () => {
  beforeEach(() => {
    // Reset store state
    playthroughsStore.playthroughs = [];
    playthroughsStore.activePlaythroughId = undefined;

    // Create a test playthrough
    const playthroughId = playthroughActions.createPlaythrough('Test Run');
    playthroughActions.setActivePlaythrough(playthroughId);
  });

  describe('moveEncounter', () => {
    it('should move Pokemon from one location to another', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);

      // Set up source encounter
      await playthroughActions.updateEncounter('route-1', pikachu);

      // Move to new location
      await playthroughActions.moveEncounter('route-1', 'route-2', pikachu);

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1']).toBeUndefined();
      expect(encounters!['route-2']).toBeDefined();
      expect(encounters!['route-2'].head?.name).toBe('Pikachu');
    });

    it('should move entire encounter from one location to another', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Set up fusion encounter
      await playthroughActions.updateEncounter(
        'route-1',
        pikachu,
        'head',
        true
      );
      await playthroughActions.updateEncounter(
        'route-1',
        charmander,
        'body',
        false
      );

      // Move entire encounter to new location
      await playthroughActions.moveEncounter(
        'route-1',
        'route-2',
        pikachu,
        'head'
      );

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();

      // Source should be deleted
      expect(encounters!['route-1']).toBeUndefined();

      // Destination should have the moved Pokemon
      expect(encounters!['route-2']).toBeDefined();
      expect(encounters!['route-2'].head?.name).toBe('Pikachu');
    });

    it('should preserve nickname when moving Pokemon', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      // Add a nickname to the Pokemon
      pikachu.nickname = 'Sparky';

      // Set up source encounter
      await playthroughActions.updateEncounter('route-1', pikachu);

      // Move to new location
      await playthroughActions.moveEncounter('route-1', 'route-2', pikachu);

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();

      // Source should be deleted
      expect(encounters!['route-1']).toBeUndefined();

      // Destination should have the moved Pokemon with preserved nickname
      expect(encounters!['route-2']).toBeDefined();
      expect(encounters!['route-2'].head?.name).toBe('Pikachu');
      expect(encounters!['route-2'].head?.nickname).toBe('Sparky');
    });

    it('should preserve nickname when creating fusions', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Add nicknames to both Pokemon
      pikachu.nickname = 'Sparky';
      charmander.nickname = 'Flame';

      // Set up an existing encounter (this becomes the head)
      await playthroughActions.updateEncounter('route-1', pikachu);

      // Create fusion: existing Pokemon becomes head, new Pokemon becomes body
      await playthroughActions.createFusion('route-1', pikachu, charmander);

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();

      // Verify fusion was created with nicknames preserved
      expect(encounters!['route-1']).toBeDefined();
      expect(encounters!['route-1'].isFusion).toBe(true);
      expect(encounters!['route-1'].head?.name).toBe('Pikachu');
      expect(encounters!['route-1'].head?.nickname).toBe('Sparky');
      expect(encounters!['route-1'].body?.name).toBe('Charmander');
      expect(encounters!['route-1'].body?.nickname).toBe('Flame');
    });
  });

  describe('swapEncounters', () => {
    it('should preserve nicknames when swapping encounters', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Add nicknames to both Pokemon
      pikachu.nickname = 'Sparky';
      charmander.nickname = 'Flame';

      // Set up encounters
      await playthroughActions.updateEncounter('route-1', pikachu);
      await playthroughActions.updateEncounter('route-2', charmander);

      // Swap encounters
      playthroughActions.swapEncounters('route-1', 'route-2');

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();

      // Verify the Pokemon were swapped and nicknames preserved
      expect(encounters!['route-1'].head?.name).toBe('Charmander');
      expect(encounters!['route-1'].head?.nickname).toBe('Flame');
      expect(encounters!['route-2'].head?.name).toBe('Pikachu');
      expect(encounters!['route-2'].head?.nickname).toBe('Sparky');
    });

    it('should swap Pokemon between two regular encounters', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Set up encounters
      await playthroughActions.updateEncounter('route-1', pikachu);
      await playthroughActions.updateEncounter('route-2', charmander);

      // Swap encounters
      playthroughActions.swapEncounters('route-1', 'route-2');

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1'].head?.name).toBe('Charmander');
      expect(encounters!['route-2'].head?.name).toBe('Pikachu');
    });

    it('should swap specific fields between fusion encounters', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);
      const squirtle = createMockPokemon('Squirtle', 7);
      const bulbasaur = createMockPokemon('Bulbasaur', 1);

      // Set up fusion encounters
      await playthroughActions.updateEncounter(
        'route-1',
        pikachu,
        'head',
        true
      );
      await playthroughActions.updateEncounter(
        'route-1',
        charmander,
        'body',
        false
      );
      await playthroughActions.updateEncounter(
        'route-2',
        squirtle,
        'head',
        true
      );
      await playthroughActions.updateEncounter(
        'route-2',
        bulbasaur,
        'body',
        false
      );

      // Swap heads between fusions
      playthroughActions.swapEncounters('route-1', 'route-2', 'head', 'head');

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();

      // Check route-1: should have Squirtle head, Charmander body
      expect(encounters!['route-1'].head?.name).toBe('Squirtle');
      expect(encounters!['route-1'].body?.name).toBe('Charmander');
      expect(encounters!['route-1'].isFusion).toBe(true);

      // Check route-2: should have Pikachu head, Bulbasaur body
      expect(encounters!['route-2'].head?.name).toBe('Pikachu');
      expect(encounters!['route-2'].body?.name).toBe('Bulbasaur');
      expect(encounters!['route-2'].isFusion).toBe(true);
    });

    it('should swap head with body between different encounters', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);
      const squirtle = createMockPokemon('Squirtle', 7);

      // Set up encounters
      await playthroughActions.updateEncounter('route-1', pikachu);
      await playthroughActions.updateEncounter(
        'route-2',
        charmander,
        'head',
        true
      );
      await playthroughActions.updateEncounter(
        'route-2',
        squirtle,
        'body',
        false
      );

      // Swap regular encounter head with fusion body
      playthroughActions.swapEncounters('route-1', 'route-2', 'head', 'body');

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();

      // Check route-1: should have Squirtle
      expect(encounters!['route-1'].head?.name).toBe('Squirtle');
      expect(encounters!['route-1'].isFusion).toBe(false);

      // Check route-2: should have Charmander head, Pikachu body
      expect(encounters!['route-2'].head?.name).toBe('Charmander');
      expect(encounters!['route-2'].body?.name).toBe('Pikachu');
      expect(encounters!['route-2'].isFusion).toBe(true);
    });

    it('should handle swap with non-existent encounters gracefully', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      await playthroughActions.updateEncounter('route-1', pikachu);

      // Try to swap with non-existent encounter
      playthroughActions.swapEncounters('route-1', 'non-existent');

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();

      // Original encounter should be unchanged
      expect(encounters!['route-1'].head?.name).toBe('Pikachu');
      expect(encounters!['non-existent']).toBeUndefined();
    });

    it('should handle swap with null Pokemon gracefully', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);

      // Set up encounters with one having null head
      await playthroughActions.updateEncounter('route-1', pikachu);
      await playthroughActions.updateEncounter(
        'route-2',
        pikachu,
        'head',
        true
      );
      await playthroughActions.clearEncounterFromLocation('route-2', 'head');

      // Try to swap - should not work since route-2 head is null
      playthroughActions.swapEncounters('route-1', 'route-2');

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();

      // Encounters should be unchanged
      expect(encounters!['route-1'].head?.name).toBe('Pikachu');
      expect(encounters!['route-2'].head).toBeNull();
    });

    it('should swap same-species Pokemon correctly (preserving both instances)', async () => {
      // Create two Pikachu instances with different UIDs and nicknames
      const pikachu1 = createMockPokemon('Pikachu', 25);
      const pikachu2 = createMockPokemon('Pikachu', 25);

      // Add different nicknames to distinguish them
      pikachu1.nickname = 'Sparky';
      pikachu2.nickname = 'Lightning';

      // Generate UIDs to simulate real behavior
      pikachu1.uid = 'pikachu_route1_uid_123';
      pikachu2.uid = 'pikachu_route2_uid_456';

      // Set up encounters with same species but different instances
      await playthroughActions.updateEncounter('route-1', pikachu1);
      await playthroughActions.updateEncounter('route-2', pikachu2);

      const beforeEncounters = playthroughActions.getEncounters();
      expect(beforeEncounters).toBeDefined();

      // Verify initial setup - both Pokemon should be present with different UIDs
      expect(beforeEncounters!['route-1'].head?.name).toBe('Pikachu');
      expect(beforeEncounters!['route-1'].head?.nickname).toBe('Sparky');
      expect(beforeEncounters!['route-1'].head?.uid).toBe(
        'pikachu_route1_uid_123'
      );

      expect(beforeEncounters!['route-2'].head?.name).toBe('Pikachu');
      expect(beforeEncounters!['route-2'].head?.nickname).toBe('Lightning');
      expect(beforeEncounters!['route-2'].head?.uid).toBe(
        'pikachu_route2_uid_456'
      );

      // Swap the same-species Pokemon
      playthroughActions.swapEncounters('route-1', 'route-2');

      const afterEncounters = playthroughActions.getEncounters();
      expect(afterEncounters).toBeDefined();

      // Both encounters should still exist after swap
      expect(afterEncounters!['route-1']).toBeDefined();
      expect(afterEncounters!['route-2']).toBeDefined();

      // Verify the Pokemon were actually swapped (not lost)
      expect(afterEncounters!['route-1'].head?.name).toBe('Pikachu');
      expect(afterEncounters!['route-1'].head?.nickname).toBe('Lightning');
      expect(afterEncounters!['route-1'].head?.uid).toBe(
        'pikachu_route2_uid_456'
      );

      expect(afterEncounters!['route-2'].head?.name).toBe('Pikachu');
      expect(afterEncounters!['route-2'].head?.nickname).toBe('Sparky');
      expect(afterEncounters!['route-2'].head?.uid).toBe(
        'pikachu_route1_uid_123'
      );

      // This test ensures that same-species Pokemon with different UIDs
      // are correctly identified as different instances and swapped properly,
      // preventing the bug where one Pokemon would disappear
    });
  });
});
