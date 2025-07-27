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

describe('Playthroughs Store - Status Synchronization', () => {
  beforeEach(() => {
    // Reset store state
    playthroughsStore.playthroughs = [];
    playthroughsStore.activePlaythroughId = undefined;

    // Create a test playthrough
    const playthroughId = playthroughActions.createPlaythrough('Test Run');
    playthroughActions.setActivePlaythrough(playthroughId);
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
