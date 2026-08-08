import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_EVENTS,
  type AnalyticsEventName,
  getAnalyticsDebugCounters,
  hasAnalyticsConsent,
  isAnalyticsProductionEnvironment,
  resetAnalyticsDebugCounters,
  trackEvent,
} from "../trackEvent";

type AnalyticsPrimitive = string | number | boolean;

const BASE_SHARED_PROPERTIES = {
  boxed_count_bucket: "c_0",
  deceased_count_bucket: "c_0",
  encounter_count_bucket: "e_1",
  fusion_count_bucket: "c_0",
  game_mode: "classic",
  playthrough_id: "pt-1",
  viable_roster_bucket: "v_6_plus",
} as const;

const VALID_EVENT_PAYLOADS: Record<
  AnalyticsEventName,
  Record<string, AnalyticsPrimitive>
> = {
  create_playthrough_modal_opened: {
    ...BASE_SHARED_PROPERTIES,
    source_surface: "header",
  },
  encounter_marked_deceased: {
    ...BASE_SHARED_PROPERTIES,
    location_id: "route-1",
    team_size_after: 5,
    viable_roster_bucket_after: "v_4_5",
    was_fused: true,
  },
  first_encounter_saved: {
    ...BASE_SHARED_PROPERTIES,
    location_id: "route-1",
  },
  fusion_created: {
    ...BASE_SHARED_PROPERTIES,
    creation_method: "create_fusion",
    location_id: "route-1",
  },
  fusion_flipped: {
    ...BASE_SHARED_PROPERTIES,
    location_id: "route-1",
  },
  game_mode_changed: {
    ...BASE_SHARED_PROPERTIES,
    new_game_mode: "randomized",
    previous_game_mode: "classic",
    source_surface: "game_mode_toggle",
    trigger_method: "click",
  },
  github_cta_viewed: {
    route: "home",
    source_surface: "fixed_top_bar",
  },
  landing_viewed: {
    ...BASE_SHARED_PROPERTIES,
    entry_route: "home",
  },
  playthrough_created: {
    ...BASE_SHARED_PROPERTIES,
    has_existing_playthroughs: false,
  },
  playthrough_exported: {
    ...BASE_SHARED_PROPERTIES,
  },
  playthrough_import_failed: {
    ...BASE_SHARED_PROPERTIES,
    error_category: "invalid_json",
    failure_stage: "json_parse",
    file_extension_group: "json",
    has_file: true,
    import_source: "file_picker",
    mime_group: "application_json",
  },
  playthrough_imported: {
    ...BASE_SHARED_PROPERTIES,
    file_extension_group: "json",
    import_source: "file_picker",
    mime_group: "application_json",
  },
  playthrough_resumed: {
    ...BASE_SHARED_PROPERTIES,
    days_since_last_active_bucket: "d_1_2_days",
  },
  playthrough_selector_opened: {
    ...BASE_SHARED_PROPERTIES,
    source_surface: "header",
  },
  playthrough_switched: {
    ...BASE_SHARED_PROPERTIES,
    new_playthrough_id: "pt-2",
    previous_playthrough_id: "pt-1",
    source_surface: "playthrough_selector",
    trigger_method: "click",
  },
  run_checkpoint_reached: {
    ...BASE_SHARED_PROPERTIES,
    checkpoint: 5,
    checkpoint_label: "cp_5",
  },
};

const eventPayloadEntries = Object.entries(VALID_EVENT_PAYLOADS) as [
  AnalyticsEventName,
  Record<string, AnalyticsPrimitive>,
][];

const sharedEventPayloadEntries = eventPayloadEntries.filter(
  ([eventName]) => eventName !== ANALYTICS_EVENTS.githubCtaViewed,
);

const analyticsMock = vi.hoisted(() => ({
  track: vi.fn(),
}));

vi.mock("@vercel/analytics", () => ({
  track: analyticsMock.track,
}));

const createLocalStorageMock = () => {
  const store = new Map<string, string>();

  const storage: Storage = {
    clear: () => {
      store.clear();
    },
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };

  return storage;
};

const setEnvironment = (nodeEnv: string, vercelEnv?: string) => {
  vi.stubEnv("NODE_ENV", nodeEnv);
  if (vercelEnv === null) {
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
      configurable: true,
      value: {},
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: createLocalStorageMock(),
    });
  });

  it("checks production environment with safe hostname fallback", () => {
    expect(
      isAnalyticsProductionEnvironment({
        NEXT_PUBLIC_VERCEL_ENV: "production",
        NODE_ENV: "production",
      }),
    ).toBe(true);

    expect(
      isAnalyticsProductionEnvironment({
        NEXT_PUBLIC_VERCEL_ENV: "production",
        NODE_ENV: "development",
      }),
    ).toBe(true);

    expect(
      isAnalyticsProductionEnvironment({
        NEXT_PUBLIC_VERCEL_ENV: "preview",
        NODE_ENV: "production",
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
      boxed_count_bucket: "c_0",
      deceased_count_bucket: "c_0",
      encounter_count_bucket: "e_1",
      fusion_count_bucket: "c_0",
      game_mode: "classic",
      playthrough_id: "pt-1",
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
      boxed_count_bucket: "c_0",
      deceased_count_bucket: "c_0",
      encounter_count_bucket: "e_1",
      fusion_count_bucket: "c_0",
      game_mode: "classic",
      playthrough_id: "pt-1",
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
      boxed_count_bucket: "c_0",
      deceased_count_bucket: "c_0",
      encounter_count_bucket: "e_1",
      fusion_count_bucket: "c_0",
      game_mode: "classic",
      playthrough_id: "pt-1",
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
      boxed_count_bucket: "c_0",
      checkpoint: 5,
      checkpoint_label: "cp_5",
      deceased_count_bucket: "c_1",
      encounter_count_bucket: "e_5_9",
      fusion_count_bucket: "c_0",
      game_mode: "classic",
      playthrough_id: "pt-1",
      viable_roster_bucket: "v_4_5",
    });

    expect(analyticsMock.track).toHaveBeenCalledTimes(1);
    expect(analyticsMock.track).toHaveBeenCalledWith(
      "run_checkpoint_reached",
      expect.objectContaining({ checkpoint: 5, checkpoint_label: "cp_5" }),
    );
    expect(getAnalyticsDebugCounters().sent).toBe(1);
  });

  it("tracks normalized import failure payloads", () => {
    localStorage.setItem(
      "cookie-preferences",
      JSON.stringify({ analytics: true }),
    );
    setEnvironment("production", "production");

    trackEvent(ANALYTICS_EVENTS.playthroughImportFailed, {
      boxed_count_bucket: "c_0",
      deceased_count_bucket: "c_0",
      encounter_count_bucket: "e_1",
      error_category: "invalid_json",
      failure_stage: "json_parse",
      file_extension_group: "json",
      fusion_count_bucket: "c_0",
      game_mode: "classic",
      has_file: true,
      import_source: "file_picker",
      mime_group: "application_json",
      playthrough_id: "pt-1",
      viable_roster_bucket: "v_6_plus",
    });

    expect(analyticsMock.track).toHaveBeenCalledWith(
      "playthrough_import_failed",
      expect.objectContaining({
        error_category: "invalid_json",
        failure_stage: "json_parse",
      }),
    );
  });

  it("rejects import failure payloads with raw error text fields", () => {
    localStorage.setItem(
      "cookie-preferences",
      JSON.stringify({ analytics: true }),
    );
    setEnvironment("production", "production");

    trackEvent(ANALYTICS_EVENTS.playthroughImportFailed, {
      boxed_count_bucket: "c_0",
      deceased_count_bucket: "c_0",
      encounter_count_bucket: "e_1",
      error_category: "unexpected",
      failure_stage: "store_import",
      file_extension_group: "json",
      fusion_count_bucket: "c_0",
      game_mode: "classic",
      has_file: true,
      import_source: "file_picker",
      mime_group: "application_json",
      playthrough_id: "pt-1",
      raw_error_message: "schema exploded",
      viable_roster_bucket: "v_6_plus",
    } as never);

    expect(analyticsMock.track).not.toHaveBeenCalled();
    expect(getAnalyticsDebugCounters().blockReasons.invalid_payload).toBe(1);
  });

  it.each(eventPayloadEntries)(
    "accepts contract-valid payload for %s",
    (eventName, payload) => {
      localStorage.setItem(
        "cookie-preferences",
        JSON.stringify({ analytics: true }),
      );
      setEnvironment("production", "production");

      trackEvent(eventName, payload as never);

      expect(analyticsMock.track).toHaveBeenCalledTimes(1);
      expect(analyticsMock.track).toHaveBeenCalledWith(eventName, payload);
      expect(getAnalyticsDebugCounters().sent).toBe(1);
    },
  );

  it.each(sharedEventPayloadEntries)(
    "rejects payload when shared contract field is missing for %s",
    (eventName, payload) => {
      localStorage.setItem(
        "cookie-preferences",
        JSON.stringify({ analytics: true }),
      );
      setEnvironment("production", "production");

      const { playthrough_id: _playthroughId, ...invalidPayload } = payload;

      trackEvent(eventName, invalidPayload as never);

      const counters = getAnalyticsDebugCounters();
      expect(analyticsMock.track).not.toHaveBeenCalled();
      expect(counters.blockReasons.invalid_payload).toBe(1);
      expect(counters.byEvent[eventName].blocked).toBe(1);
    },
  );

  it.each([
    [
      ANALYTICS_EVENTS.encounterMarkedDeceased,
      { viable_roster_bucket_after: "invalid" },
    ],
    [
      ANALYTICS_EVENTS.playthroughSwitched,
      { new_playthrough_id: "pt-2", previous_playthrough_id: "" },
    ],
    [
      ANALYTICS_EVENTS.gameModeChanged,
      { new_game_mode: "classic", previous_game_mode: "invalid" },
    ],
  ] as const)(
    "rejects invalid event-specific values for %s",
    (eventName, invalidProperties) => {
      localStorage.setItem(
        "cookie-preferences",
        JSON.stringify({ analytics: true }),
      );
      setEnvironment("production", "production");

      trackEvent(eventName, {
        ...VALID_EVENT_PAYLOADS[eventName],
        ...invalidProperties,
      } as never);

      expect(analyticsMock.track).not.toHaveBeenCalled();
      expect(getAnalyticsDebugCounters().blockReasons.invalid_payload).toBe(1);
    },
  );

  it("rejects a GitHub CTA view payload with an unsupported route", () => {
    localStorage.setItem(
      "cookie-preferences",
      JSON.stringify({ analytics: true }),
    );
    setEnvironment("production", "production");

    trackEvent(ANALYTICS_EVENTS.githubCtaViewed, {
      route: "licenses",
      source_surface: "fixed_top_bar",
    } as never);

    expect(analyticsMock.track).not.toHaveBeenCalled();
    expect(getAnalyticsDebugCounters().blockReasons.invalid_payload).toBe(1);
  });

  it("blocks invalid payload shapes without logging payload values", () => {
    localStorage.setItem(
      "cookie-preferences",
      JSON.stringify({ analytics: true }),
    );
    setEnvironment("production", "production");
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_DEBUG", "true");
    const debugSpy = vi
      .spyOn(console, "debug")
      .mockImplementation(() => undefined);

    trackEvent(ANALYTICS_EVENTS.playthroughExported, {
      boxed_count_bucket: "c_0",
      deceased_count_bucket: "c_0",
      encounter_count_bucket: "e_1",
      fusion_count_bucket: "c_0",
      game_mode: "classic",
      player_email: "secret@example.com",
      playthrough_id: "pt-1",
      viable_roster_bucket: "v_6_plus",
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
      boxed_count_bucket: "c_0",
      deceased_count_bucket: "c_0",
      encounter_count_bucket: "e_1",
      fusion_count_bucket: "c_0",
      game_mode: "classic",
      playthrough_id: "pt-1",
      unexpected: "value",
      viable_roster_bucket: "v_6_plus",
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
      boxed_count_bucket: "c_0",
      deceased_count_bucket: "c_0",
      encounter_count_bucket: "e_1",
      fusion_count_bucket: "c_0",
      game_mode: "classic",
      playthrough_id: "pt-1",
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
        boxed_count_bucket: "c_0",
        deceased_count_bucket: "c_0",
        encounter_count_bucket: "e_1",
        fusion_count_bucket: "c_0",
        game_mode: "classic",
        playthrough_id: "pt-1",
        viable_roster_bucket: "v_6_plus",
      });
    }).not.toThrow();

    expect(getAnalyticsDebugCounters().blockReasons.track_error).toBe(1);
  });
});
