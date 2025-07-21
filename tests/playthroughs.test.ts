import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { z } from 'zod';

// Mock IndexedDB operations first
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

// Now import the modules
import {
  playthroughActions,
  playthroughsStore,
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
    beforeEach(() => {
      // Set up test encounters
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Regular encounter
      playthroughActions.updateEncounter('route-1', pikachu);

      // Fusion encounter
      playthroughActions.updateEncounter('route-2', pikachu, 'head', true);
      playthroughActions.updateEncounter('route-2', charmander, 'body', false);
    });

    it('should clear entire encounter when no field specified', async () => {
      playthroughActions.clearEncounterFromLocation('route-1');

      const encounters = playthroughActions.getEncounters();
      expect(encounters['route-1']).toBeUndefined();
    });

    it('should remove regular encounter when clearing head', async () => {
      playthroughActions.clearEncounterFromLocation('route-1', 'head');

      const encounters = playthroughActions.getEncounters();
      expect(encounters['route-1']).toBeUndefined();
    });

    it('should preserve fusion structure when clearing head only', async () => {
      playthroughActions.clearEncounterFromLocation('route-2', 'head');

      const encounters = playthroughActions.getEncounters();
      expect(encounters['route-2']).toBeDefined();
      expect(encounters['route-2'].isFusion).toBe(true);
      expect(encounters['route-2'].head).toBeNull();
      expect(encounters['route-2'].body).toBeDefined();
      expect(encounters['route-2'].body?.name).toBe('Charmander');
    });

    it('should preserve fusion structure when clearing body only', async () => {
      playthroughActions.clearEncounterFromLocation('route-2', 'body');

      const encounters = playthroughActions.getEncounters();
      expect(encounters['route-2']).toBeDefined();
      expect(encounters['route-2'].isFusion).toBe(true);
      expect(encounters['route-2'].head).toBeDefined();
      expect(encounters['route-2'].head?.name).toBe('Pikachu');
      expect(encounters['route-2'].body).toBeNull();
    });

    it('should preserve fusion structure even when both head and body are cleared', async () => {
      playthroughActions.clearEncounterFromLocation('route-2', 'head');
      playthroughActions.clearEncounterFromLocation('route-2', 'body');

      const encounters = playthroughActions.getEncounters();
      expect(encounters['route-2']).toBeDefined();
      expect(encounters['route-2'].isFusion).toBe(true);
      expect(encounters['route-2'].head).toBeNull();
      expect(encounters['route-2'].body).toBeNull();
    });

    it('should handle clearing from non-existent location gracefully', async () => {
      playthroughActions.clearEncounterFromLocation('non-existent', 'head');

      const encounters = playthroughActions.getEncounters();
      expect(encounters['non-existent']).toBeUndefined();
    });
  });

  describe('moveEncounter', () => {
    it('should move Pokemon from one location to another', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);

      // Set up source encounter
      playthroughActions.updateEncounter('route-1', pikachu);

      // Move to new location
      playthroughActions.moveEncounter('route-1', 'route-2', pikachu);

      const encounters = playthroughActions.getEncounters();
      expect(encounters['route-1']).toBeUndefined();
      expect(encounters['route-2']).toBeDefined();
      expect(encounters['route-2'].head?.name).toBe('Pikachu');
    });

    it('should move entire encounter from one location to another', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Set up fusion encounter
      playthroughActions.updateEncounter('route-1', pikachu, 'head', true);
      playthroughActions.updateEncounter('route-1', charmander, 'body', false);

      // Move entire encounter to new location
      playthroughActions.moveEncounter('route-1', 'route-2', pikachu, 'head');

      const encounters = playthroughActions.getEncounters();

      // Source should be deleted
      expect(encounters['route-1']).toBeUndefined();

      // Destination should have the moved Pokemon
      expect(encounters['route-2']).toBeDefined();
      expect(encounters['route-2'].head?.name).toBe('Pikachu');
    });

    it('should preserve nickname when moving Pokemon', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      // Add a nickname to the Pokemon
      pikachu.nickname = 'Sparky';

      // Set up source encounter
      playthroughActions.updateEncounter('route-1', pikachu);

      // Move to new location
      playthroughActions.moveEncounter('route-1', 'route-2', pikachu);

      const encounters = playthroughActions.getEncounters();

      // Source should be deleted
      expect(encounters['route-1']).toBeUndefined();

      // Destination should have the moved Pokemon with preserved nickname
      expect(encounters['route-2']).toBeDefined();
      expect(encounters['route-2'].head?.name).toBe('Pikachu');
      expect(encounters['route-2'].head?.nickname).toBe('Sparky');
    });

    it('should preserve nickname when creating fusions', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Add nicknames to both Pokemon
      pikachu.nickname = 'Sparky';
      charmander.nickname = 'Flame';

      // Set up an existing encounter (this becomes the head)
      playthroughActions.updateEncounter('route-1', pikachu);

      // Create fusion: existing Pokemon becomes head, new Pokemon becomes body
      playthroughActions.createFusion('route-1', pikachu, charmander);

      const encounters = playthroughActions.getEncounters();

      // Verify fusion was created with nicknames preserved
      expect(encounters['route-1']).toBeDefined();
      expect(encounters['route-1'].isFusion).toBe(true);
      expect(encounters['route-1'].head?.name).toBe('Pikachu');
      expect(encounters['route-1'].head?.nickname).toBe('Sparky');
      expect(encounters['route-1'].body?.name).toBe('Charmander');
      expect(encounters['route-1'].body?.nickname).toBe('Flame');
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
      playthroughActions.updateEncounter('route-1', pikachu);
      playthroughActions.updateEncounter('route-2', charmander);

      // Swap encounters
      playthroughActions.swapEncounters('route-1', 'route-2');

      const encounters = playthroughActions.getEncounters();

      // Verify the Pokemon were swapped and nicknames preserved
      expect(encounters['route-1'].head?.name).toBe('Charmander');
      expect(encounters['route-1'].head?.nickname).toBe('Flame');
      expect(encounters['route-2'].head?.name).toBe('Pikachu');
      expect(encounters['route-2'].head?.nickname).toBe('Sparky');
    });

    it('should swap Pokemon between two regular encounters', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Set up encounters
      playthroughActions.updateEncounter('route-1', pikachu);
      playthroughActions.updateEncounter('route-2', charmander);

      // Swap encounters
      playthroughActions.swapEncounters('route-1', 'route-2');

      const encounters = playthroughActions.getEncounters();
      expect(encounters['route-1'].head?.name).toBe('Charmander');
      expect(encounters['route-2'].head?.name).toBe('Pikachu');
    });

    it('should swap specific fields between fusion encounters', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);
      const squirtle = createMockPokemon('Squirtle', 7);
      const bulbasaur = createMockPokemon('Bulbasaur', 1);

      // Set up fusion encounters
      playthroughActions.updateEncounter('route-1', pikachu, 'head', true);
      playthroughActions.updateEncounter('route-1', charmander, 'body', false);
      playthroughActions.updateEncounter('route-2', squirtle, 'head', true);
      playthroughActions.updateEncounter('route-2', bulbasaur, 'body', false);

      // Swap heads between fusions
      playthroughActions.swapEncounters('route-1', 'route-2', 'head', 'head');

      const encounters = playthroughActions.getEncounters();

      // Check route-1: should have Squirtle head, Charmander body
      expect(encounters['route-1'].head?.name).toBe('Squirtle');
      expect(encounters['route-1'].body?.name).toBe('Charmander');
      expect(encounters['route-1'].isFusion).toBe(true);

      // Check route-2: should have Pikachu head, Bulbasaur body
      expect(encounters['route-2'].head?.name).toBe('Pikachu');
      expect(encounters['route-2'].body?.name).toBe('Bulbasaur');
      expect(encounters['route-2'].isFusion).toBe(true);
    });

    it('should swap head with body between different encounters', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);
      const squirtle = createMockPokemon('Squirtle', 7);

      // Set up encounters
      playthroughActions.updateEncounter('route-1', pikachu);
      playthroughActions.updateEncounter('route-2', charmander, 'head', true);
      playthroughActions.updateEncounter('route-2', squirtle, 'body', false);

      // Swap regular encounter head with fusion body
      playthroughActions.swapEncounters('route-1', 'route-2', 'head', 'body');

      const encounters = playthroughActions.getEncounters();

      // Check route-1: should have Squirtle
      expect(encounters['route-1'].head?.name).toBe('Squirtle');
      expect(encounters['route-1'].isFusion).toBe(false);

      // Check route-2: should have Charmander head, Pikachu body
      expect(encounters['route-2'].head?.name).toBe('Charmander');
      expect(encounters['route-2'].body?.name).toBe('Pikachu');
      expect(encounters['route-2'].isFusion).toBe(true);
    });

    it('should handle swap with non-existent encounters gracefully', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      playthroughActions.updateEncounter('route-1', pikachu);

      // Try to swap with non-existent encounter
      playthroughActions.swapEncounters('route-1', 'non-existent');

      const encounters = playthroughActions.getEncounters();

      // Original encounter should be unchanged
      expect(encounters['route-1'].head?.name).toBe('Pikachu');
      expect(encounters['non-existent']).toBeUndefined();
    });

    it('should handle swap with null Pokemon gracefully', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);

      // Set up encounters with one having null head
      playthroughActions.updateEncounter('route-1', pikachu);
      playthroughActions.updateEncounter('route-2', pikachu, 'head', true);
      playthroughActions.clearEncounterFromLocation('route-2', 'head');

      // Try to swap - should not work since route-2 head is null
      playthroughActions.swapEncounters('route-1', 'route-2');

      const encounters = playthroughActions.getEncounters();

      // Encounters should be unchanged
      expect(encounters['route-1'].head?.name).toBe('Pikachu');
      expect(encounters['route-2'].head).toBeNull();
    });
  });

  describe('originalLocation handling', () => {
    it('should update originalLocation when swapping encounters', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Set up encounters with originalLocation
      pikachu.originalLocation = 'route-1';
      charmander.originalLocation = 'route-2';

      playthroughActions.updateEncounter('route-1', pikachu);
      playthroughActions.updateEncounter('route-2', charmander);

      // Swap encounters
      playthroughActions.swapEncounters('route-1', 'route-2');

      const encounters = playthroughActions.getEncounters();

      // originalLocation should be updated or preserved
      expect(encounters['route-1'].head?.originalLocation).toBeDefined();
      expect(encounters['route-2'].head?.originalLocation).toBeDefined();
    });

    it('should set originalLocation when moving encounters', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);

      playthroughActions.updateEncounter('route-1', pikachu);
      playthroughActions.moveEncounter('route-1', 'route-2', pikachu);

      const encounters = playthroughActions.getEncounters();
      expect(encounters['route-2'].head?.originalLocation).toBeDefined();
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
      playthroughActions.updateEncounter('route-1', pikachu, 'head', true);
      playthroughActions.updateEncounter('route-1', charmander, 'body', false);

      let encounters = playthroughActions.getEncounters();

      // Verify initial fusion state
      expect(encounters['route-1']).toBeDefined();
      expect(encounters['route-1']?.isFusion).toBe(true);
      expect(encounters['route-1']?.head).not.toBeNull();
      expect(encounters['route-1']?.head?.name).toBe('Pikachu');
      expect(encounters['route-1']?.head?.nickname).toBe('Sparky');
      expect(encounters['route-1']?.body).not.toBeNull();
      expect(encounters['route-1']?.body?.name).toBe('Charmander');
      expect(encounters['route-1']?.body?.nickname).toBe('Flame');

      // Toggle fusion off (unfuse)
      playthroughActions.toggleEncounterFusion('route-1');

      encounters = playthroughActions.getEncounters();

      // Verify both Pokemon are preserved but isFusion is false
      const encounter2 = encounters['route-1'];
      expect(encounter2).toBeDefined();
      expect(encounter2!.isFusion).toBe(false);
      expect(encounter2!.head).toBeDefined();
      expect(encounter2!.head!.name).toBe('Pikachu');
      expect(encounter2!.head!.nickname).toBe('Sparky');
      expect(encounter2!.body).toBeDefined();
      expect(encounter2!.body!.name).toBe('Charmander');
      expect(encounter2!.body!.nickname).toBe('Flame');

      // Toggle fusion back on (re-fuse)
      playthroughActions.toggleEncounterFusion('route-1');

      encounters = playthroughActions.getEncounters();

      // Verify both Pokemon are still preserved and isFusion is true again
      const encounter3 = encounters['route-1'];
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
      playthroughActions.updateEncounter('route-1', pikachu);

      let encounters = playthroughActions.getEncounters();

      // Verify initial regular encounter state
      expect(encounters['route-1'].isFusion).toBe(false);
      expect(encounters['route-1'].head?.name).toBe('Pikachu');
      expect(encounters['route-1'].head?.nickname).toBe('Sparky');
      expect(encounters['route-1'].body).toBeNull();

      // Toggle to fusion mode
      playthroughActions.toggleEncounterFusion('route-1');

      encounters = playthroughActions.getEncounters();

      // Verify head Pokemon is preserved, isFusion is true, body remains null
      expect(encounters['route-1'].isFusion).toBe(true);
      expect(encounters['route-1'].head?.name).toBe('Pikachu');
      expect(encounters['route-1'].head?.nickname).toBe('Sparky');
      expect(encounters['route-1'].body).toBeNull();
    });

    it('should handle toggle on non-existent encounter gracefully', async () => {
      // Try to toggle fusion on non-existent encounter
      playthroughActions.toggleEncounterFusion('non-existent');

      const encounters = playthroughActions.getEncounters();

      // Should create a new encounter with default values and isFusion true
      expect(encounters['non-existent']).toBeDefined();
      expect(encounters['non-existent'].isFusion).toBe(true);
      expect(encounters['non-existent'].head).toBeNull();
      expect(encounters['non-existent'].body).toBeNull();
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
      expect(Object.keys(encounters)).toHaveLength(0);
    });

    it('should preserve encounter structure when performing multiple operations', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Create fusion
      playthroughActions.updateEncounter('route-1', pikachu, 'head', true);
      playthroughActions.updateEncounter('route-1', charmander, 'body', false);

      // Clear head, then add new head
      playthroughActions.clearEncounterFromLocation('route-1', 'head');
      const squirtle = createMockPokemon('Squirtle', 7);
      playthroughActions.updateEncounter('route-1', squirtle, 'head', false);

      const encounters = playthroughActions.getEncounters();
      expect(encounters['route-1'].isFusion).toBe(true);
      expect(encounters['route-1'].head?.name).toBe('Squirtle');
      expect(encounters['route-1'].body?.name).toBe('Charmander');
    });
  });
});
