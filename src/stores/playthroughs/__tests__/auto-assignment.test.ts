import { describe, it, expect } from 'vitest';
import {
  updateEncounter,
  markEncounterAsCaptured,
  markEncounterAsReceived,
} from '../encounters';
import {
  resetPlaythroughsStore,
  createTestPlaythrough,
  testPokemon,
  expectTeamMember,
} from './test-utils';

describe('Auto-Assignment to Team', () => {
  resetPlaythroughsStore();

  it('should auto-assign captured Pokémon to first available team slot', async () => {
    const { activePlaythrough } = createTestPlaythrough();

    // Verify team starts empty
    expect(
      activePlaythrough.team.members.every(member => member === null)
    ).toBe(true);

    // Create a captured Pokémon encounter
    const pikachu = testPokemon.pikachu();

    // Add encounter using updateEncounter (simulates starter selection)
    await updateEncounter('route1', pikachu, 'head', false);

    // Verify Pokémon was added to team slot 0
    expectTeamMember(
      activePlaythrough.team.members[0],
      'pikachu_route1_123',
      ''
    );
  });

  it('should auto-assign received Pokémon to first available team slot', async () => {
    const { activePlaythrough } = createTestPlaythrough();

    // Create a received Pokémon encounter (like a starter)
    const charmander = testPokemon.bulbasaur('charmander_starter_456');

    // Add encounter using updateEncounter (simulates starter selection)
    await updateEncounter('starter', charmander, 'head', false);

    // Verify Pokémon was added to team slot 0
    expectTeamMember(
      activePlaythrough.team.members[0],
      'charmander_starter_456',
      ''
    );
  });

  it('should auto-assign traded Pokémon to first available team slot', async () => {
    const { activePlaythrough } = createTestPlaythrough();

    // Create a traded Pokémon encounter
    const abra = testPokemon.abra();

    // Add encounter using updateEncounter
    await updateEncounter('trade', abra, 'head', false);

    // Verify Pokémon was added to team slot 0
    expectTeamMember(activePlaythrough.team.members[0], 'abra_trade_101', '');
  });

  it('should auto-assign fusion Pokémon to a single team slot', async () => {
    const { activePlaythrough } = createTestPlaythrough();

    // Create a fusion encounter with captured status
    const pikachu = testPokemon.pikachu();
    const charmander = testPokemon.charmander();

    // Add head Pokémon first
    await updateEncounter('route1', pikachu, 'head', false);

    // Add body Pokémon to create fusion
    await updateEncounter('route1', charmander, 'body', true);

    // Verify both Pokémon were assigned to a single team slot as a fusion
    expectTeamMember(
      activePlaythrough.team.members[0],
      'pikachu_route1_123',
      'charmander_route1_456'
    );

    // Verify the second slot remains empty since the fusion takes only one slot
    expectTeamMember(activePlaythrough.team.members[1], null);

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
    const { activePlaythrough } = createTestPlaythrough();

    // Fill first team slot manually
    activePlaythrough.team.members[0] = {
      headPokemonUid: 'existing_pokemon_123',
      bodyPokemonUid: '',
    };

    // Create a captured Pokémon encounter
    const pikachu = testPokemon.pikachu();

    // Add encounter - should go to slot 1
    await updateEncounter('route1', pikachu, 'head', false);

    // Verify Pokémon was added to team slot 1 (not 0)
    expect(activePlaythrough.team.members[0]?.headPokemonUid).toBe(
      'existing_pokemon_123'
    );
    expectTeamMember(
      activePlaythrough.team.members[1],
      'pikachu_route1_123',
      ''
    );
  });

  it('should not auto-assign Pokémon without relevant status', async () => {
    const { activePlaythrough } = createTestPlaythrough();

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
    const { activePlaythrough } = createTestPlaythrough();

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
    const pikachu = testPokemon.pikachu();

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
    const { activePlaythrough } = createTestPlaythrough();

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
    expectTeamMember(activePlaythrough.team.members[0], 'pikachu_route1_123');
  });

  it('should work with markEncounterAsReceived function', async () => {
    const { activePlaythrough } = createTestPlaythrough();

    // Create an encounter without status first
    const charmander = {
      id: 1,
      name: 'Bulbasaur',
      nationalDexId: 1,
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
    expectTeamMember(
      activePlaythrough.team.members[0],
      'charmander_starter_456'
    );
  });

  it('should handle multiple consecutive auto-assignments correctly', async () => {
    const { activePlaythrough } = createTestPlaythrough();

    // Add multiple captured Pokémon in sequence
    const pokemon = [
      testPokemon.pikachu(),
      testPokemon.charmander('charmander_route2_456'),
      testPokemon.squirtle('squirtle_route3_789'),
    ];

    // Add them one by one
    for (let i = 0; i < pokemon.length; i++) {
      await updateEncounter(`route${i + 1}`, pokemon[i], 'head', false);
    }

    // Verify they were assigned to consecutive slots
    expectTeamMember(activePlaythrough.team.members[0], 'pikachu_route1_123');
    expectTeamMember(
      activePlaythrough.team.members[1],
      'charmander_route2_456'
    );
    expectTeamMember(activePlaythrough.team.members[2], 'squirtle_route3_789');
    expectTeamMember(activePlaythrough.team.members[3], null);
    expectTeamMember(activePlaythrough.team.members[4], null);
    expectTeamMember(activePlaythrough.team.members[5], null);
  });
});
