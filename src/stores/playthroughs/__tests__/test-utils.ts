import { beforeEach, expect } from "vitest";
import { type PokemonOptionType, PokemonStatus } from "@/loaders/pokemon";
import { createPlaythrough, playthroughsStore } from "../store";

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
export const createTestPlaythrough = (name = "Test Run") => {
  const playthroughId = createPlaythrough(name);
  playthroughsStore.activePlaythroughId = playthroughId;

  const activePlaythrough = playthroughsStore.playthroughs.find(
    (p) => p.id === playthroughId,
  );

  if (!activePlaythrough) {
    throw new Error("Playthrough not found");
  }

  return { activePlaythrough, playthroughId };
};

/**
 * Create a test Pokémon with default values
 */
export const createTestPokemon = (
  overrides: Partial<PokemonOptionType> = {},
): PokemonOptionType => {
  const defaults = {
    id: 25,
    name: "Pikachu",
    nationalDexId: 25,
    originalLocation: "route1",
    status: PokemonStatus.CAPTURED,
    uid: `pokemon_${Date.now()}_${Math.random()}`,
  };

  return { ...defaults, ...overrides } as PokemonOptionType;
};

/**
 * Common test Pokémon definitions
 */
export const testPokemon = {
  abra: (uid = "abra_trade_101"): PokemonOptionType => ({
    id: 63,
    name: "Abra",
    nationalDexId: 63,
    originalLocation: "trade",
    status: PokemonStatus.TRADED,
    uid,
  }),

  bulbasaur: (uid = "bulbasaur_starter_001"): PokemonOptionType => ({
    id: 1,
    name: "Bulbasaur",
    nationalDexId: 1,
    originalLocation: "starter",
    status: PokemonStatus.RECEIVED,
    uid,
  }),

  charmander: (uid = "charmander_route1_456"): PokemonOptionType => ({
    id: 4,
    name: "Charmander",
    nationalDexId: 4,
    nickname: "Flame",
    originalLocation: "route1",
    status: PokemonStatus.CAPTURED,
    uid,
  }),
  pikachu: (uid = "pikachu_route1_123"): PokemonOptionType => ({
    id: 25,
    name: "Pikachu",
    nationalDexId: 25,
    nickname: "Sparky",
    originalLocation: "route1",
    status: PokemonStatus.CAPTURED,
    uid,
  }),

  squirtle: (uid = "squirtle_route2_789"): PokemonOptionType => ({
    id: 7,
    name: "Squirtle",
    nationalDexId: 7,
    nickname: "Bubbles",
    originalLocation: "route2",
    status: PokemonStatus.CAPTURED,
    uid,
  }),
};

/**
 * Helper to add a delay for timestamp testing
 */
export const waitForTimestamp = (ms = 10) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Helper to verify team member structure
 */
export const expectTeamMember = (
  teamMember: unknown,
  expectedHeadUid: string | null,
  expectedBodyUid: string | null = null,
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
  expect(member.bodyPokemonUid).toBe(expectedBodyUid || "");
};

/**
 * Helper to verify encounter structure
 */
export const expectEncounter = (
  encounter: unknown,
  expectedHeadUid: string | null,
  expectedBodyUid: string | null = null,
  isFusion = false,
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
