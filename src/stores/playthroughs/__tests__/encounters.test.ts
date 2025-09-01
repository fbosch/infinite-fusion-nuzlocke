import { describe, it, expect } from 'vitest';
import {
  updateEncounter,
  resetEncounter,
  clearEncounterFromLocation,
  markEncounterAsCaptured,
  markEncounterAsReceived,
  markEncounterAsMissed,
  markEncounterAsDeceased,
  moveEncounterToBox,
  toggleEncounterFusion,
  flipEncounterFusion,
} from '../encounters';
import { PokemonStatus } from '@/loaders/pokemon';
import {
  resetPlaythroughsStore,
  createTestPlaythrough,
  testPokemon,
  waitForTimestamp,
  expectEncounter,
} from './test-utils';

describe('Basic Encounter Operations', () => {
  resetPlaythroughsStore();

  describe('updateEncounter', () => {
    it('should create a new encounter with head Pokémon', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      const pikachu = testPokemon.pikachu();
      await updateEncounter('route1', pikachu, 'head', false);

      expectEncounter(
        activePlaythrough.encounters?.route1,
        'pikachu_route1_123',
        null,
        false
      );
    });

    it('should create a fusion encounter with both head and body', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      const pikachu = testPokemon.pikachu();
      const charmander = testPokemon.charmander();

      await updateEncounter('route1', pikachu, 'head', false);
      await updateEncounter('route1', charmander, 'body', true);

      expectEncounter(
        activePlaythrough.encounters?.route1,
        'pikachu_route1_123',
        'charmander_route1_456',
        true
      );
    });

    it('should update existing encounter field', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Create initial encounter
      const pikachu = testPokemon.pikachu();
      await updateEncounter('route1', pikachu, 'head', false);

      // Update with different Pokémon
      const charmander = testPokemon.charmander();
      await updateEncounter('route1', charmander, 'head', false);

      expectEncounter(
        activePlaythrough.encounters?.route1,
        'charmander_route1_456',
        null,
        false
      );
    });

    it('should clear encounter field when passed null', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Create encounter
      const pikachu = testPokemon.pikachu();
      await updateEncounter('route1', pikachu, 'head', false);

      // Clear it
      await updateEncounter('route1', null, 'head', false);

      expect(activePlaythrough.encounters?.route1?.head).toBeNull();
    });

    it('should generate UID if not provided', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      const pokemon = {
        id: 25,
        name: 'Pikachu',
        nationalDexId: 25,
        originalLocation: 'route1',
      };

      await updateEncounter('route1', pokemon, 'head', false);

      expect(activePlaythrough.encounters?.route1?.head?.uid).toBeDefined();
      expect(typeof activePlaythrough.encounters?.route1?.head?.uid).toBe(
        'string'
      );
      expect(
        activePlaythrough.encounters?.route1?.head?.uid.length
      ).toBeGreaterThan(0);
    });

    it('should set originalLocation if not provided', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      const pokemon = {
        id: 25,
        name: 'Pikachu',
        nationalDexId: 25,
        uid: 'pikachu_route1_123',
      };

      await updateEncounter('route1', pokemon, 'head', false);

      expect(activePlaythrough.encounters?.route1?.head?.originalLocation).toBe(
        'route1'
      );
    });

    it('should update encounter timestamp', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      const pikachu = testPokemon.pikachu();
      await updateEncounter('route1', pikachu, 'head', false);

      const timestamp = activePlaythrough.encounters?.route1?.updatedAt;
      expect(timestamp).toBeGreaterThan(0);

      // Wait and update again
      await waitForTimestamp();
      const charmander = testPokemon.charmander();
      await updateEncounter('route1', charmander, 'body', true);

      const newTimestamp = activePlaythrough.encounters?.route1?.updatedAt;
      expect(newTimestamp).toBeGreaterThan(timestamp!);
    });
  });

  describe('resetEncounter', () => {
    it('should delete entire encounter', () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Set up encounter
      activePlaythrough.encounters = {
        route1: {
          head: testPokemon.pikachu(),
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      resetEncounter('route1');

      expect(activePlaythrough.encounters?.route1).toBeUndefined();
    });

    it('should handle non-existent encounter gracefully', () => {
      createTestPlaythrough();

      expect(() => resetEncounter('nonexistent')).not.toThrow();
    });
  });

  describe('clearEncounterFromLocation', () => {
    it('should clear specific field when field is specified', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Set up fusion encounter
      activePlaythrough.encounters = {
        route1: {
          head: testPokemon.pikachu(),
          body: testPokemon.charmander(),
          isFusion: true,
          updatedAt: Date.now(),
        },
      };

      await clearEncounterFromLocation('route1', 'head');

      expect(activePlaythrough.encounters?.route1?.head).toBeNull();
      expect(activePlaythrough.encounters?.route1?.body).toBeDefined();
    });

    it('should clear entire encounter when no field specified', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Set up encounter
      activePlaythrough.encounters = {
        route1: {
          head: testPokemon.pikachu(),
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      await clearEncounterFromLocation('route1');

      expect(activePlaythrough.encounters?.route1).toBeUndefined();
    });

    it('should handle non-existent encounter gracefully', async () => {
      createTestPlaythrough();

      expect(
        async () => await clearEncounterFromLocation('nonexistent')
      ).not.toThrow();
    });
  });

  describe('Status Update Functions', () => {
    it('should mark encounter as captured', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Set up encounter without status
      const pikachu = {
        id: 25,
        name: 'Pikachu',
        nationalDexId: 25,
        uid: 'pikachu_route1_123',
        originalLocation: 'route1',
      };
      await updateEncounter('route1', pikachu, 'head', false);

      await markEncounterAsCaptured('route1');

      expect(activePlaythrough.encounters?.route1?.head?.status).toBe(
        PokemonStatus.CAPTURED
      );
    });

    it('should mark encounter as received', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      const pikachu = {
        id: 25,
        name: 'Pikachu',
        nationalDexId: 25,
        uid: 'pikachu_route1_123',
        originalLocation: 'route1',
      };
      await updateEncounter('route1', pikachu, 'head', false);

      await markEncounterAsReceived('route1');

      expect(activePlaythrough.encounters?.route1?.head?.status).toBe(
        PokemonStatus.RECEIVED
      );
    });

    it('should mark encounter as missed', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      const pikachu = {
        id: 25,
        name: 'Pikachu',
        nationalDexId: 25,
        uid: 'pikachu_route1_123',
        originalLocation: 'route1',
      };
      await updateEncounter('route1', pikachu, 'head', false);

      await markEncounterAsMissed('route1');

      expect(activePlaythrough.encounters?.route1?.head?.status).toBe(
        PokemonStatus.MISSED
      );
    });

    it('should mark encounter as deceased', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      const pikachu = testPokemon.pikachu();
      await updateEncounter('route1', pikachu, 'head', false);

      await markEncounterAsDeceased('route1');

      expect(activePlaythrough.encounters?.route1?.head?.status).toBe(
        PokemonStatus.DECEASED
      );
    });

    it('should move encounter to box (stored)', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      const pikachu = testPokemon.pikachu();
      await updateEncounter('route1', pikachu, 'head', false);

      await moveEncounterToBox('route1');

      expect(activePlaythrough.encounters?.route1?.head?.status).toBe(
        PokemonStatus.STORED
      );
    });

    it('should update both head and body in fusion encounter', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Set up fusion encounter
      const pikachu = testPokemon.pikachu();
      const charmander = testPokemon.charmander();

      await updateEncounter('route1', pikachu, 'head', false);
      await updateEncounter('route1', charmander, 'body', true);

      await markEncounterAsDeceased('route1');

      expect(activePlaythrough.encounters?.route1?.head?.status).toBe(
        PokemonStatus.DECEASED
      );
      expect(activePlaythrough.encounters?.route1?.body?.status).toBe(
        PokemonStatus.DECEASED
      );
    });
  });

  describe('Fusion Operations', () => {
    it('should toggle fusion mode on non-fusion encounter', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Set up regular encounter
      const pikachu = testPokemon.pikachu();
      await updateEncounter('route1', pikachu, 'head', false);

      expect(activePlaythrough.encounters?.route1?.isFusion).toBe(false);

      await toggleEncounterFusion('route1');

      expect(activePlaythrough.encounters?.route1?.isFusion).toBe(true);
    });

    it('should toggle fusion mode off fusion encounter', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Set up fusion encounter
      activePlaythrough.encounters = {
        route1: {
          head: testPokemon.pikachu(),
          body: testPokemon.charmander(),
          isFusion: true,
          updatedAt: Date.now(),
        },
      };

      await toggleEncounterFusion('route1');

      expect(activePlaythrough.encounters?.route1?.isFusion).toBe(false);
    });

    it('should flip fusion head and body', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Set up fusion encounter
      activePlaythrough.encounters = {
        route1: {
          head: testPokemon.pikachu(),
          body: testPokemon.charmander(),
          isFusion: true,
          updatedAt: Date.now(),
        },
      };

      await flipEncounterFusion('route1');

      expect(activePlaythrough.encounters?.route1?.head?.uid).toBe(
        'charmander_route1_456'
      );
      expect(activePlaythrough.encounters?.route1?.body?.uid).toBe(
        'pikachu_route1_123'
      );
    });

    it('should handle flip on non-fusion encounter gracefully', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Set up regular encounter
      activePlaythrough.encounters = {
        route1: {
          head: testPokemon.pikachu(),
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      expect(async () => await flipEncounterFusion('route1')).not.toThrow();

      // Should remain unchanged
      expect(activePlaythrough.encounters?.route1?.head?.uid).toBe(
        'pikachu_route1_123'
      );
      expect(activePlaythrough.encounters?.route1?.body).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing active playthrough gracefully', async () => {
      resetPlaythroughsStore();
      // Don't create a playthrough

      const pikachu = testPokemon.pikachu();

      expect(
        async () => await updateEncounter('route1', pikachu, 'head', false)
      ).not.toThrow();
      expect(() => resetEncounter('route1')).not.toThrow();
      expect(
        async () => await clearEncounterFromLocation('route1')
      ).not.toThrow();
      expect(async () => await markEncounterAsCaptured('route1')).not.toThrow();
    });

    it('should handle invalid encounter operations gracefully', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Try operations on non-existent encounters
      await expect(
        markEncounterAsCaptured('nonexistent')
      ).resolves.not.toThrow();
      await expect(toggleEncounterFusion('nonexistent')).resolves.not.toThrow();
      await expect(flipEncounterFusion('nonexistent')).resolves.not.toThrow();

      // Verify no encounters were created (or only empty encounter from toggle)
      const encounterKeys = Object.keys(activePlaythrough.encounters || {});
      expect(encounterKeys.length).toBeLessThanOrEqual(1);
    });
  });
});
