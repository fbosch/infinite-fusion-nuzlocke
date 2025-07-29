// Import mocks first (must be at top level for Vitest hoisting)
import './mocks';

// Import shared setup and utilities
import {
  describe,
  it,
  expect,
  beforeEach,
  playthroughActions,
  playthroughsStore,
  createMockPokemon,
  setupPlaythroughTest,
} from './setup';

describe('Playthroughs Store - Edge Cases and Error Handling', () => {
  beforeEach(() => {
    setupPlaythroughTest();
  });

  describe('edge cases and error handling', () => {
    it('should handle operations on playthrough without active playthrough', async () => {
      playthroughsStore.activePlaythroughId = undefined;

      const pikachu = createMockPokemon('Pikachu', 25);

      // These should not throw errors
      await playthroughActions.clearEncounterFromLocation('route-1');
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
      await playthroughActions.clearEncounterFromLocation('route-1', 'head');
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
});
