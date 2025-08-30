import { describe, it, expect, beforeEach } from 'vitest';
import { playthroughsStore, createPlaythrough } from '../store';
import { moveTeamMemberToBox } from '../encounters';
import { PokemonStatus } from '@/loaders/pokemon';

describe('Encounter Actions', () => {
  beforeEach(() => {
    // Reset store before each test
    playthroughsStore.playthroughs = [];
    playthroughsStore.activePlaythroughId = undefined;
    playthroughsStore.isLoading = false;
    playthroughsStore.isSaving = false;
  });

  describe('moveTeamMemberToBox', () => {
    it('should move a team member with both head and body Pokémon to box', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Set up encounters with Pokémon
      activePlaythrough.encounters = {
        route1: {
          head: {
            id: 25,
            name: 'Pikachu',
            nationalDexId: 25,
            nickname: 'Sparky',
            status: PokemonStatus.CAPTURED,
            uid: 'pikachu_route1_123',
            originalLocation: 'route1',
          },
          body: {
            id: 4,
            name: 'Charmander',
            nationalDexId: 4,
            nickname: 'Flame',
            status: PokemonStatus.CAPTURED,
            uid: 'charmander_route1_456',
            originalLocation: 'route1',
          },
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
      expect(activePlaythrough.team.members[0]).toBeDefined();
      expect(activePlaythrough.team.members[0]?.headPokemonUid).toBe(
        'pikachu_route1_123'
      );
      expect(activePlaythrough.team.members[0]?.bodyPokemonUid).toBe(
        'charmander_route1_456'
      );

      // Move team member to box
      await moveTeamMemberToBox(0);

      // Verify team member is removed
      expect(activePlaythrough.team.members[0]).toBeNull();

      // Verify Pokémon statuses are updated to STORED
      const pikachu = activePlaythrough.encounters.route1.head;
      const charmander = activePlaythrough.encounters.route1.body;

      expect(pikachu?.status).toBe(PokemonStatus.STORED);
      expect(charmander?.status).toBe(PokemonStatus.STORED);
    });

    it('should move a team member with only head Pokémon to box', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Set up encounters with only head Pokémon
      activePlaythrough.encounters = {
        route1: {
          head: {
            id: 25,
            name: 'Pikachu',
            nationalDexId: 25,
            nickname: 'Sparky',
            status: PokemonStatus.CAPTURED,
            uid: 'pikachu_route1_123',
            originalLocation: 'route1',
          },
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
      expect(activePlaythrough.team.members[0]).toBeDefined();
      expect(activePlaythrough.team.members[0]?.headPokemonUid).toBe(
        'pikachu_route1_123'
      );
      expect(activePlaythrough.team.members[0]?.bodyPokemonUid).toBe('');

      // Move team member to box
      await moveTeamMemberToBox(0);

      // Verify team member is removed
      expect(activePlaythrough.team.members[0]).toBeNull();

      // Verify head Pokémon status is updated to STORED
      const pikachu = activePlaythrough.encounters.route1.head;
      expect(pikachu?.status).toBe(PokemonStatus.STORED);
    });

    it('should move a team member with only body Pokémon to box', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Set up encounters with only body Pokémon
      activePlaythrough.encounters = {
        route1: {
          head: null,
          body: {
            id: 4,
            name: 'Charmander',
            nationalDexId: 4,
            nickname: 'Flame',
            status: PokemonStatus.CAPTURED,
            uid: 'charmander_route1_456',
            originalLocation: 'route1',
          },
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
      expect(activePlaythrough.team.members[0]).toBeDefined();
      expect(activePlaythrough.team.members[0]?.headPokemonUid).toBe('');
      expect(activePlaythrough.team.members[0]?.bodyPokemonUid).toBe(
        'charmander_route1_456'
      );

      // Move team member to box
      await moveTeamMemberToBox(0);

      // Verify team member is removed
      expect(activePlaythrough.team.members[0]).toBeNull();

      // Verify body Pokémon status is updated to STORED
      const charmander = activePlaythrough.encounters.route1.body;
      expect(charmander?.status).toBe(PokemonStatus.STORED);
    });

    it('should handle invalid position gracefully', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      // Try to move team member at invalid position
      await moveTeamMemberToBox(-1);
      await moveTeamMemberToBox(6);

      // Should not throw error and should not modify anything
      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      expect(activePlaythrough?.team.members).toHaveLength(6);
    });

    it('should handle empty team slot gracefully', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Verify slot 0 is empty
      expect(activePlaythrough.team.members[0]).toBeNull();

      // Try to move team member at empty slot
      await moveTeamMemberToBox(0);

      // Should not throw error and should not modify anything
      expect(activePlaythrough.team.members[0]).toBeNull();
    });

    it('should handle missing team gracefully', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Remove team property
      delete (activePlaythrough as any).team;

      // Try to move team member
      await moveTeamMemberToBox(0);

      // Should not throw error
      expect(true).toBe(true);
    });

    it('should update playthrough timestamp', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Set up encounters and team member
      activePlaythrough.encounters = {
        route1: {
          head: {
            id: 25,
            name: 'Pikachu',
            nationalDexId: 25,
            status: PokemonStatus.CAPTURED,
            uid: 'pikachu_route1_123',
            originalLocation: 'route1',
          },
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
      await new Promise(resolve => setTimeout(resolve, 10));

      // Move team member to box
      await moveTeamMemberToBox(0);

      // Verify timestamp is updated
      expect(activePlaythrough.updatedAt).toBeGreaterThan(originalTimestamp);
    });
  });
});
