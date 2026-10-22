/** @vitest-environment jsdom */

import { renderHook } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { useAllPlaythroughs } from "../hooks";
import { playthroughsStore } from "../store";

const { getAllPlaythroughsMock } = vi.hoisted(() => ({
  getAllPlaythroughsMock: vi.fn().mockResolvedValue([]),
}));

vi.mock("../store", async () => {
  const { proxy } = await import("valtio");
  return {
    getAllPlaythroughs: getAllPlaythroughsMock,
    playthroughsStore: proxy({
      activePlaythroughId: "run-1",
      isLoading: false,
      isSaving: false,
      playthroughs: [{ id: "run-1" }],
    }),
  };
});

describe("useAllPlaythroughs", () => {
  it("does not load when the store starts loading before its effect runs", () => {
    function LoadingBeforePassiveEffects({
      children,
    }: React.PropsWithChildren) {
      React.useLayoutEffect(() => {
        playthroughsStore.isLoading = true;
      }, []);

      return children;
    }

    renderHook(() => useAllPlaythroughs(), {
      wrapper: LoadingBeforePassiveEffects,
    });

    expect(getAllPlaythroughsMock).not.toHaveBeenCalled();
  });
});
