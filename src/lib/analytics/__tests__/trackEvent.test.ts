import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_EVENTS,
  getAnalyticsDebugCounters,
  hasAnalyticsConsent,
  isAnalyticsProductionEnvironment,
  resetAnalyticsDebugCounters,
  trackEvent,
} from "../trackEvent";

const analyticsMock = vi.hoisted(() => ({
  track: vi.fn(),
}));

vi.mock("@vercel/analytics", () => ({
  track: analyticsMock.track,
}));

const createLocalStorageMock = () => {
  const store = new Map<string, string>();

  const storage: Storage = {
    get length() {
      return store.size;
    },
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  };

  return storage;
};

const setEnvironment = (nodeEnv: string, vercelEnv?: string) => {
  vi.stubEnv("NODE_ENV", nodeEnv);
  if (vercelEnv == null) {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", nodeEnv);
    return;
  }

  vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", vercelEnv);
};

describe("analytics transport wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    resetAnalyticsDebugCounters();
    Object.defineProperty(globalThis, "window", {
      value: {},
      configurable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: createLocalStorageMock(),
      configurable: true,
    });
  });

  it("checks production environment with safe hostname fallback", () => {
    expect(
      isAnalyticsProductionEnvironment({
        NODE_ENV: "production",
        NEXT_PUBLIC_VERCEL_ENV: "production",
      }),
    ).toBe(true);

    expect(
      isAnalyticsProductionEnvironment({
        NODE_ENV: "development",
        NEXT_PUBLIC_VERCEL_ENV: "production",
      }),
    ).toBe(false);

    expect(
      isAnalyticsProductionEnvironment({
        NODE_ENV: "production",
        NEXT_PUBLIC_VERCEL_ENV: "preview",
      }),
    ).toBe(false);

    expect(
      isAnalyticsProductionEnvironment({
        NODE_ENV: "production",
      }),
    ).toBe(false);

    expect(
      isAnalyticsProductionEnvironment(
        {
          NODE_ENV: "production",
        },
        "fusion.nuzlocke.io",
      ),
    ).toBe(true);

    expect(
      isAnalyticsProductionEnvironment(
        {
          NODE_ENV: "production",
        },
        "preview-deploy.vercel.app",
      ),
    ).toBe(false);
  });

  it("returns false without analytics consent", () => {
    localStorage.setItem(
      "cookie-preferences",
      JSON.stringify({ analytics: false, speedInsights: true }),
    );

    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("returns true with analytics consent", () => {
    localStorage.setItem(
      "cookie-preferences",
      JSON.stringify({ analytics: true, speedInsights: false }),
    );

    expect(hasAnalyticsConsent()).toBe(true);
  });

  it("returns false when storage is unavailable", () => {
    expect(hasAnalyticsConsent(null)).toBe(false);
  });

  it("returns false when storage reads throw", () => {
    const storage = {
      getItem: () => {
        throw new Error("SecurityError");
      },
    };

    expect(hasAnalyticsConsent(storage)).toBe(false);
  });

  it("is a no-op outside production gating", () => {
    localStorage.setItem(
      "cookie-preferences",
      JSON.stringify({ analytics: true }),
    );
    setEnvironment("development", "development");

    trackEvent(ANALYTICS_EVENTS.playthroughExported, {
      playthrough_id: "pt-1",
      game_mode: "classic",
      encounter_count_bucket: "e_1",
      deceased_count_bucket: "c_0",
      boxed_count_bucket: "c_0",
      fusion_count_bucket: "c_0",
      viable_roster_bucket: "v_6_plus",
    });

    expect(analyticsMock.track).not.toHaveBeenCalled();
    expect(getAnalyticsDebugCounters().blockReasons.non_production).toBe(1);
  });

  it("is a no-op without consent", () => {
    localStorage.setItem(
      "cookie-preferences",
      JSON.stringify({ analytics: false }),
    );
    setEnvironment("production", "production");

    trackEvent(ANALYTICS_EVENTS.playthroughExported, {
      playthrough_id: "pt-1",
      game_mode: "classic",
      encounter_count_bucket: "e_1",
      deceased_count_bucket: "c_0",
      boxed_count_bucket: "c_0",
      fusion_count_bucket: "c_0",
      viable_roster_bucket: "v_6_plus",
    });

    expect(analyticsMock.track).not.toHaveBeenCalled();
    expect(getAnalyticsDebugCounters().blockReasons.no_consent).toBe(1);
  });

  it("is a no-op when custom-event kill switch is enabled", () => {
    localStorage.setItem(
      "cookie-preferences",
      JSON.stringify({ analytics: true }),
    );
    setEnvironment("production", "production");
    vi.stubEnv("NEXT_PUBLIC_DISABLE_CUSTOM_ANALYTICS", "true");

    trackEvent(ANALYTICS_EVENTS.playthroughExported, {
      playthrough_id: "pt-1",
      game_mode: "classic",
      encounter_count_bucket: "e_1",
      deceased_count_bucket: "c_0",
      boxed_count_bucket: "c_0",
      fusion_count_bucket: "c_0",
      viable_roster_bucket: "v_6_plus",
    });

    expect(analyticsMock.track).not.toHaveBeenCalled();
    expect(getAnalyticsDebugCounters().blockReasons.kill_switch).toBe(1);
  });

  it("tracks event only when production and consent gates pass", () => {
    localStorage.setItem(
      "cookie-preferences",
      JSON.stringify({ analytics: true }),
    );
    setEnvironment("production", "production");

    trackEvent(ANALYTICS_EVENTS.runCheckpointReached, {
      playthrough_id: "pt-1",
      game_mode: "classic",
      encounter_count_bucket: "e_5_9",
      deceased_count_bucket: "c_1",
      boxed_count_bucket: "c_0",
      fusion_count_bucket: "c_0",
      viable_roster_bucket: "v_4_5",
      checkpoint: 5,
      checkpoint_label: "cp_5",
    });

    expect(analyticsMock.track).toHaveBeenCalledTimes(1);
    expect(analyticsMock.track).toHaveBeenCalledWith(
      "run_checkpoint_reached",
      expect.objectContaining({ checkpoint: 5, checkpoint_label: "cp_5" }),
    );
    expect(getAnalyticsDebugCounters().sent).toBe(1);
  });

  it("blocks invalid payload shapes without logging payload values", () => {
    localStorage.setItem(
      "cookie-preferences",
      JSON.stringify({ analytics: true }),
    );
    setEnvironment("production", "production");
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_DEBUG", "true");
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    trackEvent(ANALYTICS_EVENTS.playthroughExported, {
      playthrough_id: "pt-1",
      game_mode: "classic",
      encounter_count_bucket: "e_1",
      deceased_count_bucket: "c_0",
      boxed_count_bucket: "c_0",
      fusion_count_bucket: "c_0",
      viable_roster_bucket: "v_6_plus",
      player_email: "secret@example.com",
    } as never);

    expect(analyticsMock.track).not.toHaveBeenCalled();
    expect(getAnalyticsDebugCounters().blockReasons.invalid_payload).toBe(1);
    expect(debugSpy).toHaveBeenCalledWith(
      "Analytics payload blocked by schema",
      expect.not.objectContaining({
        player_email: "secret@example.com",
      }),
    );
    debugSpy.mockRestore();
  });

  it("counts invalid payloads before runtime gates", () => {
    setEnvironment("development", "preview");

    trackEvent(ANALYTICS_EVENTS.playthroughExported, {
      playthrough_id: "pt-1",
      game_mode: "classic",
      encounter_count_bucket: "e_1",
      deceased_count_bucket: "c_0",
      boxed_count_bucket: "c_0",
      fusion_count_bucket: "c_0",
      viable_roster_bucket: "v_6_plus",
      unexpected: "value",
    } as never);

    const counters = getAnalyticsDebugCounters();
    expect(counters.blockReasons.invalid_payload).toBe(1);
    expect(counters.blockReasons.non_production).toBe(0);
    expect(analyticsMock.track).not.toHaveBeenCalled();
  });

  it("returns deep-cloned debug counters", () => {
    localStorage.setItem(
      "cookie-preferences",
      JSON.stringify({ analytics: true }),
    );
    setEnvironment("production", "production");

    trackEvent(ANALYTICS_EVENTS.playthroughExported, {
      playthrough_id: "pt-1",
      game_mode: "classic",
      encounter_count_bucket: "e_1",
      deceased_count_bucket: "c_0",
      boxed_count_bucket: "c_0",
      fusion_count_bucket: "c_0",
      viable_roster_bucket: "v_6_plus",
    });

    const snapshot = getAnalyticsDebugCounters();
    snapshot.byEvent.playthrough_exported.sent = 999;
    snapshot.blockReasons.track_error = 999;

    const freshSnapshot = getAnalyticsDebugCounters();
    expect(freshSnapshot.byEvent.playthrough_exported.sent).toBe(1);
    expect(freshSnapshot.blockReasons.track_error).toBe(0);
  });

  it("swallows analytics transport errors", () => {
    localStorage.setItem(
      "cookie-preferences",
      JSON.stringify({ analytics: true }),
    );
    setEnvironment("production", "production");
    analyticsMock.track.mockImplementationOnce(() => {
      throw new Error("network");
    });

    expect(() => {
      trackEvent(ANALYTICS_EVENTS.playthroughExported, {
        playthrough_id: "pt-1",
        game_mode: "classic",
        encounter_count_bucket: "e_1",
        deceased_count_bucket: "c_0",
        boxed_count_bucket: "c_0",
        fusion_count_bucket: "c_0",
        viable_roster_bucket: "v_6_plus",
      });
    }).not.toThrow();

    expect(getAnalyticsDebugCounters().blockReasons.track_error).toBe(1);
  });
});
