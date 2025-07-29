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

describe('Playthroughs Store - Fusion Operations', () => {
  beforeEach(() => {
    setupPlaythroughTest();
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

  describe('Fusion flip bug prevention', () => {
    it('should prevent duplication when flipping fusion with head Pokemon and empty body', async () => {
      const pidgey = createMockPokemon('Pidgey', 16);
      pidgey.nickname = 'Birdy';

      // Create a fusion encounter with head Pokemon and empty body
      await playthroughActions.updateEncounter('route-1', pidgey, 'head', true);

      let encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();

      // Verify initial state: fusion with filled head, empty body
      const initialEncounter = encounters!['route-1'];
      expect(initialEncounter).toBeDefined();
      expect(initialEncounter!.isFusion).toBe(true);
      expect(initialEncounter!.head).toBeDefined();
      expect(initialEncounter!.head!.name).toBe('Pidgey');
      expect(initialEncounter!.head!.nickname).toBe('Birdy');
      expect(initialEncounter!.body).toBeNull();

      // Simulate flip by manually calling updateEncounter with null/Pokemon
      // This replicates what happens in EncounterCell when flip button is clicked
      await playthroughActions.updateEncounter('route-1', null, 'head', false);
      await playthroughActions.updateEncounter(
        'route-1',
        pidgey,
        'body',
        false
      );

      encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();

      // Verify flip worked correctly: head is null, body has the Pokemon
      const flippedEncounter = encounters!['route-1'];
      expect(flippedEncounter).toBeDefined();
      expect(flippedEncounter!.isFusion).toBe(true);
      expect(flippedEncounter!.head).toBeNull(); // Should be cleared, not duplicated
      expect(flippedEncounter!.body).toBeDefined();
      expect(flippedEncounter!.body!.name).toBe('Pidgey');
      expect(flippedEncounter!.body!.nickname).toBe('Birdy');

      // Ensure no duplication occurred - exactly one Pokemon instance should exist
      const headPokemon = flippedEncounter!.head;
      const bodyPokemon = flippedEncounter!.body;

      expect(headPokemon).toBeNull();
      expect(bodyPokemon).not.toBeNull();

      // Count total Pokemon in this encounter (should be exactly 1)
      const totalPokemon = [headPokemon, bodyPokemon].filter(
        p => p !== null
      ).length;
      expect(totalPokemon).toBe(1);
    });

    it('should handle clearing fields properly without leaving remnants', async () => {
      const charmander = createMockPokemon('Charmander', 4);
      charmander.nickname = 'Flame';

      // Create regular encounter
      await playthroughActions.updateEncounter('route-1', charmander);

      let encounters = playthroughActions.getEncounters();
      expect(encounters!['route-1'].head?.name).toBe('Charmander');
      expect(encounters!['route-1'].body).toBeNull();

      // Clear the encounter by setting to null
      await playthroughActions.updateEncounter('route-1', null, 'head', false);

      encounters = playthroughActions.getEncounters();

      // Should properly clear the field
      expect(encounters!['route-1'].head).toBeNull();
      expect(encounters!['route-1'].body).toBeNull();
    });

    it('should handle fusion field clearing without affecting other field', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const squirtle = createMockPokemon('Squirtle', 7);

      pikachu.nickname = 'Sparky';
      squirtle.nickname = 'Turtle';

      // Create fusion with both head and body
      await playthroughActions.updateEncounter(
        'route-1',
        pikachu,
        'head',
        true
      );
      await playthroughActions.updateEncounter(
        'route-1',
        squirtle,
        'body',
        false
      );

      let encounters = playthroughActions.getEncounters();
      expect(encounters!['route-1'].head?.name).toBe('Pikachu');
      expect(encounters!['route-1'].body?.name).toBe('Squirtle');

      // Clear only the head field
      await playthroughActions.updateEncounter('route-1', null, 'head', false);

      encounters = playthroughActions.getEncounters();

      // Head should be cleared, body should remain unchanged
      expect(encounters!['route-1'].head).toBeNull();
      expect(encounters!['route-1'].body).toBeDefined();
      expect(encounters!['route-1'].body!.name).toBe('Squirtle');
      expect(encounters!['route-1'].body!.nickname).toBe('Turtle');
      expect(encounters!['route-1'].isFusion).toBe(true);

      // Clear only the body field
      await playthroughActions.updateEncounter('route-1', null, 'body', false);

      encounters = playthroughActions.getEncounters();

      // Both should now be cleared
      expect(encounters!['route-1'].head).toBeNull();
      expect(encounters!['route-1'].body).toBeNull();
      expect(encounters!['route-1'].isFusion).toBe(true);
    });

    it('should prevent duplication when flipping fusion with body Pokemon and empty head (inverse scenario)', async () => {
      const charmander = createMockPokemon('Charmander', 4);
      charmander.nickname = 'Flame';

      // Create a fusion encounter with empty head and body Pokemon
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

      // Simulate flip by swapping: clear body and set head
      await playthroughActions.updateEncounter(
        'route-1',
        charmander,
        'head',
        false
      );
      await playthroughActions.updateEncounter('route-1', null, 'body', false);

      encounters = playthroughActions.getEncounters();
      expect(encounters).toBeDefined();

      // Verify flip worked correctly: head has the Pokemon, body is null
      const flippedEncounter = encounters!['route-1'];
      expect(flippedEncounter).toBeDefined();
      expect(flippedEncounter!.isFusion).toBe(true);
      expect(flippedEncounter!.head).toBeDefined();
      expect(flippedEncounter!.head!.name).toBe('Charmander');
      expect(flippedEncounter!.head!.nickname).toBe('Flame');
      expect(flippedEncounter!.body).toBeNull(); // Should be cleared, not duplicated

      // Ensure no duplication occurred - exactly one Pokemon instance should exist
      const headPokemon = flippedEncounter!.head;
      const bodyPokemon = flippedEncounter!.body;

      expect(headPokemon).not.toBeNull();
      expect(bodyPokemon).toBeNull();

      const totalPokemon = [headPokemon, bodyPokemon].filter(
        p => p !== null
      ).length;
      expect(totalPokemon).toBe(1);
    });

    it('should correctly flip complete fusion (both head and body filled)', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const squirtle = createMockPokemon('Squirtle', 7);

      pikachu.nickname = 'Sparky';
      squirtle.nickname = 'Turtle';
      pikachu.uid = 'pikachu_uid_123';
      squirtle.uid = 'squirtle_uid_456';

      // Create complete fusion
      await playthroughActions.updateEncounter(
        'route-1',
        pikachu,
        'head',
        true
      );
      await playthroughActions.updateEncounter(
        'route-1',
        squirtle,
        'body',
        false
      );

      let encounters = playthroughActions.getEncounters();
      expect(encounters!['route-1'].head?.name).toBe('Pikachu');
      expect(encounters!['route-1'].head?.nickname).toBe('Sparky');
      expect(encounters!['route-1'].body?.name).toBe('Squirtle');
      expect(encounters!['route-1'].body?.nickname).toBe('Turtle');

      // Simulate complete flip: head becomes body, body becomes head
      await playthroughActions.updateEncounter(
        'route-1',
        squirtle,
        'head',
        false
      );
      await playthroughActions.updateEncounter(
        'route-1',
        pikachu,
        'body',
        false
      );

      encounters = playthroughActions.getEncounters();

      // Verify Pokemon were properly swapped
      expect(encounters!['route-1'].head?.name).toBe('Squirtle');
      expect(encounters!['route-1'].head?.nickname).toBe('Turtle');
      expect(encounters!['route-1'].head?.uid).toBe('squirtle_uid_456');
      expect(encounters!['route-1'].body?.name).toBe('Pikachu');
      expect(encounters!['route-1'].body?.nickname).toBe('Sparky');
      expect(encounters!['route-1'].body?.uid).toBe('pikachu_uid_123');
      expect(encounters!['route-1'].isFusion).toBe(true);

      // Both Pokemon should still exist (no loss)
      const totalPokemon = [
        encounters!['route-1'].head,
        encounters!['route-1'].body,
      ].filter(p => p !== null).length;
      expect(totalPokemon).toBe(2);
    });

    it('should handle multiple consecutive flips correctly', async () => {
      const psyduck = createMockPokemon('Psyduck', 54);
      psyduck.nickname = 'Duck';

      // Start with head Pokemon only
      await playthroughActions.updateEncounter(
        'route-1',
        psyduck,
        'head',
        true
      );

      // First flip: head -> body
      await playthroughActions.updateEncounter('route-1', null, 'head', false);
      await playthroughActions.updateEncounter(
        'route-1',
        psyduck,
        'body',
        false
      );

      let encounters = playthroughActions.getEncounters();
      expect(encounters!['route-1'].head).toBeNull();
      expect(encounters!['route-1'].body?.name).toBe('Psyduck');

      // Second flip: body -> head (back to original)
      await playthroughActions.updateEncounter(
        'route-1',
        psyduck,
        'head',
        false
      );
      await playthroughActions.updateEncounter('route-1', null, 'body', false);

      encounters = playthroughActions.getEncounters();
      expect(encounters!['route-1'].head?.name).toBe('Psyduck');
      expect(encounters!['route-1'].head?.nickname).toBe('Duck');
      expect(encounters!['route-1'].body).toBeNull();

      // Third flip: head -> body again
      await playthroughActions.updateEncounter('route-1', null, 'head', false);
      await playthroughActions.updateEncounter(
        'route-1',
        psyduck,
        'body',
        false
      );

      encounters = playthroughActions.getEncounters();
      expect(encounters!['route-1'].head).toBeNull();
      expect(encounters!['route-1'].body?.name).toBe('Psyduck');
      expect(encounters!['route-1'].body?.nickname).toBe('Duck');

      // Always exactly one Pokemon, never duplication
      const totalPokemon = [
        encounters!['route-1'].head,
        encounters!['route-1'].body,
      ].filter(p => p !== null).length;
      expect(totalPokemon).toBe(1);
    });

    it('should preserve Pokemon status during flip operations', async () => {
      const geodude = createMockPokemon('Geodude', 74);
      geodude.nickname = 'Rocky';
      geodude.status = 'captured';

      // Create fusion with status Pokemon
      await playthroughActions.updateEncounter(
        'route-1',
        geodude,
        'head',
        true
      );

      let encounters = playthroughActions.getEncounters();
      expect(encounters!['route-1'].head?.status).toBe('captured');

      // Flip to body
      await playthroughActions.updateEncounter('route-1', null, 'head', false);
      await playthroughActions.updateEncounter(
        'route-1',
        geodude,
        'body',
        false
      );

      encounters = playthroughActions.getEncounters();

      // Status should be preserved after flip
      expect(encounters!['route-1'].head).toBeNull();
      expect(encounters!['route-1'].body?.name).toBe('Geodude');
      expect(encounters!['route-1'].body?.nickname).toBe('Rocky');
      expect(encounters!['route-1'].body?.status).toBe('captured');
    });

    it('should reset artwork variant when flipping changes fusion composition', async () => {
      const alakazam = createMockPokemon('Alakazam', 65);
      alakazam.nickname = 'Spoon';

      // Create fusion with artwork variant
      await playthroughActions.updateEncounter(
        'route-1',
        alakazam,
        'head',
        true
      );

      // Manually set an artwork variant to test reset behavior
      playthroughActions.setArtworkVariant('route-1', 'custom-variant');

      let encounters = playthroughActions.getEncounters();
      expect(encounters!['route-1'].artworkVariant).toBe('custom-variant');

      // Flip to body (which changes composition from head-only to body-only)
      await playthroughActions.updateEncounter('route-1', null, 'head', false);
      await playthroughActions.updateEncounter(
        'route-1',
        alakazam,
        'body',
        false
      );

      encounters = playthroughActions.getEncounters();

      // Artwork variant should be reset when composition changes
      expect(encounters!['route-1'].artworkVariant).toBeUndefined();
    });
  });
});
