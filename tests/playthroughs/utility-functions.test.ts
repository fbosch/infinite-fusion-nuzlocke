// Import mocks first (must be at top level for Vitest hoisting)
import './mocks';

// Import shared setup and utilities
import {
  describe,
  it,
  expect,
  beforeEach,
  playthroughActions,
  createMockPokemon,
  setupPlaythroughTest,
} from './setup';

describe('Playthroughs Store - Utility Functions', () => {
  beforeEach(() => {
    setupPlaythroughTest();
  });

  describe('getLocationFromComboboxId', () => {
    it('should extract location from simple combobox id', () => {
      const result = playthroughActions.getLocationFromComboboxId('route-1');
      expect(result).toEqual({ locationId: 'route-1', field: 'head' });
    });

    it('should extract location from head combobox id', () => {
      const result =
        playthroughActions.getLocationFromComboboxId('route-1-head');
      expect(result).toEqual({ locationId: 'route-1', field: 'head' });
    });

    it('should extract location from body combobox id', () => {
      const result =
        playthroughActions.getLocationFromComboboxId('route-1-body');
      expect(result).toEqual({ locationId: 'route-1', field: 'body' });
    });

    it('should handle complex location ids with head suffix', () => {
      const result = playthroughActions.getLocationFromComboboxId(
        'viridian-city-gym-head'
      );
      expect(result).toEqual({
        locationId: 'viridian-city-gym',
        field: 'head',
      });
    });

    it('should handle complex location ids with body suffix', () => {
      const result = playthroughActions.getLocationFromComboboxId(
        'viridian-city-gym-body'
      );
      expect(result).toEqual({
        locationId: 'viridian-city-gym',
        field: 'body',
      });
    });

    it('should return original id when no suffix present', () => {
      const result = playthroughActions.getLocationFromComboboxId(
        'some-complex-location-name'
      );
      expect(result).toEqual({
        locationId: 'some-complex-location-name',
        field: 'head',
      });
    });

    it('should handle edge case where location name contains head or body', () => {
      // If a location name actually contains "head" or "body" but isn't a suffix
      const result =
        playthroughActions.getLocationFromComboboxId('headbutt-tree-1');
      expect(result).toEqual({ locationId: 'headbutt-tree-1', field: 'head' });
    });

    it('should handle empty string', () => {
      const result = playthroughActions.getLocationFromComboboxId('');
      expect(result).toEqual({ locationId: '', field: 'head' });
    });

    it('should handle single suffix correctly', () => {
      const result =
        playthroughActions.getLocationFromComboboxId('route-1-single');
      expect(result).toEqual({ locationId: 'route-1', field: 'head' });
    });
  });

  describe('clearEncounterFromLocation', () => {
    it('should clear head encounter from location', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);

      // Add a Pokemon to head (create as fusion so clearing field keeps encounter)
      await playthroughActions.updateEncounter(
        'route-1',
        pikachu,
        'head',
        true
      );

      // Verify it was added
      let encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1']?.head?.name).toBe('Pikachu');

      // Clear the head encounter
      await playthroughActions.clearEncounterFromLocation('route-1', 'head');

      // Verify it was cleared
      encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1']?.head).toBeNull();
    });

    it('should clear body encounter from location', async () => {
      const charmander = createMockPokemon('Charmander', 4);

      // Create a fusion encounter first, then add to body
      await playthroughActions.updateEncounter('route-1', null, 'head', true);
      await playthroughActions.updateEncounter(
        'route-1',
        charmander,
        'body',
        false
      );

      // Verify it was added
      let encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1']?.body?.name).toBe('Charmander');

      // Clear the body encounter
      await playthroughActions.clearEncounterFromLocation('route-1', 'body');

      // Verify it was cleared
      encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1']?.body).toBeNull();
    });

    it('should clear both head and body when no position specified', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Add Pokemon to both positions
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

      // Verify both were added
      let encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1']?.head?.name).toBe('Pikachu');
      expect(encounters!['route-1']?.body?.name).toBe('Charmander');

      // Clear entire encounter
      await playthroughActions.clearEncounterFromLocation('route-1');

      // Verify encounter was deleted
      encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1']).toBeUndefined();
    });

    it('should handle clearing from non-existent location gracefully', async () => {
      // Try to clear from location that doesn't exist
      await playthroughActions.clearEncounterFromLocation('non-existent');

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      // Should not throw errors, and encounters should still be defined but empty
      expect(Object.keys(encounters!)).toHaveLength(0);
    });

    it('should preserve other encounters when clearing specific location', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Add Pokemon to different locations
      await playthroughActions.updateEncounter('route-1', pikachu);
      await playthroughActions.updateEncounter('route-2', charmander);

      // Clear route-1
      await playthroughActions.clearEncounterFromLocation('route-1');

      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1']).toBeUndefined();
      expect(encounters!['route-2']?.head?.name).toBe('Charmander'); // Should be preserved
    });

    it('should update artwork variant when clearing part of fusion', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Create a fusion encounter with artwork variant
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
      playthroughActions.setArtworkVariant('route-1', 'custom-variant');

      // Verify variant was set
      let encounters = playthroughActions.getEncounters();
      expect(encounters!['route-1']?.artworkVariant).toBe('custom-variant');

      // Clear only the head encounter (body should remain)
      await playthroughActions.clearEncounterFromLocation('route-1', 'head');

      // Body should remain and artwork variant should be updated based on remaining pokemon
      encounters = playthroughActions.getEncounters();
      expect(encounters!['route-1']?.head).toBeNull();
      expect(encounters!['route-1']?.body?.name).toBe('Charmander');
      // Artwork variant should be updated when composition changes (may be undefined based on sprite service mock)
      expect(encounters!['route-1']?.artworkVariant).toBeUndefined(); // Based on our mock returning undefined
    });

    it('should handle clearing from fusion encounter with no remaining pokemon', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);

      // Create a fusion encounter with only head
      await playthroughActions.updateEncounter(
        'route-1',
        pikachu,
        'head',
        true
      );

      // Clear the head encounter
      await playthroughActions.clearEncounterFromLocation('route-1', 'head');

      // Encounter should still exist but head should be null
      const encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();
      expect(encounters!['route-1']?.head).toBeNull();
      expect(encounters!['route-1']?.body).toBeNull();
      expect(encounters!['route-1']?.isFusion).toBe(true);
    });
  });
});
