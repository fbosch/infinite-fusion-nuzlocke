import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePlaythroughImportExport } from "@/hooks/usePlaythroughImportExport";
import type { Playthrough } from "@/stores/playthroughs/types";

const analyticsMocks = vi.hoisted(() => ({
  getSharedEventProperties: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/stores/playthroughs", () => ({
  playthroughActions: {
    importPlaythrough: vi.fn(),
  },
}));

vi.mock("@/lib/analytics/selectors", () => ({
  getSharedEventProperties: analyticsMocks.getSharedEventProperties,
}));

vi.mock("@/lib/analytics/trackEvent", () => ({
  trackEvent: analyticsMocks.trackEvent,
}));

const sharedProperties = {
  playthrough_id: "playthrough-1",
  game_mode: "classic",
  encounter_count_bucket: "e_1",
  deceased_count_bucket: "c_0",
  boxed_count_bucket: "c_0",
  fusion_count_bucket: "c_0",
  viable_roster_bucket: "v_1",
} as const;

const createPlaythrough = (): Playthrough => ({
  id: "playthrough-1",
  name: "Test Run",
  gameMode: "classic",
  encounters: {},
  team: { members: [null, null, null, null, null, null] },
  createdAt: 1,
  updatedAt: 1,
  version: "1.0.0",
});

describe("usePlaythroughImportExport lifecycle analytics", () => {
  beforeEach(() => {
    analyticsMocks.trackEvent.mockReset();
    analyticsMocks.getSharedEventProperties.mockReset();
    analyticsMocks.getSharedEventProperties.mockReturnValue(sharedProperties);
  });

  it("tracks playthrough_exported after successful export", () => {
    const playthrough = createPlaythrough();
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const createObjectUrlSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:test");
    const revokeObjectUrlSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});

    const { result } = renderHook(() => usePlaythroughImportExport());

    act(() => {
      result.current.handleExportClick(playthrough, {
        preventDefault,
        stopPropagation,
      } as unknown as React.MouseEvent);
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(analyticsMocks.trackEvent).toHaveBeenCalledWith(
      "playthrough_exported",
      sharedProperties,
    );

    clickSpy.mockRestore();
    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
  });

  it("does not track playthrough_exported when export fails", () => {
    const playthrough = createPlaythrough();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const createObjectUrlSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockImplementation(() => {
        throw new Error("blob failure");
      });

    const { result } = renderHook(() => usePlaythroughImportExport());

    act(() => {
      result.current.handleExportClick(playthrough, {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent);
    });

    expect(analyticsMocks.trackEvent).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
    createObjectUrlSpy.mockRestore();
  });
});
