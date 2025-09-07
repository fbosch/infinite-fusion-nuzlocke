import { describe, it, expect } from 'vitest';
import { moveTeamMemberToBox, restorePokemonToTeam } from '../encounters';
import { PokemonStatus } from '@/loaders/pokemon';
import {
  resetPlaythroughsStore,
  createTestPlaythrough,
  testPokemon,
  waitForTimestamp,
  expectTeamMember,
} from './test-utils';

describe('Team Management', () => {
  resetPlaythroughsStore();

  describe('moveTeamMemberToBox', () => {
    it('should move a team member with both head and body Pokémon to box', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Set up encounters with Pokémon
      activePlaythrough.encounters = {
        route1: {
          head: testPokemon.pikachu(),
          body: testPokemon.charmander(),
          isFusion: true,
          updatedAt: Date.now(),
        },
      };

      // Add team member
      activePlaythrough.team.members[0] = {
        headPokemonUid: 'pikachu_route1_123',
        bodyPokemonUid: 'charmander_route1_456',
      };

      // Verify team member exists
      expectTeamMember(
        activePlaythrough.team.members[0],
        'pikachu_route1_123',
        'charmander_route1_456'
      );

      // Move team member to box
      await moveTeamMemberToBox(0);

      // Verify team member is removed
      expectTeamMember(activePlaythrough.team.members[0], null);

      // Verify Pokémon statuses are updated to STORED
      const pikachu = activePlaythrough.encounters.route1.head;
      const charmander = activePlaythrough.encounters.route1.body;

      expect(pikachu?.status).toBe(PokemonStatus.STORED);
      expect(charmander?.status).toBe(PokemonStatus.STORED);
    });

    it('should move a team member with only head Pokémon to box', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Set up encounters with only head Pokémon
      activePlaythrough.encounters = {
        route1: {
          head: testPokemon.pikachu(),
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      // Add team member with only head Pokémon
      activePlaythrough.team.members[0] = {
        headPokemonUid: 'pikachu_route1_123',
        bodyPokemonUid: '',
      };

      // Verify team member exists
      expectTeamMember(
        activePlaythrough.team.members[0],
        'pikachu_route1_123',
        ''
      );

      // Move team member to box
      await moveTeamMemberToBox(0);

      // Verify team member is removed
      expectTeamMember(activePlaythrough.team.members[0], null);

      // Verify head Pokémon status is updated to STORED
      const pikachu = activePlaythrough.encounters.route1.head;
      expect(pikachu?.status).toBe(PokemonStatus.STORED);
    });

    it('should move a team member with only body Pokémon to box', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Set up encounters with only body Pokémon
      activePlaythrough.encounters = {
        route1: {
          head: null,
          body: testPokemon.charmander(),
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      // Add team member with only body Pokémon
      activePlaythrough.team.members[0] = {
        headPokemonUid: '',
        bodyPokemonUid: 'charmander_route1_456',
      };

      // Verify team member exists
      expectTeamMember(
        activePlaythrough.team.members[0],
        '',
        'charmander_route1_456'
      );

      // Move team member to box
      await moveTeamMemberToBox(0);

      // Verify team member is removed
      expectTeamMember(activePlaythrough.team.members[0], null);

      // Verify body Pokémon status is updated to STORED
      const charmander = activePlaythrough.encounters.route1.body;
      expect(charmander?.status).toBe(PokemonStatus.STORED);
    });

    it('should handle invalid position gracefully', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Try to move team member at invalid position
      await moveTeamMemberToBox(-1);
      await moveTeamMemberToBox(6);

      // Should not throw error and should not modify anything
      expect(activePlaythrough.team.members).toHaveLength(6);
    });

    it('should handle empty team slot gracefully', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Verify slot 0 is empty
      expectTeamMember(activePlaythrough.team.members[0], null);

      // Try to move team member at empty slot
      await moveTeamMemberToBox(0);

      // Should not throw error and should not modify anything
      expectTeamMember(activePlaythrough.team.members[0], null);
    });

    it('should handle missing team gracefully', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Remove team property
      delete (activePlaythrough as any).team;

      // Try to move team member
      await moveTeamMemberToBox(0);

      // Should not throw error
      expect(true).toBe(true);
    });

    it('should update playthrough timestamp', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Set up encounters and team member
      activePlaythrough.encounters = {
        route1: {
          head: testPokemon.pikachu(),
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      activePlaythrough.team.members[0] = {
        headPokemonUid: 'pikachu_route1_123',
        bodyPokemonUid: '',
      };

      const originalTimestamp = activePlaythrough.updatedAt;

      // Wait a bit to ensure timestamp difference
      await waitForTimestamp();

      // Move team member to box
      await moveTeamMemberToBox(0);

      // Verify timestamp is updated
      expect(activePlaythrough.updatedAt).toBeGreaterThan(originalTimestamp);
    });
  });

  describe('restorePokemonToTeam', () => {
    it('should restore stored Pokémon to original receival status', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Set up encounters with stored Pokémon that has originalReceivalStatus
      activePlaythrough.encounters = {
        route1: {
          head: {
            ...testPokemon.pikachu(),
            status: PokemonStatus.STORED,
            originalReceivalStatus: PokemonStatus.CAPTURED,
          },
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      // Restore Pokémon to team
      await restorePokemonToTeam('pikachu_route1_123');

      // Verify status is restored to original receival status
      const pikachu = activePlaythrough.encounters.route1.head;
      expect(pikachu?.status).toBe(PokemonStatus.CAPTURED);
    });

    it('should default to captured status if no original receival status exists', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Set up encounters with stored Pokémon without originalReceivalStatus
      activePlaythrough.encounters = {
        route1: {
          head: {
            ...testPokemon.pikachu(),
            status: PokemonStatus.STORED,
            // No originalReceivalStatus
          },
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      // Restore Pokémon to team
      await restorePokemonToTeam('pikachu_route1_123');

      // Verify status defaults to captured
      const pikachu = activePlaythrough.encounters.route1.head;
      expect(pikachu?.status).toBe(PokemonStatus.CAPTURED);
    });

    it('should not change status if Pokémon is not stored', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Set up encounters with captured Pokémon
      activePlaythrough.encounters = {
        route1: {
          head: testPokemon.pikachu(),
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      const originalStatus = activePlaythrough.encounters.route1.head?.status;

      // Try to restore Pokémon that is not stored
      await restorePokemonToTeam('pikachu_route1_123');

      // Verify status is unchanged
      const pikachu = activePlaythrough.encounters.route1.head;
      expect(pikachu?.status).toBe(originalStatus);
    });

    it('should handle Pokémon not found gracefully', async () => {
      createTestPlaythrough();

      // Try to restore non-existent Pokémon
      await restorePokemonToTeam('non-existent-uid');

      // Should not throw error
      expect(true).toBe(true);
    });

    it('should actually update the Pokémon status in the store', async () => {
      const { activePlaythrough } = createTestPlaythrough();

      // Set up encounters with stored Pokémon
      activePlaythrough.encounters = {
        route1: {
          head: {
            ...testPokemon.pikachu(),
            status: PokemonStatus.STORED,
            originalReceivalStatus: PokemonStatus.CAPTURED,
          },
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      // Verify initial status
      expect(activePlaythrough.encounters.route1.head?.status).toBe(
        PokemonStatus.STORED
      );

      // Restore Pokémon to team
      await restorePokemonToTeam('pikachu_route1_123');

      // Verify status is actually updated in the store
      expect(activePlaythrough.encounters.route1.head?.status).toBe(
        PokemonStatus.CAPTURED
      );

      // Verify the playthrough timestamp was updated
      expect(activePlaythrough.updatedAt).toBeGreaterThan(0);
    });
  });
});
