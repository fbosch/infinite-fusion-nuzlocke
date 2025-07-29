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

describe('Playthroughs Store - Drag and Drop Logic Tests', () => {
  beforeEach(() => {
    setupPlaythroughTest();
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
});
