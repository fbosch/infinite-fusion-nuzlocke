/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dragActions } from "@/stores/dragStore";
import { useComboboxDragAndDrop } from "../useComboboxDragAndDrop";

const { getPokemonMock, getPokemonNameMapMock } = vi.hoisted(() => ({
  getPokemonMock: vi.fn(),
  getPokemonNameMapMock: vi.fn(),
}));

vi.mock("@/loaders", () => ({
  getPokemon: getPokemonMock,
  getPokemonNameMap: getPokemonNameMapMock,
}));

vi.mock("@/stores/playthroughs", () => ({
  playthroughActions: {
    getLocationFromComboboxId: vi.fn(),
    relocateEncounterSlot: vi.fn(),
  },
}));

vi.mock("@/stores/settings", async () => {
  const { proxy } = await import("valtio");
  return {
    settingsStore: proxy({
      moveEncountersBetweenLocations: false,
      version: "1.0.0",
    }),
  };
});

describe("useComboboxDragAndDrop", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    dragActions.cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("does not publish a preview after its drag data is cleared during lookup", async () => {
    let resolvePokemon: (
      value: { id: number; nationalDexId: number }[],
    ) => void;
    let resolveNameMap: (value: Map<number, string>) => void;
    getPokemonMock.mockReturnValue(
      new Promise<{ id: number; nationalDexId: number }[]>((resolve) => {
        resolvePokemon = resolve;
      }),
    );
    getPokemonNameMapMock.mockReturnValue(
      new Promise<Map<number, string>>((resolve) => {
        resolveNameMap = resolve;
      }),
    );
    dragActions.startDrag("Pikachu", "route-2-single", null);
    const { result } = renderHook(() =>
      useComboboxDragAndDrop({
        comboboxId: "route-1-single",
        locationId: "route-1",
        value: null,
        onChange: vi.fn(),
      }),
    );
    const event = {
      dataTransfer: { dropEffect: "none" },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      result.current.handleDragOver(event);
      vi.advanceTimersByTime(16);
    });

    expect(getPokemonMock).toHaveBeenCalledOnce();

    dragActions.clearDrag();
    await act(async () => {
      resolvePokemon!([{ id: 25, nationalDexId: 25 }]);
      resolveNameMap!(new Map([[25, "pikachu"]]));
    });

    expect(result.current.dragPreview).toBeNull();
  });
});
