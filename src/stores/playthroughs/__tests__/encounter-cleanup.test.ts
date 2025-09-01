import { describe, it, expect } from 'vitest';
import {
  updateEncounter,
  clearEncounterFromLocation,
  resetEncounter,
} from '../encounters';
import {
  resetPlaythroughsStore,
  createTestPlaythrough,
  testPokemon,
  waitForTimestamp,
  expectTeamMember,
} from './test-utils';

describe('Team Member Cleanup on Encounter Clearing', () => {
  resetPlaythroughsStore();

  it('should remove team member when clearing encounter with updateEncounter', async () => {
    const { activePlaythrough } = createTestPlaythrough();

    // Set up encounter with Pokémon
    const pikachu = testPokemon.pikachu();

    await updateEncounter('route1', pikachu, 'head', false);

    // Verify team member was auto-assigned
    expectTeamMember(activePlaythrough.team.members[0], 'pikachu_route1_123');

    // Clear the encounter
    await updateEncounter('route1', null, 'head', false);

    // Verify team member was removed
    expectTeamMember(activePlaythrough.team.members[0], null);
  });

  it('should remove team member when clearing fusion encounter with updateEncounter', async () => {
    const { activePlaythrough } = createTestPlaythrough();

    // Set up fusion encounter
    const pikachu = testPokemon.pikachu();
    const charmander = testPokemon.charmander();

    await updateEncounter('route1', pikachu, 'head', false);
    await updateEncounter('route1', charmander, 'body', true);

    // Verify fusion was auto-assigned to team
    expectTeamMember(
      activePlaythrough.team.members[0],
      'pikachu_route1_123',
      'charmander_route1_456'
    );

    // Clear just the head Pokémon
    await updateEncounter('route1', null, 'head', false);

    // Verify team member was removed (since it lost one of its Pokémon)
    expectTeamMember(activePlaythrough.team.members[0], null);
  });

  it('should remove team member when using clearEncounterFromLocation', async () => {
    const { activePlaythrough } = createTestPlaythrough();

    // Set up encounter with Pokémon
    const pikachu = testPokemon.pikachu();

    await updateEncounter('route1', pikachu, 'head', false);

    // Verify team member was auto-assigned
    expectTeamMember(activePlaythrough.team.members[0], 'pikachu_route1_123');

    // Clear the encounter using clearEncounterFromLocation
    await clearEncounterFromLocation('route1', 'head');

    // Verify team member was removed
    expectTeamMember(activePlaythrough.team.members[0], null);
  });

  it('should remove team member when using resetEncounter', async () => {
    const { activePlaythrough } = createTestPlaythrough();

    // Set up encounter with Pokémon
    const pikachu = testPokemon.pikachu();

    await updateEncounter('route1', pikachu, 'head', false);

    // Verify team member was auto-assigned
    expectTeamMember(activePlaythrough.team.members[0], 'pikachu_route1_123');

    // Reset the encounter using resetEncounter
    resetEncounter('route1');

    // Verify team member was removed
    expectTeamMember(activePlaythrough.team.members[0], null);
  });

  it('should only remove affected team members, not all', async () => {
    const { activePlaythrough } = createTestPlaythrough();

    // Set up two separate encounters with Pokémon
    const pikachu = testPokemon.pikachu();
    const charmander = testPokemon.charmander('charmander_route2_456');

    await updateEncounter('route1', pikachu, 'head', false);
    await updateEncounter('route2', charmander, 'head', false);

    // Verify both team members were auto-assigned
    expectTeamMember(activePlaythrough.team.members[0], 'pikachu_route1_123');
    expectTeamMember(
      activePlaythrough.team.members[1],
      'charmander_route2_456'
    );

    // Clear only the first encounter
    await updateEncounter('route1', null, 'head', false);

    // Verify only the first team member was removed
    expectTeamMember(activePlaythrough.team.members[0], null);
    expectTeamMember(
      activePlaythrough.team.members[1],
      'charmander_route2_456'
    );
  });

  it('should handle clearing non-existent encounters gracefully', async () => {
    const { activePlaythrough } = createTestPlaythrough();

    // Try to clear a non-existent encounter
    await clearEncounterFromLocation('nonexistent_route', 'head');

    // Should not throw error and team should remain unchanged
    expect(
      activePlaythrough.team.members.every(member => member === null)
    ).toBe(true);
  });

  it('should update playthrough timestamp when team members are removed', async () => {
    const { activePlaythrough } = createTestPlaythrough();

    // Set up encounter with Pokémon
    const pikachu = testPokemon.pikachu();

    await updateEncounter('route1', pikachu, 'head', false);

    const originalTimestamp = activePlaythrough.updatedAt;

    // Wait a bit to ensure timestamp difference
    await waitForTimestamp();

    // Clear the encounter
    await updateEncounter('route1', null, 'head', false);

    // Verify timestamp was updated
    expect(activePlaythrough.updatedAt).toBeGreaterThan(originalTimestamp);
  });

  it('should remove team member when clearing entire encounter', async () => {
    const { activePlaythrough } = createTestPlaythrough();

    // Set up fusion encounter
    const pikachu = testPokemon.pikachu();
    const charmander = testPokemon.charmander();

    await updateEncounter('route1', pikachu, 'head', false);
    await updateEncounter('route1', charmander, 'body', true);

    // Verify fusion was auto-assigned to team
    expectTeamMember(
      activePlaythrough.team.members[0],
      'pikachu_route1_123',
      'charmander_route1_456'
    );

    // Clear the entire encounter
    await clearEncounterFromLocation('route1');

    // Verify team member was removed
    expectTeamMember(activePlaythrough.team.members[0], null);
  });

  it('should handle partial fusion clearing correctly', async () => {
    const { activePlaythrough } = createTestPlaythrough();

    // Set up fusion encounter
    const pikachu = testPokemon.pikachu();
    const charmander = testPokemon.charmander();

    await updateEncounter('route1', pikachu, 'head', false);
    await updateEncounter('route1', charmander, 'body', true);

    // Verify fusion was auto-assigned to team
    expectTeamMember(
      activePlaythrough.team.members[0],
      'pikachu_route1_123',
      'charmander_route1_456'
    );

    // Clear just the body Pokémon
    await clearEncounterFromLocation('route1', 'body');

    // Verify team member was removed (since it lost one of its Pokémon)
    expectTeamMember(activePlaythrough.team.members[0], null);
  });

  it('should handle multiple team members with different Pokémon correctly', async () => {
    const { activePlaythrough } = createTestPlaythrough();

    // Set up multiple encounters with different Pokémon
    const pikachu = testPokemon.pikachu();
    const charmander = testPokemon.charmander('charmander_route2_456');
    const squirtle = testPokemon.squirtle('squirtle_route3_789');

    await updateEncounter('route1', pikachu, 'head', false);
    await updateEncounter('route2', charmander, 'head', false);
    await updateEncounter('route3', squirtle, 'head', false);

    // Verify all team members were auto-assigned
    expectTeamMember(activePlaythrough.team.members[0], 'pikachu_route1_123');
    expectTeamMember(
      activePlaythrough.team.members[1],
      'charmander_route2_456'
    );
    expectTeamMember(activePlaythrough.team.members[2], 'squirtle_route3_789');

    // Clear the middle encounter
    resetEncounter('route2');

    // Verify only the middle team member was removed
    expectTeamMember(activePlaythrough.team.members[0], 'pikachu_route1_123');
    expectTeamMember(activePlaythrough.team.members[1], null);
    expectTeamMember(activePlaythrough.team.members[2], 'squirtle_route3_789');
  });
});
