import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSharedAnalyticsContext,
  canTrackCustomEvents,
  getCheckpointLabel,
  getDormancyBucket,
  trackCustomEvent,
} from "@/lib/analytics";
import { PokemonStatus } from "@/loaders/pokemon";
import type { Playthrough } from "@/stores/playthroughs/types";

const trackMock = vi.hoisted(() => vi.fn());

vi.mock("@vercel/analytics", () => ({
  track: trackMock,
}));

const createStorage = (preferences: unknown) => {
  return {
    getItem: vi.fn((key: string) => {
      if (key !== "cookie-preferences") {
        return null;
      }

      return JSON.stringify(preferences);
    }),
  };
};

const createPlaythrough = (partial: Partial<Playthrough> = {}): Playthrough => {
  const now = Date.now();

  return {
    id: partial.id ?? "pt-1",
    name: partial.name ?? "Run 1",
    gameMode: partial.gameMode ?? "classic",
    team: partial.team ?? { members: [null, null, null, null, null, null] },
    encounters: partial.encounters ?? {},
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    version: partial.version ?? "1.0.0",
    customLocations: partial.customLocations,
  };
};

describe("canTrackCustomEvents", () => {
  it("returns true only in production with consent", () => {
    const storage = createStorage({ analytics: true, speedInsights: true });

    expect(
      canTrackCustomEvents({
        env: {
          NODE_ENV: "production",
          NEXT_PUBLIC_VERCEL_ENV: "production",
        },
        storage,
      }),
    ).toBe(true);
  });

  it("returns false when consent is missing or invalid", () => {
    expect(
      canTrackCustomEvents({
        env: {
          NODE_ENV: "production",
          NEXT_PUBLIC_VERCEL_ENV: "production",
        },
        storage: createStorage({ analytics: false }),
      }),
    ).toBe(false);

    expect(
      canTrackCustomEvents({
        env: {
          NODE_ENV: "production",
          NEXT_PUBLIC_VERCEL_ENV: "production",
        },
        storage: {
          getItem: () => "bad-json",
        },
      }),
    ).toBe(false);

    expect(
      canTrackCustomEvents({
        env: {
          NODE_ENV: "production",
          NEXT_PUBLIC_VERCEL_ENV: "production",
        },
        storage: {
          getItem: () => {
            throw new Error("blocked");
          },
        },
      }),
    ).toBe(false);
  });

  it("returns false outside production", () => {
    const storage = createStorage({ analytics: true, speedInsights: true });

    expect(
      canTrackCustomEvents({
        env: {
          NODE_ENV: "development",
          NEXT_PUBLIC_VERCEL_ENV: "production",
        },
        storage,
      }),
    ).toBe(false);

    expect(
      canTrackCustomEvents({
        env: {
          NODE_ENV: "production",
          NEXT_PUBLIC_VERCEL_ENV: "preview",
        },
        storage,
      }),
    ).toBe(false);
  });
});

describe("trackCustomEvent", () => {
  beforeEach(() => {
    trackMock.mockReset();
  });

  it("emits a valid event when runtime gating passes", () => {
    const storage = createStorage({ analytics: true, speedInsights: true });
    const emitted = trackCustomEvent(
      "playthrough_exported",
      {
        playthrough_id: "pt-1",
        game_mode: "classic",
        encounter_count_bucket: "e_1",
        deceased_count_bucket: "c_0",
        boxed_count_bucket: "c_0",
        fusion_count_bucket: "c_0",
        viable_roster_bucket: "v_1",
      },
      {
        env: {
          NODE_ENV: "production",
          NEXT_PUBLIC_VERCEL_ENV: "production",
        },
        storage,
      },
    );

    expect(emitted).toBe(true);
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith("playthrough_exported", {
      playthrough_id: "pt-1",
      game_mode: "classic",
      encounter_count_bucket: "e_1",
      deceased_count_bucket: "c_0",
      boxed_count_bucket: "c_0",
      fusion_count_bucket: "c_0",
      viable_roster_bucket: "v_1",
    });
  });

  it("does not emit when payload validation fails", () => {
    const storage = createStorage({ analytics: true, speedInsights: true });
    const emitted = trackCustomEvent(
      "playthrough_exported",
      {
        playthrough_id: "pt-1",
        game_mode: "classic",
        encounter_count_bucket: "e_1",
        deceased_count_bucket: "c_0",
        boxed_count_bucket: "c_0",
        fusion_count_bucket: "c_0",
      } as never,
      {
        env: {
          NODE_ENV: "production",
          NEXT_PUBLIC_VERCEL_ENV: "production",
        },
        storage,
      },
    );

    expect(emitted).toBe(false);
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("does not emit when runtime gating fails", () => {
    const storage = createStorage({ analytics: true, speedInsights: true });
    const emitted = trackCustomEvent(
      "playthrough_exported",
      {
        playthrough_id: "pt-1",
        game_mode: "classic",
        encounter_count_bucket: "e_1",
        deceased_count_bucket: "c_0",
        boxed_count_bucket: "c_0",
        fusion_count_bucket: "c_0",
        viable_roster_bucket: "v_1",
      },
      {
        env: {
          NODE_ENV: "development",
          NEXT_PUBLIC_VERCEL_ENV: "preview",
        },
        storage,
      },
    );

    expect(emitted).toBe(false);
    expect(trackMock).not.toHaveBeenCalled();
  });
});

describe("analytics context helpers", () => {
  it("defaults all buckets to zero when encounters are empty", () => {
    const playthrough = createPlaythrough({
      id: "pt-empty",
      encounters: {},
    });

    expect(buildSharedAnalyticsContext(playthrough)).toEqual({
      playthrough_id: "pt-empty",
      game_mode: "classic",
      encounter_count_bucket: "e_0",
      deceased_count_bucket: "c_0",
      boxed_count_bucket: "c_0",
      fusion_count_bucket: "c_0",
      viable_roster_bucket: "v_0",
    });
  });

  it("excludes pokemon without status from viable roster", () => {
    const playthrough = createPlaythrough({
      id: "pt-statusless",
      encounters: {
        route_10: {
          head: { id: 10, name: "Caterpie", nationalDexId: 10, uid: "h" },
          body: null,
          isFusion: false,
          updatedAt: 1,
        },
      },
    });

    expect(buildSharedAnalyticsContext(playthrough).viable_roster_bucket).toBe(
      "v_0",
    );
  });

  it("builds shared context using documented bucket rules", () => {
    const playthrough = createPlaythrough({
      id: "pt-2",
      gameMode: "randomized",
      encounters: {
        route_1: {
          head: { id: 1, name: "Bulbasaur", nationalDexId: 1, uid: "a" },
          body: null,
          isFusion: false,
          updatedAt: 1,
        },
        route_2: {
          head: {
            id: 2,
            name: "Ivysaur",
            nationalDexId: 2,
            uid: "b",
            status: PokemonStatus.DECEASED,
          },
          body: {
            id: 3,
            name: "Venusaur",
            nationalDexId: 3,
            uid: "c",
            status: PokemonStatus.STORED,
          },
          isFusion: true,
          updatedAt: 2,
        },
      },
    });

    expect(buildSharedAnalyticsContext(playthrough)).toEqual({
      playthrough_id: "pt-2",
      game_mode: "randomized",
      encounter_count_bucket: "e_2_4",
      deceased_count_bucket: "c_1",
      boxed_count_bucket: "c_1",
      fusion_count_bucket: "c_1",
      viable_roster_bucket: "v_0",
    });
  });

  it("maps checkpoint and dormancy buckets correctly", () => {
    expect(getCheckpointLabel(20)).toBe("cp_20");

    const day = 24 * 60 * 60 * 1000;
    const now = 50 * day;

    expect(getDormancyBucket(now, now)).toBe("d_same_day");
    expect(getDormancyBucket(now - 2 * day, now)).toBe("d_1_2_days");
    expect(getDormancyBucket(now - 6 * day, now)).toBe("d_3_6_days");
    expect(getDormancyBucket(now - 13 * day, now)).toBe("d_7_13_days");
    expect(getDormancyBucket(now - 29 * day, now)).toBe("d_14_29_days");
    expect(getDormancyBucket(now - 45 * day, now)).toBe("d_30_plus_days");
  });
});
