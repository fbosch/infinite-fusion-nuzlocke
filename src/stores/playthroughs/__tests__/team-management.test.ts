import { describe, it, expect, beforeEach } from 'vitest';
import {
  playthroughsStore,
  updateTeamMember,
  removeFromTeam,
  reorderTeam,
  getTeamMemberDetails,
  isTeamFull,
  getAvailableTeamPositions,
} from '../store';
import { createPlaythrough } from '../store';

describe('Team Management Functions', () => {
  beforeEach(() => {
    // Reset store before each test
    playthroughsStore.playthroughs = [];
    playthroughsStore.activePlaythroughId = undefined;
    playthroughsStore.isLoading = false;
    playthroughsStore.isSaving = false;
  });

  describe('updateTeamMember', () => {
    it('should add a Pokémon to an empty team position', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      // Add some encounters first
      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (activePlaythrough) {
        activePlaythrough.encounters = {
          route1: {
            head: {
              id: 'pikachu',
              name: 'Pikachu',
              nickname: 'Sparky',
              level: 5,
              isActive: true,
              isStored: false,
              isDeceased: false,
            },
            body: {
              id: 'charmander',
              name: 'Charmander',
              nickname: 'Flame',
              level: 5,
              isActive: true,
              isStored: false,
              isDeceased: false,
            },
            isFusion: true,
            updatedAt: Date.now(),
          },
        };
      }

      const result = await updateTeamMember(
        0,
        { uid: 'pikachu_route1_123' },
        { uid: 'charmander_route1_456' }
      );

      expect(result).toBe(true);
      expect(activePlaythrough?.team.members[0]).toEqual({
        headPokemonUid: 'pikachu_route1_123',
        bodyPokemonUid: 'charmander_route1_456',
      });
    });

    it('should fail when adding to an occupied position', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      // Add some encounters first
      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (activePlaythrough) {
        activePlaythrough.encounters = {
          route1: {
            head: {
              id: 'pikachu',
              name: 'Pikachu',
              nickname: 'Sparky',
              level: 5,
              isActive: true,
              isStored: false,
              isStored: false,
              isDeceased: false,
            },
            body: {
              id: 'charmander',
              name: 'Charmander',
              nickname: 'Flame',
              level: 5,
              isActive: true,
              isStored: false,
              isDeceased: false,
            },
            isFusion: true,
            updatedAt: Date.now(),
          },
        };
      }

      // Add first Pokémon
      await updateTeamMember(
        0,
        { uid: 'pikachu_route1_123' },
        { uid: 'charmander_route1_456' }
      );

      // Try to add another to the same position
      const result = await updateTeamMember(
        0,
        { uid: 'pikachu_route1_123' },
        { uid: 'charmander_route1_456' }
      );

      expect(result).toBe(true);
    });

    it('should fail when adding to invalid position', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const result = await updateTeamMember(
        10,
        { uid: 'pikachu_route1_123' },
        { uid: 'charmander_route1_456' }
      );

      expect(result).toBe(false);
    });
  });

  describe('removeFromTeam', () => {
    it('should remove a Pokémon from a team position', () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      // Add some encounters and team member
      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (activePlaythrough) {
        activePlaythrough.encounters = {
          route1: {
            head: {
              id: 'pikachu',
              name: 'Pikachu',
              nickname: 'Sparky',
              level: 5,
              isActive: true,
              isStored: false,
              isDeceased: false,
            },
            body: {
              id: 'charmander',
              name: 'Charmander',
              nickname: 'Flame',
              level: 5,
              isActive: true,
              isStored: false,
              isDeceased: false,
            },
            isFusion: true,
            updatedAt: Date.now(),
          },
        };
        activePlaythrough.team.members[0] = {
          headEncounterId: 'route1',
          bodyEncounterId: 'route1',
        };
      }

      const result = removeFromTeam(0);

      expect(result).toBe(true);
      expect(activePlaythrough?.team.members[0]).toBeNull();
    });

    it('should fail when removing from empty position', () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const result = removeFromTeam(0);

      expect(result).toBe(false);
    });
  });

  describe('reorderTeam', () => {
    it('should reorder team members correctly', () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      // Add some encounters and team member
      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (activePlaythrough) {
        activePlaythrough.encounters = {
          route1: {
            head: {
              id: 'pikachu',
              name: 'Pikachu',
              nickname: 'Sparky',
              level: 5,
              isActive: true,
              isStored: false,
              isDeceased: false,
            },
            body: {
              id: 'charmander',
              name: 'Charmander',
              nickname: 'Flame',
              level: 5,
              isActive: true,
              isStored: false,
              isDeceased: false,
            },
            isFusion: true,
            updatedAt: Date.now(),
          },
        };
        activePlaythrough.team.members[0] = {
          headEncounterId: 'route1',
          bodyEncounterId: 'route1',
        };
      }

      const result = reorderTeam(0, 2);

      expect(result).toBe(true);
      expect(activePlaythrough?.team.members[0]).toBeNull();
      expect(activePlaythrough?.team.members[2]).toEqual({
        headEncounterId: 'route1',
        bodyEncounterId: 'route1',
      });
    });
  });

  describe('getTeamMemberDetails', () => {
    it('should return team member details', () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      // Add some encounters and team member
      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (activePlaythrough) {
        activePlaythrough.encounters = {
          route1: {
            head: {
              id: 'pikachu',
              name: 'Pikachu',
              nickname: 'Sparky',
              level: 5,
              isActive: true,
              isStored: false,
              isDeceased: false,
            },
            body: {
              id: 'charmander',
              name: 'Charmander',
              nickname: 'Flame',
              level: 5,
              isActive: true,
              isStored: false,
              isDeceased: false,
            },
            isFusion: true,
            updatedAt: Date.now(),
          },
        };
        activePlaythrough.team.members[0] = {
          headEncounterId: 'route1',
          bodyEncounterId: 'route1',
        };
      }

      const details = getTeamMemberDetails(0);

      expect(details).toBeDefined();
      expect(details?.position).toBe(0);
      expect(details?.teamMember).toEqual({
        headEncounterId: 'route1',
        bodyEncounterId: 'route1',
      });
    });

    it('should return null for empty position', () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const details = getTeamMemberDetails(0);

      expect(details).toBeNull();
    });
  });

  describe('isTeamFull', () => {
    it('should return false for empty team', () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const full = isTeamFull();

      expect(full).toBe(false);
    });

    it('should return true for full team', () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      // Fill the team
      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (activePlaythrough) {
        activePlaythrough.team.members = activePlaythrough.team.members.map(
          () => ({
            headEncounterId: 'dummy',
            bodyEncounterId: 'dummy',
          })
        );
      }

      const full = isTeamFull();

      expect(full).toBe(true);
    });
  });

  describe('getAvailableTeamPositions', () => {
    it('should return all positions for empty team', () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const positions = getAvailableTeamPositions();

      expect(positions).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('should return only empty positions', () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      // Add one team member
      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (activePlaythrough) {
        activePlaythrough.team.members[0] = {
          headEncounterId: 'dummy',
          bodyEncounterId: 'dummy',
        };
      }

      const positions = getAvailableTeamPositions();

      expect(positions).toEqual([1, 2, 3, 4, 5]);
    });
  });
});
