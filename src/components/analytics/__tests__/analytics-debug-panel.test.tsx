/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsDebugCounters } from "@/lib/analytics/track-event";
import { AnalyticsDebugPanel } from "../analytics-debug-panel";

let counters: AnalyticsDebugCounters;

vi.mock("@/lib/analytics/track-event", () => ({
  getAnalyticsDebugCounters: () => counters,
  resetAnalyticsDebugCounters: vi.fn(),
}));

function createCounters(
  blockReasons: Partial<AnalyticsDebugCounters["blockReasons"]> = {},
): AnalyticsDebugCounters {
  return {
    blocked: 0,
    blockReasons: {
      invalid_payload: 0,
      kill_switch: 0,
      no_consent: 0,
      non_browser: 0,
      non_production: 0,
      track_error: 0,
      ...blockReasons,
    },
    byEvent: {} as AnalyticsDebugCounters["byEvent"],
    sent: 0,
  };
}

describe("AnalyticsDebugPanel", () => {
  beforeEach(() => {
    counters = createCounters();
    localStorage.clear();
    window.history.replaceState({}, "", "/?analytics_debug=1");
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
  });

  it("identifies consent as the sole delivery blocker", () => {
    counters = createCounters({ no_consent: 1 });

    render(<AnalyticsDebugPanel />);

    expect(
      screen.getByText(
        "Events are currently blocked only by consent; with analytics consent enabled, matching events should send.",
      ),
    ).toBeTruthy();
  });

  it("does not attribute delivery failures solely to consent with another blocker", () => {
    counters = createCounters({ no_consent: 1, track_error: 1 });

    render(<AnalyticsDebugPanel />);

    expect(
      screen.getByText(
        "If blockers other than no_consent are non-zero, consent alone will not guarantee event delivery.",
      ),
    ).toBeTruthy();
  });
});
