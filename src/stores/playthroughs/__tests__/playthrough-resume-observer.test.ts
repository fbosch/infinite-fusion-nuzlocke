import { render, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlaythroughResumeObserver } from "../PlaythroughResumeObserver";
import { playthroughsStore } from "../store";
import { createTestPlaythrough, resetPlaythroughsStore } from "./test-utils";

const analyticsMocks = vi.hoisted(() => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/analytics/trackEvent", () => ({
  trackEvent: analyticsMocks.trackEvent,
}));

const createStorageMock = (): Storage => {
  const storage = new Map<string, string>();

  return {
    get length() {
      return storage.size;
    },
    clear() {
      storage.clear();
    },
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(storage.keys())[index] ?? null;
    },
    removeItem(key: string) {
      storage.delete(key);
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
  };
};

describe("PlaythroughResumeObserver", () => {
  resetPlaythroughsStore();

  beforeEach(() => {
    analyticsMocks.trackEvent.mockReset();
    Object.defineProperty(globalThis, "sessionStorage", {
      value: createStorageMock(),
      configurable: true,
      writable: true,
    });
    sessionStorage.clear();
  });

  it("does not emit while store is loading", async () => {
    const { activePlaythrough } = createTestPlaythrough();
    activePlaythrough.updatedAt = Date.now() - 2 * 86_400_000;
    playthroughsStore.isLoading = true;
    analyticsMocks.trackEvent.mockReset();

    render(createElement(PlaythroughResumeObserver));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      analyticsMocks.trackEvent.mock.calls.filter(
        (call) => call[0] === "playthrough_resumed",
      ),
    ).toHaveLength(0);
  });

  it("emits once for an active playthrough in a session", async () => {
    const { activePlaythrough } = createTestPlaythrough();
    activePlaythrough.updatedAt = Date.now() - 8 * 86_400_000;
    playthroughsStore.isLoading = false;
    analyticsMocks.trackEvent.mockReset();

    const view = render(createElement(PlaythroughResumeObserver));

    await waitFor(() => {
      expect(analyticsMocks.trackEvent).toHaveBeenCalledWith(
        "playthrough_resumed",
        expect.objectContaining({
          playthrough_id: activePlaythrough.id,
          days_since_last_active_bucket: "d_7_13_days",
        }),
      );
    });

    view.rerender(createElement(PlaythroughResumeObserver));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(
      analyticsMocks.trackEvent.mock.calls.filter(
        (call) => call[0] === "playthrough_resumed",
      ),
    ).toHaveLength(1);
  });

  it("emits for a different playthrough in same session", async () => {
    const first = createTestPlaythrough("First");
    first.activePlaythrough.updatedAt = Date.now() - 86_400_000;
    playthroughsStore.isLoading = false;
    analyticsMocks.trackEvent.mockReset();

    const view = render(createElement(PlaythroughResumeObserver));

    await waitFor(() => {
      expect(
        analyticsMocks.trackEvent.mock.calls.filter(
          (call) => call[0] === "playthrough_resumed",
        ),
      ).toHaveLength(1);
    });

    const second = createTestPlaythrough("Second");
    second.activePlaythrough.updatedAt = Date.now() - 15 * 86_400_000;
    playthroughsStore.activePlaythroughId = second.playthroughId;

    view.rerender(createElement(PlaythroughResumeObserver));

    await waitFor(() => {
      expect(
        analyticsMocks.trackEvent.mock.calls.filter(
          (call) => call[0] === "playthrough_resumed",
        ),
      ).toHaveLength(2);
    });
  });
});
