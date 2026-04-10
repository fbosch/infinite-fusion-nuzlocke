import { describe, expect, it } from "vitest";
import { type PokemonOptionType, PokemonStatus } from "@/loaders/pokemon";
import type { Playthrough } from "@/stores/playthroughs";
import {
  toCountBucket,
  toDormancyBucket,
  toEncounterCountBucket,
  toViableRosterBucket,
} from "../buckets";
import {
  getCheckpointLabel,
  getDaysSinceLastActive,
  getNewlyReachedCheckpoints,
  markCheckpointEventsTracked,
  markPlaythroughResumedTracked,
  shouldTrackPlaythroughResumed,
} from "../playthroughEventData";
import {
  getEncounterCount,
  getFusionCount,
  getSharedEventProperties,
  getTeamSizeAfter,
  getViableRosterSize,
} from "../selectors";

const createStorage = (): Storage => {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
};

const makePokemon = (
  uid: string,
  status: PokemonOptionType["status"],
): PokemonOptionType => ({
  id: 25,
  name: "Pikachu",
  nationalDexId: 25,
  uid,
  status,
  originalLocation: "route-1",
});

const makePlaythrough = (): Playthrough => ({
  id: "playthrough-1",
  name: "Test",
  gameMode: "classic",
  team: {
    members: [
      { headPokemonUid: "alive-a", bodyPokemonUid: "" },
      { headPokemonUid: "alive-b", bodyPokemonUid: "" },
      { headPokemonUid: "stored-a", bodyPokemonUid: "" },
      { headPokemonUid: "deceased-a", bodyPokemonUid: "" },
      null,
      null,
    ],
  },
  encounters: {
    "route-1": {
      head: makePokemon("alive-a", PokemonStatus.CAPTURED),
      body: null,
      isFusion: false,
      updatedAt: Date.now(),
    },
    "route-2": {
      head: makePokemon("alive-b", PokemonStatus.RECEIVED),
      body: makePokemon("deceased-a", PokemonStatus.DECEASED),
      isFusion: true,
      updatedAt: Date.now(),
    },
    "route-3": {
      head: makePokemon("stored-a", PokemonStatus.STORED),
      body: makePokemon("deceased-b", PokemonStatus.DECEASED),
      isFusion: false,
      updatedAt: Date.now(),
    },
    "route-4": {
      head: null,
      body: null,
      isFusion: false,
      updatedAt: Date.now(),
    },
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  version: "1.0.0",
});

describe("playthroughEventData", () => {
  it("derives shared counters from playthrough state", () => {
    const playthrough = makePlaythrough();

    expect(getEncounterCount(playthrough)).toBe(3);
    expect(getFusionCount(playthrough)).toBe(1);
    expect(getViableRosterSize(playthrough)).toBe(2);

    expect(getSharedEventProperties(playthrough)).toEqual({
      playthrough_id: "playthrough-1",
      game_mode: "classic",
      encounter_count_bucket: "e_2_4",
      deceased_count_bucket: "c_2_3",
      boxed_count_bucket: "c_1",
      fusion_count_bucket: "c_1",
      viable_roster_bucket: "v_2_3",
    });
  });

  it("maps bucket boundaries correctly", () => {
    expect(toEncounterCountBucket(0)).toBe("e_0");
    expect(toEncounterCountBucket(1)).toBe("e_1");
    expect(toEncounterCountBucket(4)).toBe("e_2_4");
    expect(toEncounterCountBucket(5)).toBe("e_5_9");
    expect(toEncounterCountBucket(80)).toBe("e_80_plus");

    expect(toCountBucket(0)).toBe("c_0");
    expect(toCountBucket(1)).toBe("c_1");
    expect(toCountBucket(3)).toBe("c_2_3");
    expect(toCountBucket(8)).toBe("c_8_15");
    expect(toCountBucket(16)).toBe("c_16_plus");

    expect(toViableRosterBucket(0)).toBe("v_0");
    expect(toViableRosterBucket(1)).toBe("v_1");
    expect(toViableRosterBucket(2)).toBe("v_2_3");
    expect(toViableRosterBucket(4)).toBe("v_4_5");
    expect(toViableRosterBucket(6)).toBe("v_6_plus");

    expect(toDormancyBucket(0)).toBe("d_same_day");
    expect(toDormancyBucket(2)).toBe("d_1_2_days");
    expect(toDormancyBucket(6)).toBe("d_3_6_days");
    expect(toDormancyBucket(13)).toBe("d_7_13_days");
    expect(toDormancyBucket(29)).toBe("d_14_29_days");
    expect(toDormancyBucket(30)).toBe("d_30_plus_days");
  });

  it("returns labels for checkpoints", () => {
    expect(getCheckpointLabel(1)).toBe("cp_1");
    expect(getCheckpointLabel(5)).toBe("cp_5");
    expect(getCheckpointLabel(10)).toBe("cp_10");
    expect(getCheckpointLabel(20)).toBe("cp_20");
    expect(getCheckpointLabel(40)).toBe("cp_40");
    expect(getCheckpointLabel(80)).toBe("cp_80");
  });

  it("dedupes checkpoint events per playthrough", () => {
    const storage = createStorage();

    expect(getNewlyReachedCheckpoints("playthrough-1", 0, 6, storage)).toEqual([
      1, 5,
    ]);
    markCheckpointEventsTracked("playthrough-1", [1, 5], storage);

    expect(getNewlyReachedCheckpoints("playthrough-1", 4, 10, storage)).toEqual(
      [10],
    );
    markCheckpointEventsTracked("playthrough-1", [10], storage);

    expect(getNewlyReachedCheckpoints("playthrough-1", 9, 10, storage)).toEqual(
      [],
    );
  });

  it("dedupes playthrough resume once per session", () => {
    const storage = createStorage();

    expect(shouldTrackPlaythroughResumed("playthrough-1", storage)).toBe(true);
    markPlaythroughResumedTracked("playthrough-1", storage);
    expect(shouldTrackPlaythroughResumed("playthrough-1", storage)).toBe(false);
    expect(shouldTrackPlaythroughResumed("playthrough-2", storage)).toBe(true);
  });

  it("computes days since active and team size", () => {
    const now = 86400000 * 10;

    expect(getDaysSinceLastActive(now, now)).toBe(0);
    expect(getDaysSinceLastActive(now - 86400000 * 2 - 50, now)).toBe(2);

    const playthrough = makePlaythrough();
    expect(getTeamSizeAfter(playthrough)).toBe(4);
  });
});
