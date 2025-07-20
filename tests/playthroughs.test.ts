import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { z } from 'zod';

// Mock IndexedDB operations first
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

// Now import the modules
import { playthroughActions, playthroughsStore, type Playthrough } from '../src/stores/playthroughs';
import { PokemonOptionSchema } from '../src/loaders/pokemon';



type PokemonOption = z.infer<typeof PokemonOptionSchema>;

const createMockPokemon = (name: string, id: number): PokemonOption => ({
  id,
  name,
  nationalDexId: id,
  originalLocation: undefined,
});

describe('Playthroughs Store - Drag and Drop Operations', () => {
  beforeEach(async () => {
    // Reset store state
    playthroughsStore.playthroughs = [];
    playthroughsStore.activePlaythroughId = undefined;
    
    // Create a test playthrough
    const playthroughId = await playthroughActions.createPlaythrough('Test Run');
    await playthroughActions.setActivePlaythrough(playthroughId);
  });

  describe('getLocationFromComboboxId', () => {
    it('should parse head combobox ID correctly', () => {
      const result = playthroughActions.getLocationFromComboboxId('route-1-head');
      expect(result).toEqual({ locationId: 'route-1', field: 'head' });
    });

    it('should parse body combobox ID correctly', () => {
      const result = playthroughActions.getLocationFromComboboxId('route-2-body');
      expect(result).toEqual({ locationId: 'route-2', field: 'body' });
    });

    it('should parse single combobox ID correctly', () => {
      const result = playthroughActions.getLocationFromComboboxId('route-3-single');
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
      await playthroughActions.updateEncounter('route-2', pikachu, 'head', true);
      await playthroughActions.updateEncounter('route-2', charmander, 'body', false);
    });

    it('should clear entire encounter when no field specified', async () => {
      await playthroughActions.clearEncounterFromLocation('route-1');
      
      const encounters = playthroughActions.getEncounters();
      expect(encounters['route-1']).toBeUndefined();
    });

    it('should remove regular encounter when clearing head', async () => {
      await playthroughActions.clearEncounterFromLocation('route-1', 'head');
      
      const encounters = playthroughActions.getEncounters();
      expect(encounters['route-1']).toBeUndefined();
    });

    it('should preserve fusion structure when clearing head only', async () => {
      await playthroughActions.clearEncounterFromLocation('route-2', 'head');
      
      const encounters = playthroughActions.getEncounters();
      expect(encounters['route-2']).toBeDefined();
      expect(encounters['route-2'].isFusion).toBe(true);
      expect(encounters['route-2'].head).toBeNull();
      expect(encounters['route-2'].body).toBeDefined();
      expect(encounters['route-2'].body?.name).toBe('Charmander');
    });

    it('should preserve fusion structure when clearing body only', async () => {
      await playthroughActions.clearEncounterFromLocation('route-2', 'body');
      
      const encounters = playthroughActions.getEncounters();
      expect(encounters['route-2']).toBeDefined();
      expect(encounters['route-2'].isFusion).toBe(true);
      expect(encounters['route-2'].head).toBeDefined();
      expect(encounters['route-2'].head?.name).toBe('Pikachu');
      expect(encounters['route-2'].body).toBeNull();
    });

    it('should preserve fusion structure even when both head and body are cleared', async () => {
      await playthroughActions.clearEncounterFromLocation('route-2', 'head');
      await playthroughActions.clearEncounterFromLocation('route-2', 'body');
      
      const encounters = playthroughActions.getEncounters();
      expect(encounters['route-2']).toBeDefined();
      expect(encounters['route-2'].isFusion).toBe(true);
      expect(encounters['route-2'].head).toBeNull();
      expect(encounters['route-2'].body).toBeNull();
    });

    it('should handle clearing from non-existent location gracefully', async () => {
      await playthroughActions.clearEncounterFromLocation('non-existent', 'head');
      
      const encounters = playthroughActions.getEncounters();
      expect(encounters['non-existent']).toBeUndefined();
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
      expect(encounters['route-1']).toBeUndefined();
      expect(encounters['route-2']).toBeDefined();
      expect(encounters['route-2'].head?.name).toBe('Pikachu');
    });

        it('should move entire encounter from one location to another', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);
      
      // Set up fusion encounter
      await playthroughActions.updateEncounter('route-1', pikachu, 'head', true);
      await playthroughActions.updateEncounter('route-1', charmander, 'body', false);
      
      // Move entire encounter to new location
      await playthroughActions.moveEncounter('route-1', 'route-2', pikachu, 'head');
      
      const encounters = playthroughActions.getEncounters();
      
      // Source should be deleted
      expect(encounters['route-1']).toBeUndefined();
      
      // Destination should have the moved Pokemon
      expect(encounters['route-2']).toBeDefined();
      expect(encounters['route-2'].head?.name).toBe('Pikachu');
    });
  });

  describe('swapEncounters', () => {
    it('should swap Pokemon between two regular encounters', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);
      
      // Set up encounters
      await playthroughActions.updateEncounter('route-1', pikachu);
      await playthroughActions.updateEncounter('route-2', charmander);
      
      // Swap encounters
      await playthroughActions.swapEncounters('route-1', 'route-2');
      
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
      await playthroughActions.updateEncounter('route-1', pikachu, 'head', true);
      await playthroughActions.updateEncounter('route-1', charmander, 'body', false);
      await playthroughActions.updateEncounter('route-2', squirtle, 'head', true);
      await playthroughActions.updateEncounter('route-2', bulbasaur, 'body', false);
      
      // Swap heads between fusions
      await playthroughActions.swapEncounters('route-1', 'route-2', 'head', 'head');
      
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
      await playthroughActions.updateEncounter('route-1', pikachu);
      await playthroughActions.updateEncounter('route-2', charmander, 'head', true);
      await playthroughActions.updateEncounter('route-2', squirtle, 'body', false);
      
      // Swap regular encounter head with fusion body
      await playthroughActions.swapEncounters('route-1', 'route-2', 'head', 'body');
      
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
      await playthroughActions.updateEncounter('route-1', pikachu);
      
      // Try to swap with non-existent encounter
      await playthroughActions.swapEncounters('route-1', 'non-existent');
      
      const encounters = playthroughActions.getEncounters();
      
      // Original encounter should be unchanged
      expect(encounters['route-1'].head?.name).toBe('Pikachu');
      expect(encounters['non-existent']).toBeUndefined();
    });

    it('should handle swap with null Pokemon gracefully', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      
      // Set up encounters with one having null head
      await playthroughActions.updateEncounter('route-1', pikachu);
      await playthroughActions.updateEncounter('route-2', pikachu, 'head', true);
      await playthroughActions.clearEncounterFromLocation('route-2', 'head');
      
      // Try to swap - should not work since route-2 head is null
      await playthroughActions.swapEncounters('route-1', 'route-2');
      
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
      
      await playthroughActions.updateEncounter('route-1', pikachu);
      await playthroughActions.updateEncounter('route-2', charmander);
      
      // Swap encounters
      await playthroughActions.swapEncounters('route-1', 'route-2');
      
      const encounters = playthroughActions.getEncounters();
      
      // originalLocation should be updated or preserved
      expect(encounters['route-1'].head?.originalLocation).toBeDefined();
      expect(encounters['route-2'].head?.originalLocation).toBeDefined();
    });

    it('should set originalLocation when moving encounters', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      
      await playthroughActions.updateEncounter('route-1', pikachu);
      await playthroughActions.moveEncounter('route-1', 'route-2', pikachu);
      
      const encounters = playthroughActions.getEncounters();
      expect(encounters['route-2'].head?.originalLocation).toBeDefined();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle operations on playthrough without active playthrough', async () => {
      playthroughsStore.activePlaythroughId = undefined;
      
      const pikachu = createMockPokemon('Pikachu', 25);
      
      // These should not throw errors
      await playthroughActions.clearEncounterFromLocation('route-1');
      await playthroughActions.moveEncounter('route-1', 'route-2', pikachu);
      await playthroughActions.swapEncounters('route-1', 'route-2');
      
      // No encounters should be created
      const encounters = playthroughActions.getEncounters();
      expect(Object.keys(encounters)).toHaveLength(0);
    });

    it('should preserve encounter structure when performing multiple operations', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);
      
      // Create fusion
      await playthroughActions.updateEncounter('route-1', pikachu, 'head', true);
      await playthroughActions.updateEncounter('route-1', charmander, 'body', false);
      
      // Clear head, then add new head
      await playthroughActions.clearEncounterFromLocation('route-1', 'head');
      const squirtle = createMockPokemon('Squirtle', 7);
      await playthroughActions.updateEncounter('route-1', squirtle, 'head', false);
      
      const encounters = playthroughActions.getEncounters();
      expect(encounters['route-1'].isFusion).toBe(true);
      expect(encounters['route-1'].head?.name).toBe('Squirtle');
      expect(encounters['route-1'].body?.name).toBe('Charmander');
    });
  });
}); 