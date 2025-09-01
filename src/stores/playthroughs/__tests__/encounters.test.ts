import { describe, it, expect, beforeEach } from 'vitest';
import { playthroughsStore, createPlaythrough } from '../store';
import {
  moveTeamMemberToBox,
  restorePokemonToTeam,
  updateEncounter,
  markEncounterAsCaptured,
  markEncounterAsReceived,
} from '../encounters';
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

  describe('restorePokemonToTeam', () => {
    it('should restore stored Pokémon to original receival status', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Set up encounters with stored Pokémon that has originalReceivalStatus
      activePlaythrough.encounters = {
        route1: {
          head: {
            id: 25,
            name: 'Pikachu',
            nationalDexId: 25,
            status: PokemonStatus.STORED,
            originalReceivalStatus: PokemonStatus.CAPTURED,
            uid: 'pikachu_route1_123',
            originalLocation: 'route1',
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
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Set up encounters with stored Pokémon without originalReceivalStatus
      activePlaythrough.encounters = {
        route1: {
          head: {
            id: 25,
            name: 'Pikachu',
            nationalDexId: 25,
            status: PokemonStatus.STORED,
            // No originalReceivalStatus
            uid: 'pikachu_route1_123',
            originalLocation: 'route1',
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
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Set up encounters with captured Pokémon
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

      const originalStatus = activePlaythrough.encounters.route1.head?.status;

      // Try to restore Pokémon that is not stored
      await restorePokemonToTeam('pikachu_route1_123');

      // Verify status is unchanged
      const pikachu = activePlaythrough.encounters.route1.head;
      expect(pikachu?.status).toBe(originalStatus);
    });

    it('should handle Pokémon not found gracefully', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      // Try to restore non-existent Pokémon
      await restorePokemonToTeam('non-existent-uid');

      // Should not throw error
      expect(true).toBe(true);
    });

    it('should actually update the Pokémon status in the store', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Set up encounters with stored Pokémon
      activePlaythrough.encounters = {
        route1: {
          head: {
            id: 25,
            name: 'Pikachu',
            nationalDexId: 25,
            status: PokemonStatus.STORED,
            originalReceivalStatus: PokemonStatus.CAPTURED,
            uid: 'pikachu_route1_123',
            originalLocation: 'route1',
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

  describe('Auto-Assignment to Team', () => {
    beforeEach(() => {
      // Reset store before each test
      playthroughsStore.playthroughs = [];
      playthroughsStore.activePlaythroughId = undefined;
      playthroughsStore.isLoading = false;
      playthroughsStore.isSaving = false;
    });

    it('should auto-assign captured Pokémon to first available team slot', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Verify team starts empty
      expect(
        activePlaythrough.team.members.every(member => member === null)
      ).toBe(true);

      // Create a captured Pokémon encounter
      const pikachu = {
        id: 25,
        name: 'Pikachu',
        nationalDexId: 25,
        status: PokemonStatus.CAPTURED,
        uid: 'pikachu_route1_123',
        originalLocation: 'route1',
      };

      // Add encounter using updateEncounter (simulates starter selection)
      await updateEncounter('route1', pikachu, 'head', false);

      // Verify Pokémon was added to team slot 0
      expect(activePlaythrough.team.members[0]).toBeDefined();
      expect(activePlaythrough.team.members[0]?.headPokemonUid).toBe(
        'pikachu_route1_123'
      );
      expect(activePlaythrough.team.members[0]?.bodyPokemonUid).toBe('');
    });

    it('should auto-assign received Pokémon to first available team slot', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Create a received Pokémon encounter (like a starter)
      const charmander = {
        id: 4,
        name: 'Charmander',
        nationalDexId: 4,
        status: PokemonStatus.RECEIVED,
        uid: 'charmander_starter_456',
        originalLocation: 'starter',
      };

      // Add encounter using updateEncounter (simulates starter selection)
      await updateEncounter('starter', charmander, 'head', false);

      // Verify Pokémon was added to team slot 0
      expect(activePlaythrough.team.members[0]).toBeDefined();
      expect(activePlaythrough.team.members[0]?.headPokemonUid).toBe(
        'charmander_starter_456'
      );
      expect(activePlaythrough.team.members[0]?.bodyPokemonUid).toBe('');
    });

    it('should auto-assign traded Pokémon to first available team slot', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Create a traded Pokémon encounter
      const abra = {
        id: 63,
        name: 'Abra',
        nationalDexId: 63,
        status: PokemonStatus.TRADED,
        uid: 'abra_trade_789',
        originalLocation: 'trade',
      };

      // Add encounter using updateEncounter
      await updateEncounter('trade', abra, 'head', false);

      // Verify Pokémon was added to team slot 0
      expect(activePlaythrough.team.members[0]).toBeDefined();
      expect(activePlaythrough.team.members[0]?.headPokemonUid).toBe(
        'abra_trade_789'
      );
      expect(activePlaythrough.team.members[0]?.bodyPokemonUid).toBe('');
    });

    it('should auto-assign fusion Pokémon to a single team slot', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Create a fusion encounter with captured status
      const pikachu = {
        id: 25,
        name: 'Pikachu',
        nationalDexId: 25,
        status: PokemonStatus.CAPTURED,
        uid: 'pikachu_route1_123',
        originalLocation: 'route1',
      };

      const charmander = {
        id: 4,
        name: 'Charmander',
        nationalDexId: 4,
        status: PokemonStatus.CAPTURED,
        uid: 'charmander_route1_456',
        originalLocation: 'route1',
      };

      // Add head Pokémon first
      await updateEncounter('route1', pikachu, 'head', false);

      // Add body Pokémon to create fusion
      await updateEncounter('route1', charmander, 'body', true);

      // Verify both Pokémon were assigned to a single team slot as a fusion
      expect(activePlaythrough.team.members[0]).toBeDefined();
      expect(activePlaythrough.team.members[0]?.headPokemonUid).toBe(
        'pikachu_route1_123'
      );
      expect(activePlaythrough.team.members[0]?.bodyPokemonUid).toBe(
        'charmander_route1_456'
      );

      // Verify the second slot remains empty since the fusion takes only one slot
      expect(activePlaythrough.team.members[1]).toBeNull();

      // Verify the encounter is properly set up as a fusion
      expect(activePlaythrough.encounters?.route1.isFusion).toBe(true);
      expect(activePlaythrough.encounters?.route1.head?.uid).toBe(
        'pikachu_route1_123'
      );
      expect(activePlaythrough.encounters?.route1.body?.uid).toBe(
        'charmander_route1_456'
      );
    });

    it('should use next available team slot when first slot is occupied', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Fill first team slot manually
      activePlaythrough.team.members[0] = {
        headPokemonUid: 'existing_pokemon_123',
        bodyPokemonUid: '',
      };

      // Create a captured Pokémon encounter
      const pikachu = {
        id: 25,
        name: 'Pikachu',
        nationalDexId: 25,
        status: PokemonStatus.CAPTURED,
        uid: 'pikachu_route1_123',
        originalLocation: 'route1',
      };

      // Add encounter - should go to slot 1
      await updateEncounter('route1', pikachu, 'head', false);

      // Verify Pokémon was added to team slot 1 (not 0)
      expect(activePlaythrough.team.members[0]?.headPokemonUid).toBe(
        'existing_pokemon_123'
      );
      expect(activePlaythrough.team.members[1]).toBeDefined();
      expect(activePlaythrough.team.members[1]?.headPokemonUid).toBe(
        'pikachu_route1_123'
      );
    });

    it('should not auto-assign Pokémon without relevant status', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Create a Pokémon without status
      const pikachu = {
        id: 25,
        name: 'Pikachu',
        nationalDexId: 25,
        uid: 'pikachu_route1_123',
        originalLocation: 'route1',
      };

      // Add encounter without status
      await updateEncounter('route1', pikachu, 'head', false);

      // Verify no team assignment occurred
      expect(
        activePlaythrough.team.members.every(member => member === null)
      ).toBe(true);
    });

    it('should not auto-assign when team is full', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Fill all team slots
      for (let i = 0; i < 6; i++) {
        activePlaythrough.team.members[i] = {
          headPokemonUid: `pokemon_${i}_123`,
          bodyPokemonUid: '',
        };
      }

      // Verify team is full
      expect(
        activePlaythrough.team.members.every(member => member !== null)
      ).toBe(true);

      // Create a captured Pokémon encounter
      const pikachu = {
        id: 25,
        name: 'Pikachu',
        nationalDexId: 25,
        status: PokemonStatus.CAPTURED,
        uid: 'pikachu_route1_123',
        originalLocation: 'route1',
      };

      // Add encounter - should not auto-assign since team is full
      await updateEncounter('route1', pikachu, 'head', false);

      // Verify no new team assignment occurred
      expect(
        activePlaythrough.team.members.every(member => member !== null)
      ).toBe(true);

      // Verify the encounter was still created
      expect(activePlaythrough.encounters?.route1.head).toBeDefined();
      expect(activePlaythrough.encounters?.route1.head?.uid).toBe(
        'pikachu_route1_123'
      );
    });

    it('should work with markEncounterAsCaptured function', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Create an encounter without status first
      const pikachu = {
        id: 25,
        name: 'Pikachu',
        nationalDexId: 25,
        uid: 'pikachu_route1_123',
        originalLocation: 'route1',
      };

      await updateEncounter('route1', pikachu, 'head', false);

      // Verify no team assignment occurred initially
      expect(
        activePlaythrough.team.members.every(member => member === null)
      ).toBe(true);

      // Now mark as captured - should trigger auto-assignment
      await markEncounterAsCaptured('route1');

      // Verify Pokémon was added to team slot 0
      expect(activePlaythrough.team.members[0]).toBeDefined();
      expect(activePlaythrough.team.members[0]?.headPokemonUid).toBe(
        'pikachu_route1_123'
      );
    });

    it('should work with markEncounterAsReceived function', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Create an encounter without status first
      const charmander = {
        id: 4,
        name: 'Charmander',
        nationalDexId: 4,
        uid: 'charmander_starter_456',
        originalLocation: 'starter',
      };

      await updateEncounter('starter', charmander, 'head', false);

      // Verify no team assignment occurred initially
      expect(
        activePlaythrough.team.members.every(member => member === null)
      ).toBe(true);

      // Now mark as received - should trigger auto-assignment
      await markEncounterAsReceived('starter');

      // Verify Pokémon was added to team slot 0
      expect(activePlaythrough.team.members[0]).toBeDefined();
      expect(activePlaythrough.team.members[0]?.headPokemonUid).toBe(
        'charmander_starter_456'
      );
    });

    it('should handle multiple consecutive auto-assignments correctly', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Add multiple captured Pokémon in sequence
      const pokemon = [
        {
          id: 25,
          name: 'Pikachu',
          nationalDexId: 25,
          status: PokemonStatus.CAPTURED,
          uid: 'pikachu_route1_123',
          originalLocation: 'route1',
        },
        {
          id: 4,
          name: 'Charmander',
          nationalDexId: 4,
          status: PokemonStatus.CAPTURED,
          uid: 'charmander_route2_456',
          originalLocation: 'route2',
        },
        {
          id: 7,
          name: 'Squirtle',
          nationalDexId: 7,
          status: PokemonStatus.CAPTURED,
          uid: 'squirtle_route3_789',
          originalLocation: 'route3',
        },
      ];

      // Add them one by one
      for (let i = 0; i < pokemon.length; i++) {
        await updateEncounter(`route${i + 1}`, pokemon[i], 'head', false);
      }

      // Verify they were assigned to consecutive slots
      expect(activePlaythrough.team.members[0]?.headPokemonUid).toBe(
        'pikachu_route1_123'
      );
      expect(activePlaythrough.team.members[1]?.headPokemonUid).toBe(
        'charmander_route2_456'
      );
      expect(activePlaythrough.team.members[2]?.headPokemonUid).toBe(
        'squirtle_route3_789'
      );
      expect(activePlaythrough.team.members[3]).toBeNull();
      expect(activePlaythrough.team.members[4]).toBeNull();
      expect(activePlaythrough.team.members[5]).toBeNull();
    });
  });

  describe('Team Member Cleanup on Encounter Clearing', () => {
    beforeEach(() => {
      // Reset store before each test
      playthroughsStore.playthroughs = [];
      playthroughsStore.activePlaythroughId = undefined;
      playthroughsStore.isLoading = false;
      playthroughsStore.isSaving = false;
    });

    it('should remove team member when clearing encounter with updateEncounter', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Set up encounter with Pokémon
      const pikachu = {
        id: 25,
        name: 'Pikachu',
        nationalDexId: 25,
        status: PokemonStatus.CAPTURED,
        uid: 'pikachu_route1_123',
        originalLocation: 'route1',
      };

      await updateEncounter('route1', pikachu, 'head', false);

      // Verify team member was auto-assigned
      expect(activePlaythrough.team.members[0]).toBeDefined();
      expect(activePlaythrough.team.members[0]?.headPokemonUid).toBe(
        'pikachu_route1_123'
      );

      // Clear the encounter
      await updateEncounter('route1', null, 'head', false);

      // Verify team member was removed
      expect(activePlaythrough.team.members[0]).toBeNull();
    });

    it('should remove team member when clearing fusion encounter with updateEncounter', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Set up fusion encounter
      const pikachu = {
        id: 25,
        name: 'Pikachu',
        nationalDexId: 25,
        status: PokemonStatus.CAPTURED,
        uid: 'pikachu_route1_123',
        originalLocation: 'route1',
      };

      const charmander = {
        id: 4,
        name: 'Charmander',
        nationalDexId: 4,
        status: PokemonStatus.CAPTURED,
        uid: 'charmander_route1_456',
        originalLocation: 'route1',
      };

      await updateEncounter('route1', pikachu, 'head', false);
      await updateEncounter('route1', charmander, 'body', true);

      // Verify fusion was auto-assigned to team
      expect(activePlaythrough.team.members[0]).toBeDefined();
      expect(activePlaythrough.team.members[0]?.headPokemonUid).toBe(
        'pikachu_route1_123'
      );
      expect(activePlaythrough.team.members[0]?.bodyPokemonUid).toBe(
        'charmander_route1_456'
      );

      // Clear just the head Pokémon
      await updateEncounter('route1', null, 'head', false);

      // Verify team member was removed (since it lost one of its Pokémon)
      expect(activePlaythrough.team.members[0]).toBeNull();
    });

    it('should remove team member when using clearEncounterFromLocation', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Set up encounter with Pokémon
      const pikachu = {
        id: 25,
        name: 'Pikachu',
        nationalDexId: 25,
        status: PokemonStatus.CAPTURED,
        uid: 'pikachu_route1_123',
        originalLocation: 'route1',
      };

      await updateEncounter('route1', pikachu, 'head', false);

      // Verify team member was auto-assigned
      expect(activePlaythrough.team.members[0]).toBeDefined();
      expect(activePlaythrough.team.members[0]?.headPokemonUid).toBe(
        'pikachu_route1_123'
      );

      // Clear the encounter using clearEncounterFromLocation
      const { clearEncounterFromLocation } = await import('../encounters');
      await clearEncounterFromLocation('route1', 'head');

      // Verify team member was removed
      expect(activePlaythrough.team.members[0]).toBeNull();
    });

    it('should remove team member when using resetEncounter', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Set up encounter with Pokémon
      const pikachu = {
        id: 25,
        name: 'Pikachu',
        nationalDexId: 25,
        status: PokemonStatus.CAPTURED,
        uid: 'pikachu_route1_123',
        originalLocation: 'route1',
      };

      await updateEncounter('route1', pikachu, 'head', false);

      // Verify team member was auto-assigned
      expect(activePlaythrough.team.members[0]).toBeDefined();
      expect(activePlaythrough.team.members[0]?.headPokemonUid).toBe(
        'pikachu_route1_123'
      );

      // Reset the encounter using resetEncounter
      const { resetEncounter } = await import('../encounters');
      resetEncounter('route1');

      // Verify team member was removed
      expect(activePlaythrough.team.members[0]).toBeNull();
    });

    it('should only remove affected team members, not all', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Set up two separate encounters with Pokémon
      const pikachu = {
        id: 25,
        name: 'Pikachu',
        nationalDexId: 25,
        status: PokemonStatus.CAPTURED,
        uid: 'pikachu_route1_123',
        originalLocation: 'route1',
      };

      const charmander = {
        id: 4,
        name: 'Charmander',
        nationalDexId: 4,
        status: PokemonStatus.CAPTURED,
        uid: 'charmander_route2_456',
        originalLocation: 'route2',
      };

      await updateEncounter('route1', pikachu, 'head', false);
      await updateEncounter('route2', charmander, 'head', false);

      // Verify both team members were auto-assigned
      expect(activePlaythrough.team.members[0]).toBeDefined();
      expect(activePlaythrough.team.members[0]?.headPokemonUid).toBe(
        'pikachu_route1_123'
      );
      expect(activePlaythrough.team.members[1]).toBeDefined();
      expect(activePlaythrough.team.members[1]?.headPokemonUid).toBe(
        'charmander_route2_456'
      );

      // Clear only the first encounter
      await updateEncounter('route1', null, 'head', false);

      // Verify only the first team member was removed
      expect(activePlaythrough.team.members[0]).toBeNull();
      expect(activePlaythrough.team.members[1]).toBeDefined();
      expect(activePlaythrough.team.members[1]?.headPokemonUid).toBe(
        'charmander_route2_456'
      );
    });

    it('should handle clearing non-existent encounters gracefully', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Try to clear a non-existent encounter
      const { clearEncounterFromLocation } = await import('../encounters');
      await clearEncounterFromLocation('nonexistent_route', 'head');

      // Should not throw error and team should remain unchanged
      expect(
        activePlaythrough.team.members.every(member => member === null)
      ).toBe(true);
    });

    it('should update playthrough timestamp when team members are removed', async () => {
      const playthroughId = createPlaythrough('Test Run');
      playthroughsStore.activePlaythroughId = playthroughId;

      const activePlaythrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      if (!activePlaythrough) throw new Error('Playthrough not found');

      // Set up encounter with Pokémon
      const pikachu = {
        id: 25,
        name: 'Pikachu',
        nationalDexId: 25,
        status: PokemonStatus.CAPTURED,
        uid: 'pikachu_route1_123',
        originalLocation: 'route1',
      };

      await updateEncounter('route1', pikachu, 'head', false);

      const originalTimestamp = activePlaythrough.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Clear the encounter
      await updateEncounter('route1', null, 'head', false);

      // Verify timestamp was updated
      expect(activePlaythrough.updatedAt).toBeGreaterThan(originalTimestamp);
    });
  });
});
