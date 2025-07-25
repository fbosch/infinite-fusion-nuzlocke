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
vi.mock('../src/services/spriteService', () => ({
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
vi.mock('../src/services/searchService', () => ({
  default: {
    search: vi.fn().mockResolvedValue([]),
  },
}));

// Now import the modules
import {
  playthroughActions,
  playthroughsStore,
  useActivePlaythrough,
  useIsRemixMode,
  usePlaythroughById,
  useIsLoading,
  useEncounters,
  usePlaythroughsSnapshot,
} from '../src/stores/playthroughs';
import { PokemonOptionSchema } from '../src/loaders/pokemon';

type PokemonOption = z.infer<typeof PokemonOptionSchema>;

const createMockPokemon = (name: string, id: number): PokemonOption => ({
  id,
  name,
  nationalDexId: id,
  originalLocation: undefined,
});

describe('Playthroughs Store - Drag and Drop Operations', () => {
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
      playthroughActions.clearEncounterFromLocation('route-1');

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1']).toBeUndefined();
    });

    it('should remove regular encounter when clearing head', async () => {
      playthroughActions.clearEncounterFromLocation('route-1', 'head');

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1']).toBeUndefined();
    });

    it('should preserve fusion structure when clearing head only', async () => {
      playthroughActions.clearEncounterFromLocation('route-2', 'head');

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-2']).toBeDefined();
      expect(encounters!['route-2'].isFusion).toBe(true);
      expect(encounters!['route-2'].head).toBeNull();
      expect(encounters!['route-2'].body).toBeDefined();
      expect(encounters!['route-2'].body?.name).toBe('Charmander');
    });

    it('should preserve fusion structure when clearing body only', async () => {
      playthroughActions.clearEncounterFromLocation('route-2', 'body');

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-2']).toBeDefined();
      expect(encounters!['route-2'].isFusion).toBe(true);
      expect(encounters!['route-2'].head).toBeDefined();
      expect(encounters!['route-2'].head?.name).toBe('Pikachu');
      expect(encounters!['route-2'].body).toBeNull();
    });

    it('should preserve fusion structure even when both head and body are cleared', async () => {
      playthroughActions.clearEncounterFromLocation('route-2', 'head');
      playthroughActions.clearEncounterFromLocation('route-2', 'body');

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-2']).toBeDefined();
      expect(encounters!['route-2'].isFusion).toBe(true);
      expect(encounters!['route-2'].head).toBeNull();
      expect(encounters!['route-2'].body).toBeNull();
    });

    it('should handle clearing from non-existent location gracefully', async () => {
      playthroughActions.clearEncounterFromLocation('non-existent', 'head');

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['non-existent']).toBeUndefined();
    });
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
      playthroughActions.clearEncounterFromLocation('route-2', 'head');

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

  describe('Drag and Drop Logic Tests', () => {
    // Simulate the canSwitch logic from PokemonCombobox
    const simulateCanSwitchLogic = (
      isFromDifferentCombobox: boolean,
      currentDragValue: { uid?: string; name: string } | null,
      targetValue: { uid?: string; name: string } | null
    ): boolean => {
      // This is the FIXED logic that compares by uid instead of name
      return (
        isFromDifferentCombobox &&
        currentDragValue !== null &&
        targetValue !== null &&
        currentDragValue.uid !== targetValue.uid
      );
    };

    // Simulate the BROKEN logic that was causing the bug
    const simulateBrokenCanSwitchLogic = (
      isFromDifferentCombobox: boolean,
      currentDragValue: { uid?: string; name: string } | null,
      targetValue: { uid?: string; name: string } | null
    ): boolean => {
      // This is the BROKEN logic that compared by name
      return (
        isFromDifferentCombobox &&
        currentDragValue !== null &&
        targetValue !== null &&
        currentDragValue.name !== targetValue.name
      );
    };

    describe('Fixed canSwitch logic (comparing by uid)', () => {
      it('should return true when dragging same-species Pokemon with different UIDs', () => {
        // Create two Pikachu with different UIDs (same species, different instances)
        const pikachu1 = { name: 'Pikachu', uid: 'pikachu_route1_uid_123' };
        const pikachu2 = { name: 'Pikachu', uid: 'pikachu_route2_uid_456' };

        const canSwitch = simulateCanSwitchLogic(
          true, // isFromDifferentCombobox
          pikachu1, // currentDragValue
          pikachu2 // targetValue
        );

        // Should return true because UIDs are different
        expect(canSwitch).toBe(true);
      });

      it('should return false when dragging the exact same Pokemon instance', () => {
        const pikachu = { name: 'Pikachu', uid: 'pikachu_route1_uid_123' };

        const canSwitch = simulateCanSwitchLogic(
          true, // isFromDifferentCombobox
          pikachu, // currentDragValue
          pikachu // targetValue (same instance)
        );

        // Should return false because it's the same Pokemon instance
        expect(canSwitch).toBe(false);
      });

      it('should return true when dragging different species', () => {
        const pikachu = { name: 'Pikachu', uid: 'pikachu_route1_uid_123' };
        const charmander = {
          name: 'Charmander',
          uid: 'charmander_route2_uid_456',
        };

        const canSwitch = simulateCanSwitchLogic(
          true, // isFromDifferentCombobox
          pikachu, // currentDragValue
          charmander // targetValue
        );

        // Should return true because they're different Pokemon
        expect(canSwitch).toBe(true);
      });
    });

    describe('Broken canSwitch logic (comparing by name) - demonstrates the bug', () => {
      it('should return false when dragging same-species Pokemon (causing the bug)', () => {
        // Create two Pikachu with different UIDs (same species, different instances)
        const pikachu1 = { name: 'Pikachu', uid: 'pikachu_route1_uid_123' };
        const pikachu2 = { name: 'Pikachu', uid: 'pikachu_route2_uid_456' };

        const canSwitch = simulateBrokenCanSwitchLogic(
          true, // isFromDifferentCombobox
          pikachu1, // currentDragValue
          pikachu2 // targetValue
        );

        // This would return false because names are the same (CAUSING THE BUG)
        expect(canSwitch).toBe(false);
      });

      it('should return true when dragging different species (worked fine)', () => {
        const pikachu = { name: 'Pikachu', uid: 'pikachu_route1_uid_123' };
        const charmander = {
          name: 'Charmander',
          uid: 'charmander_route2_uid_456',
        };

        const canSwitch = simulateBrokenCanSwitchLogic(
          true, // isFromDifferentCombobox
          pikachu, // currentDragValue
          charmander // targetValue
        );

        // This would work fine because names are different
        expect(canSwitch).toBe(true);
      });
    });

    describe('Edge cases', () => {
      it('should handle null values gracefully', () => {
        const pikachu = { name: 'Pikachu', uid: 'pikachu_route1_uid_123' };

        // Test with null currentDragValue
        expect(simulateCanSwitchLogic(true, null, pikachu)).toBe(false);

        // Test with null targetValue
        expect(simulateCanSwitchLogic(true, pikachu, null)).toBe(false);

        // Test with both null
        expect(simulateCanSwitchLogic(true, null, null)).toBe(false);
      });

      it('should handle undefined UIDs gracefully', () => {
        const pikachu1 = { name: 'Pikachu', uid: undefined };
        const pikachu2 = { name: 'Pikachu', uid: undefined };

        const canSwitch = simulateCanSwitchLogic(
          true, // isFromDifferentCombobox
          pikachu1, // currentDragValue
          pikachu2 // targetValue
        );

        // Should handle undefined UIDs (they would be considered equal)
        expect(canSwitch).toBe(false);
      });
    });
  });

  describe('originalLocation handling', () => {
    it('should update originalLocation when swapping encounters', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Set up encounters with originalLocation
      pikachu.originalLocation = 'route-1';
      charmander.originalLocation = 'route-2';

      await playthroughActions.updateEncounter('route-1', pikachu);
      await playthroughActions.updateEncounter('route-2', charmander);

      // Swap encounters
      playthroughActions.swapEncounters('route-1', 'route-2');

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();

      // originalLocation should be updated or preserved
      expect(encounters!['route-1'].head?.originalLocation).toBeDefined();
      expect(encounters!['route-2'].head?.originalLocation).toBeDefined();
    });

    it('should set originalLocation when moving encounters', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);

      await playthroughActions.updateEncounter('route-1', pikachu);
      await playthroughActions.moveEncounter('route-1', 'route-2', pikachu);

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-2'].head?.originalLocation).toBeDefined();
    });
  });

  describe('toggleEncounterFusion', () => {
    it('should toggle isFusion flag without removing head or body Pokemon', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Add nicknames to verify they're preserved
      pikachu.nickname = 'Sparky';
      charmander.nickname = 'Flame';

      // Create a fusion encounter
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

      let encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();

      // Verify initial fusion state
      expect(encounters!['route-1']).toBeDefined();
      expect(encounters!['route-1']?.isFusion).toBe(true);
      expect(encounters!['route-1']?.head).not.toBeNull();
      expect(encounters!['route-1']?.head?.name).toBe('Pikachu');
      expect(encounters!['route-1']?.head?.nickname).toBe('Sparky');
      expect(encounters!['route-1']?.body).not.toBeNull();
      expect(encounters!['route-1']?.body?.name).toBe('Charmander');
      expect(encounters!['route-1']?.body?.nickname).toBe('Flame');

      // Toggle fusion off (unfuse)
      await playthroughActions.toggleEncounterFusion('route-1');

      encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();

      // Verify both Pokemon are preserved but isFusion is false
      const encounter2 = encounters!['route-1'];
      expect(encounter2).toBeDefined();
      expect(encounter2!.isFusion).toBe(false);
      expect(encounter2!.head).toBeDefined();
      expect(encounter2!.head!.name).toBe('Pikachu');
      expect(encounter2!.head!.nickname).toBe('Sparky');
      expect(encounter2!.body).toBeDefined();
      expect(encounter2!.body!.name).toBe('Charmander');
      expect(encounter2!.body!.nickname).toBe('Flame');

      // Toggle fusion back on (re-fuse)
      await playthroughActions.toggleEncounterFusion('route-1');

      encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();

      // Verify both Pokemon are still preserved and isFusion is true again
      const encounter3 = encounters!['route-1'];
      expect(encounter3).toBeDefined();
      expect(encounter3!.isFusion).toBe(true);
      expect(encounter3!.head).toBeDefined();
      expect(encounter3!.head!.name).toBe('Pikachu');
      expect(encounter3!.head!.nickname).toBe('Sparky');
      expect(encounter3!.body).toBeDefined();
      expect(encounter3!.body!.name).toBe('Charmander');
      expect(encounter3!.body!.nickname).toBe('Flame');
    });

    it('should toggle isFusion from false to true for regular encounter', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      pikachu.nickname = 'Sparky';

      // Create a regular encounter
      await playthroughActions.updateEncounter('route-1', pikachu);

      let encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();

      // Verify initial regular encounter state
      expect(encounters!['route-1'].isFusion).toBe(false);
      expect(encounters!['route-1'].head?.name).toBe('Pikachu');
      expect(encounters!['route-1'].head?.nickname).toBe('Sparky');
      expect(encounters!['route-1'].body).toBeNull();

      // Toggle to fusion mode
      await playthroughActions.toggleEncounterFusion('route-1');

      encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();

      // Verify head Pokemon is preserved, isFusion is true, body remains null
      expect(encounters!['route-1'].isFusion).toBe(true);
      expect(encounters!['route-1'].head?.name).toBe('Pikachu');
      expect(encounters!['route-1'].head?.nickname).toBe('Sparky');
      expect(encounters!['route-1'].body).toBeNull();
    });

    it('should handle toggle on non-existent encounter gracefully', async () => {
      // Try to toggle fusion on non-existent encounter
      await playthroughActions.toggleEncounterFusion('non-existent');

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();

      // Should create a new encounter with default values and isFusion true
      expect(encounters!['non-existent']).toBeDefined();
      expect(encounters!['non-existent'].isFusion).toBe(true);
      expect(encounters!['non-existent'].head).toBeNull();
      expect(encounters!['non-existent'].body).toBeNull();
    });

    it('should move body to head when unfusing if head is empty', async () => {
      const charmander = createMockPokemon('Charmander', 4);
      charmander.nickname = 'Flame';

      // Create a fusion with only body filled
      await playthroughActions.updateEncounter('route-1', null, 'head', true);
      await playthroughActions.updateEncounter(
        'route-1',
        charmander,
        'body',
        false
      );

      let encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();

      // Verify initial state: fusion with empty head, filled body
      const initialEncounter = encounters!['route-1'];
      expect(initialEncounter).toBeDefined();
      expect(initialEncounter!.isFusion).toBe(true);
      expect(initialEncounter!.head).toBeNull();
      expect(initialEncounter!.body).toBeDefined();
      expect(initialEncounter!.body!.name).toBe('Charmander');
      expect(initialEncounter!.body!.nickname).toBe('Flame');

      // Toggle fusion off (unfuse)
      await playthroughActions.toggleEncounterFusion('route-1');

      encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();

      // Verify body moved to head, body cleared, isFusion false
      const finalEncounter = encounters!['route-1'];
      expect(finalEncounter).toBeDefined();
      expect(finalEncounter!.isFusion).toBe(false);
      expect(finalEncounter!.head).toBeDefined();
      expect(finalEncounter!.head!.name).toBe('Charmander');
      expect(finalEncounter!.head!.nickname).toBe('Flame');
      expect(finalEncounter!.body).toBeNull();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle operations on playthrough without active playthrough', async () => {
      playthroughsStore.activePlaythroughId = undefined;

      const pikachu = createMockPokemon('Pikachu', 25);

      // These should not throw errors
      playthroughActions.clearEncounterFromLocation('route-1');
      playthroughActions.moveEncounter('route-1', 'route-2', pikachu);
      playthroughActions.swapEncounters('route-1', 'route-2');

      // No encounters should be created
      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(Object.keys(encounters!)).toHaveLength(0);
    });

    it('should preserve encounter structure when performing multiple operations', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Create fusion
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

      // Clear head, then add new head
      playthroughActions.clearEncounterFromLocation('route-1', 'head');
      const squirtle = createMockPokemon('Squirtle', 7);
      await playthroughActions.updateEncounter(
        'route-1',
        squirtle,
        'head',
        false
      );

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1'].isFusion).toBe(true);
      expect(encounters!['route-1'].head?.name).toBe('Squirtle');
      expect(encounters!['route-1'].body?.name).toBe('Charmander');
    });
  });

  describe('status synchronization in fusion encounters', () => {
    it('should sync status to other Pokemon when setting status on one part of fusion', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Create a fusion encounter with both head and body
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

      // Verify initial state - no status on either Pokemon
      let encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1'].head?.status).toBeUndefined();
      expect(encounters!['route-1'].body?.status).toBeUndefined();

      // Set status on head Pokemon
      const pikachuWithStatus = { ...pikachu, status: 'captured' as const };
      await playthroughActions.updateEncounter(
        'route-1',
        pikachuWithStatus,
        'head',
        false
      );

      // Both Pokemon should now have the same status
      encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1'].head?.status).toBe('captured');
      expect(encounters!['route-1'].body?.status).toBe('captured');
    });

    it('should sync status when setting on body Pokemon', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Create a fusion encounter
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

      // Set status on body Pokemon
      const charmanderWithStatus = {
        ...charmander,
        status: 'deceased' as const,
      };
      await playthroughActions.updateEncounter(
        'route-1',
        charmanderWithStatus,
        'body',
        false
      );

      // Both Pokemon should now have the same status
      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1'].head?.status).toBe('deceased');
      expect(encounters!['route-1'].body?.status).toBe('deceased');
    });

    it('should not overwrite existing status when other Pokemon already has one', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Create head Pokemon with existing status
      const pikachuWithStatus = { ...pikachu, status: 'captured' as const };
      await playthroughActions.updateEncounter(
        'route-1',
        pikachuWithStatus,
        'head',
        true
      );
      await playthroughActions.updateEncounter(
        'route-1',
        charmander,
        'body',
        false
      );

      // Set different status on body Pokemon
      const charmanderWithStatus = {
        ...charmander,
        status: 'deceased' as const,
      };
      await playthroughActions.updateEncounter(
        'route-1',
        charmanderWithStatus,
        'body',
        false
      );

      // Each Pokemon should keep its own status (no synchronization)
      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1'].head?.status).toBe('captured');
      expect(encounters!['route-1'].body?.status).toBe('deceased');
    });

    it('should not sync status in non-fusion encounters', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);

      // Create a regular (non-fusion) encounter
      const pikachuWithStatus = { ...pikachu, status: 'captured' as const };
      await playthroughActions.updateEncounter(
        'route-1',
        pikachuWithStatus,
        'head',
        false
      );

      // Only head should have status, body should be null
      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1'].head?.status).toBe('captured');
      expect(encounters!['route-1'].body).toBeNull();
      expect(encounters!['route-1'].isFusion).toBe(false);
    });

    it('should only sync when both head and body Pokemon exist and one is being updated with status', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);

      // Create fusion encounter with only head Pokemon
      const pikachuWithStatus = { ...pikachu, status: 'captured' as const };
      await playthroughActions.updateEncounter(
        'route-1',
        pikachuWithStatus,
        'head',
        true
      );

      // Only head should have status since body doesn't exist yet
      let encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1'].head?.status).toBe('captured');
      expect(encounters!['route-1'].body).toBeNull();

      // Add body Pokemon without status
      const charmander = createMockPokemon('Charmander', 4);
      await playthroughActions.updateEncounter(
        'route-1',
        charmander,
        'body',
        false
      );

      // Body should NOT automatically get the same status as head when just being added
      // Status sync only happens when updating a Pokemon that has a status
      encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1'].head?.status).toBe('captured');
      expect(encounters!['route-1'].body?.status).toBeUndefined();

      // Now if we update the body with a status, it should sync to head if head had no status
      // But since head already has status, no sync should occur
      const charmanderWithStatus = {
        ...charmander,
        status: 'deceased' as const,
      };
      await playthroughActions.updateEncounter(
        'route-1',
        charmanderWithStatus,
        'body',
        false
      );

      // Each should keep their own status (no overwriting)
      encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1'].head?.status).toBe('captured');
      expect(encounters!['route-1'].body?.status).toBe('deceased');
    });

    it('should sync status when updating Pokemon in complete fusion where other has no status', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Create fusion encounter with both Pokemon but no status
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

      // Verify neither has status initially
      let encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1'].head?.status).toBeUndefined();
      expect(encounters!['route-1'].body?.status).toBeUndefined();

      // Update head with status - should sync to body since body has no status
      const pikachuWithStatus = { ...pikachu, status: 'captured' as const };
      await playthroughActions.updateEncounter(
        'route-1',
        pikachuWithStatus,
        'head',
        false
      );

      // Both should now have the same status
      encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1'].head?.status).toBe('captured');
      expect(encounters!['route-1'].body?.status).toBe('captured');
    });

    it('should preserve other Pokemon properties during status sync', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Add nickname and other properties
      pikachu.nickname = 'Sparky';
      charmander.nickname = 'Flame';

      // Create fusion encounter
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

      // Set status on head
      const pikachuWithStatus = { ...pikachu, status: 'captured' as const };
      await playthroughActions.updateEncounter(
        'route-1',
        pikachuWithStatus,
        'head',
        false
      );

      // Verify all properties are preserved
      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1'].head?.nickname).toBe('Sparky');
      expect(encounters!['route-1'].head?.status).toBe('captured');
      expect(encounters!['route-1'].body?.nickname).toBe('Flame');
      expect(encounters!['route-1'].body?.status).toBe('captured');
    });
  });
});

describe('Playthroughs Store - Hooks', () => {
  beforeEach(() => {
    // Reset store state before each test
    playthroughsStore.playthroughs = [];
    playthroughsStore.activePlaythroughId = undefined;
    playthroughsStore.isLoading = false;
  });

  afterEach(() => {
    // Clean up any side effects
    vi.clearAllMocks();
  });

  describe('usePlaythroughsSnapshot', () => {
    it('should return the store snapshot', () => {
      const { result } = renderHook(() => usePlaythroughsSnapshot());

      // Should return the current state of the store
      expect(result.current.playthroughs).toEqual([]);
      expect(result.current.activePlaythroughId).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });

    it('should update when store changes', () => {
      const { result, rerender } = renderHook(() => usePlaythroughsSnapshot());

      // Initial state
      expect(result.current.playthroughs).toHaveLength(0);

      // Create a playthrough
      act(() => {
        const playthroughId = playthroughActions.createPlaythrough(
          'Test Run',
          false
        );
        playthroughActions.setActivePlaythrough(playthroughId);
      });

      // Force a re-render to pick up store changes
      rerender();

      // Should reflect the new state
      expect(result.current.playthroughs).toHaveLength(1);
      expect(result.current.playthroughs[0].name).toBe('Test Run');
      expect(result.current.activePlaythroughId).toBeDefined();
    });
  });

  describe('useActivePlaythrough', () => {
    it('should return null when no active playthrough exists', () => {
      const { result } = renderHook(() => useActivePlaythrough());
      expect(result.current).toBeNull();
    });

    it('should return the active playthrough when one exists', () => {
      let playthroughId: string;

      // Create and set active playthrough
      act(() => {
        playthroughId = playthroughActions.createPlaythrough('Test Run', false);
        playthroughActions.setActivePlaythrough(playthroughId);
      });

      const { result } = renderHook(() => useActivePlaythrough());

      expect(result.current).not.toBeNull();
      expect(result.current?.name).toBe('Test Run');
      expect(result.current?.id).toBe(playthroughId!);
      expect(result.current?.remixMode).toBe(false);
    });

    it('should update when active playthrough changes', () => {
      const { result, rerender } = renderHook(() => useActivePlaythrough());

      // Initially null
      expect(result.current).toBeNull();

      // Create first playthrough
      act(() => {
        const playthroughId1 = playthroughActions.createPlaythrough(
          'First Run',
          false
        );
        playthroughActions.setActivePlaythrough(playthroughId1);
      });

      rerender();
      expect(result.current?.name).toBe('First Run');

      // Create second playthrough
      act(() => {
        const playthroughId2 = playthroughActions.createPlaythrough(
          'Second Run',
          true
        );
        // Ensure the new playthrough becomes active
        playthroughsStore.activePlaythroughId = playthroughId2;
      });

      rerender();
      expect(result.current?.name).toBe('Second Run');
      expect(result.current?.remixMode).toBe(true);
    });

    it('should update when active playthrough is modified', () => {
      let playthroughId: string;

      act(() => {
        playthroughId = playthroughActions.createPlaythrough('Test Run', false);
        playthroughActions.setActivePlaythrough(playthroughId);
      });

      const { result, rerender } = renderHook(() => useActivePlaythrough());

      rerender();
      expect(result.current?.remixMode).toBe(false);

      // Toggle remix mode
      act(() => {
        playthroughActions.toggleRemixMode();
      });

      rerender();
      expect(result.current?.remixMode).toBe(true);
    });
  });

  describe('useIsRemixMode', () => {
    it('should return false when no active playthrough exists', () => {
      const { result } = renderHook(() => useIsRemixMode());
      expect(result.current).toBe(false);
    });

    it('should return the remix mode status of the active playthrough', () => {
      // Create classic mode playthrough
      act(() => {
        const playthroughId = playthroughActions.createPlaythrough(
          'Classic Run',
          false
        );
        playthroughActions.setActivePlaythrough(playthroughId);
      });

      const { result, rerender } = renderHook(() => useIsRemixMode());
      rerender();
      expect(result.current).toBe(false);

      // Toggle to remix mode
      act(() => {
        playthroughActions.toggleRemixMode();
      });

      rerender();
      expect(result.current).toBe(true);
    });

    it('should return true for remix mode playthrough', () => {
      // Create remix mode playthrough
      act(() => {
        const playthroughId = playthroughActions.createPlaythrough(
          'Remix Run',
          true
        );
        playthroughActions.setActivePlaythrough(playthroughId);
      });

      const { result } = renderHook(() => useIsRemixMode());
      expect(result.current).toBe(true);
    });
  });

  describe('usePlaythroughById', () => {
    it('should return null for undefined ID', () => {
      const { result } = renderHook(() => usePlaythroughById(undefined));
      expect(result.current).toBeNull();
    });

    it('should return null for non-existent playthrough ID', () => {
      const { result } = renderHook(() =>
        usePlaythroughById('non-existent-id')
      );
      expect(result.current).toBeNull();
    });

    it('should return the correct playthrough by ID', () => {
      let playthroughId1: string;
      let playthroughId2: string;

      act(() => {
        playthroughId1 = playthroughActions.createPlaythrough(
          'First Run',
          false
        );
        playthroughId2 = playthroughActions.createPlaythrough(
          'Second Run',
          true
        );
      });

      const { result: result1 } = renderHook(() =>
        usePlaythroughById(playthroughId1)
      );
      const { result: result2 } = renderHook(() =>
        usePlaythroughById(playthroughId2)
      );

      expect(result1.current?.name).toBe('First Run');
      expect(result1.current?.remixMode).toBe(false);

      expect(result2.current?.name).toBe('Second Run');
      expect(result2.current?.remixMode).toBe(true);
    });

    it('should update when the specific playthrough is modified', () => {
      let playthroughId: string;

      act(() => {
        playthroughId = playthroughActions.createPlaythrough('Test Run', false);
      });

      const { result, rerender } = renderHook(() =>
        usePlaythroughById(playthroughId!)
      );

      rerender();
      expect(result.current?.name).toBe('Test Run');

      // Update the playthrough name
      act(() => {
        playthroughActions.updatePlaythroughName(playthroughId!, 'Updated Run');
      });

      rerender();
      // Verify the playthrough was updated
      expect(result.current?.name).toBe('Updated Run');
      // The key test is that the name changed, indicating reactivity works
      expect(result.current?.updatedAt).toBeGreaterThan(0);
    });
  });

  describe('useIsLoading', () => {
    it('should return the loading state from the store', () => {
      const { result, rerender } = renderHook(() => useIsLoading());

      // Initially false (set in beforeEach)
      expect(result.current).toBe(false);

      // Set loading to true
      act(() => {
        playthroughsStore.isLoading = true;
      });

      rerender();
      expect(result.current).toBe(true);

      // Set loading back to false
      act(() => {
        playthroughsStore.isLoading = false;
      });

      rerender();
      expect(result.current).toBe(false);
    });
  });

  describe('useEncounters', () => {
    it('should return empty encounters when no active playthrough exists', () => {
      const { result } = renderHook(() => useEncounters());
      expect(result.current).toEqual({});
    });

    it('should return encounters from the active playthrough', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      await act(async () => {
        const playthroughId = playthroughActions.createPlaythrough(
          'Test Run',
          false
        );
        await playthroughActions.setActivePlaythrough(playthroughId);

        // Add some encounters
        await playthroughActions.updateEncounter('route-1', pikachu);
        await playthroughActions.updateEncounter('route-2', charmander);
      });

      const { result } = renderHook(() => useEncounters());

      expect(result.current).toBeDefined();
      expect(Object.keys(result.current!)).toHaveLength(2);
      expect(result.current!['route-1']?.head?.name).toBe('Pikachu');
      expect(result.current!['route-2']?.head?.name).toBe('Charmander');
    });

    it('should update when encounters are modified', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const squirtle = createMockPokemon('Squirtle', 7);

      await act(async () => {
        const playthroughId = playthroughActions.createPlaythrough(
          'Test Run',
          false
        );
        await playthroughActions.setActivePlaythrough(playthroughId);
      });

      const { result, rerender } = renderHook(() => useEncounters());

      // Initially empty
      expect(result.current).toBeDefined();
      expect(Object.keys(result.current!)).toHaveLength(0);

      // Add an encounter
      await act(async () => {
        await playthroughActions.updateEncounter('route-1', pikachu);
      });

      rerender();
      expect(Object.keys(result.current!)).toHaveLength(1);
      expect(result.current!['route-1']?.head?.name).toBe('Pikachu');

      // Update the encounter
      await act(async () => {
        await playthroughActions.updateEncounter('route-1', squirtle);
      });

      rerender();
      expect(result.current!['route-1']?.head?.name).toBe('Squirtle');

      // Remove the encounter
      act(() => {
        playthroughActions.resetEncounter('route-1');
      });

      rerender();
      expect(Object.keys(result.current!)).toHaveLength(0);
    });

    it('should handle fusion encounters correctly', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      await act(async () => {
        const playthroughId = playthroughActions.createPlaythrough(
          'Test Run',
          false
        );
        await playthroughActions.setActivePlaythrough(playthroughId);

        // Create a fusion encounter
        await playthroughActions.createFusion('route-1', pikachu, charmander);
      });

      const { result } = renderHook(() => useEncounters());

      expect(result.current).toBeDefined();
      expect(result.current!['route-1']?.isFusion).toBe(true);
      expect(result.current!['route-1']?.head?.name).toBe('Pikachu');
      expect(result.current!['route-1']?.body?.name).toBe('Charmander');
    });
  });

  // TODO: Add comprehensive tests for useEncounter hook once import issues are resolved
  // The useEncounter hook provides granular reactivity for individual encounters
  // and should be tested for:
  // - Returning null for non-existent locations
  // - Returning encounter data for existing locations
  // - Updating when specific encounters change
  // - Not updating when other encounters change
  // - Handling fusion encounters correctly
  // - Updating when artwork variants change
  // - Handling individual encounter timestamps

  describe('Hook performance and memoization', () => {
    it('should not cause unnecessary re-renders when unrelated data changes', () => {
      let renderCount = 0;

      act(() => {
        const playthroughId = playthroughActions.createPlaythrough(
          'Test Run',
          false
        );
        playthroughActions.setActivePlaythrough(playthroughId);
      });

      const { result } = renderHook(() => {
        renderCount++;
        return useIsRemixMode();
      });

      const initialRenderCount = renderCount;
      const initialValue = result.current;

      // Change unrelated store property
      act(() => {
        playthroughsStore.isLoading = !playthroughsStore.isLoading;
      });

      // Should not cause additional renders since remix mode didn't change
      expect(renderCount).toBe(initialRenderCount);
      expect(result.current).toBe(initialValue);
    });

    it('should properly memoize encounters when only metadata changes', () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      let renderCount = 0;

      act(() => {
        const playthroughId = playthroughActions.createPlaythrough(
          'Test Run',
          false
        );
        playthroughActions.setActivePlaythrough(playthroughId);
        playthroughActions.updateEncounter('route-1', pikachu);
      });

      const { result } = renderHook(() => {
        renderCount++;
        return useEncounters();
      });

      const initialRenderCount = renderCount;
      const initialEncounters = result.current;

      // Change loading state (unrelated to encounters)
      act(() => {
        playthroughsStore.isLoading = true;
      });

      // Encounters should remain the same reference due to memoization
      expect(result.current).toBe(initialEncounters);
    });
  });
});
