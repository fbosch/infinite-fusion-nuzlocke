import { beforeEach, expect } from 'vitest';
import { playthroughsStore, createPlaythrough } from '../store';
import { PokemonStatus } from '@/loaders/pokemon';
import type { PokemonOptionType } from '@/stores/playthroughs/types';

/**
 * Reset the playthroughs store before each test
 */
export const resetPlaythroughsStore = () => {
  beforeEach(() => {
    playthroughsStore.playthroughs = [];
    playthroughsStore.activePlaythroughId = undefined;
    playthroughsStore.isLoading = false;
    playthroughsStore.isSaving = false;
  });
};

/**
 * Create a test playthrough and return the playthrough ID and instance
 */
export const createTestPlaythrough = (name: string = 'Test Run') => {
  const playthroughId = createPlaythrough(name);
  playthroughsStore.activePlaythroughId = playthroughId;

  const activePlaythrough = playthroughsStore.playthroughs.find(
    p => p.id === playthroughId
  );

  if (!activePlaythrough) {
    throw new Error('Playthrough not found');
  }

  return { playthroughId, activePlaythrough };
};

/**
 * Create a test Pokémon with default values
 */
export const createTestPokemon = (
  overrides: Partial<PokemonOptionType> = {}
): PokemonOptionType => {
  const defaults = {
    id: 25,
    name: 'Pikachu',
    nationalDexId: 25,
    status: PokemonStatus.CAPTURED,
    uid: `pokemon_${Date.now()}_${Math.random()}`,
    originalLocation: 'route1',
  };

  return { ...defaults, ...overrides } as PokemonOptionType;
};

/**
 * Common test Pokémon definitions
 */
export const testPokemon = {
  pikachu: (uid: string = 'pikachu_route1_123'): PokemonOptionType => ({
    id: 25,
    name: 'Pikachu',
    nationalDexId: 25,
    nickname: 'Sparky',
    status: PokemonStatus.CAPTURED,
    uid,
    originalLocation: 'route1',
  }),

  charmander: (uid: string = 'charmander_route1_456'): PokemonOptionType => ({
    id: 4,
    name: 'Charmander',
    nationalDexId: 4,
    nickname: 'Flame',
    status: PokemonStatus.CAPTURED,
    uid,
    originalLocation: 'route1',
  }),

  squirtle: (uid: string = 'squirtle_route2_789'): PokemonOptionType => ({
    id: 7,
    name: 'Squirtle',
    nationalDexId: 7,
    nickname: 'Bubbles',
    status: PokemonStatus.CAPTURED,
    uid,
    originalLocation: 'route2',
  }),

  abra: (uid: string = 'abra_trade_101'): PokemonOptionType => ({
    id: 63,
    name: 'Abra',
    nationalDexId: 63,
    status: PokemonStatus.TRADED,
    uid,
    originalLocation: 'trade',
  }),

  bulbasaur: (uid: string = 'bulbasaur_starter_001'): PokemonOptionType => ({
    id: 1,
    name: 'Bulbasaur',
    nationalDexId: 1,
    status: PokemonStatus.RECEIVED,
    uid,
    originalLocation: 'starter',
  }),
};

/**
 * Helper to add a delay for timestamp testing
 */
export const waitForTimestamp = (ms: number = 10) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Helper to verify team member structure
 */
export const expectTeamMember = (
  teamMember: unknown,
  expectedHeadUid: string | null,
  expectedBodyUid: string | null = null
) => {
  if (expectedHeadUid === null) {
    expect(teamMember).toBeNull();
    return;
  }

  expect(teamMember).toBeDefined();
  const member = teamMember as {
    headPokemonUid?: string;
    bodyPokemonUid?: string;
  };
  expect(member.headPokemonUid).toBe(expectedHeadUid);
  expect(member.bodyPokemonUid).toBe(expectedBodyUid || '');
};

/**
 * Helper to verify encounter structure
 */
export const expectEncounter = (
  encounter: unknown,
  expectedHeadUid: string | null,
  expectedBodyUid: string | null = null,
  isFusion: boolean = false
) => {
  if (expectedHeadUid === null && expectedBodyUid === null) {
    expect(encounter).toBeUndefined();
    return;
  }

  expect(encounter).toBeDefined();
  const enc = encounter as {
    isFusion: boolean;
    head?: { uid: string } | null;
    body?: { uid: string } | null;
  };
  expect(enc.isFusion).toBe(isFusion);

  if (expectedHeadUid) {
    expect(enc.head?.uid).toBe(expectedHeadUid);
  } else {
    expect(enc.head).toBeNull();
  }

  if (expectedBodyUid) {
    expect(enc.body?.uid).toBe(expectedBodyUid);
  } else {
    expect(enc.body).toBeNull();
  }
};
