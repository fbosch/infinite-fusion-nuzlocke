/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReducedMotion } from "../useReducedMotion";

describe("useReducedMotion", () => {
  let matches = false;
  let listener: (() => void) | undefined;

  beforeEach(() => {
    matches = false;
    listener = undefined;
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation(() => ({
        addEventListener: (_event: string, callback: () => void) => {
          listener = callback;
        },
        get matches() {
          return matches;
        },
        removeEventListener: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("updates when the browser preference changes without an override", () => {
    const { result } = renderHook(() => useReducedMotion(undefined));
    expect(result.current).toBe(false);

    matches = true;
    act(() => listener?.());

    expect(result.current).toBe(true);
  });

  it("uses an explicit app override over the browser preference", () => {
    matches = true;

    const { result } = renderHook(() => useReducedMotion(false));

    expect(result.current).toBe(false);
  });

  it("subscribes through legacy media-query listeners", () => {
    let legacyListener: ((event: MediaQueryListEvent) => void) | undefined;
    const addListener = vi.fn(
      (listener: (event: MediaQueryListEvent) => void) => {
        legacyListener = listener;
      },
    );

    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        addListener,
        get matches() {
          return matches;
        },
        removeListener: vi.fn(),
      }),
    );

    const { result } = renderHook(() => useReducedMotion(undefined));
    expect(addListener).toHaveBeenCalledOnce();

    matches = true;
    act(() => legacyListener?.({} as MediaQueryListEvent));

    expect(result.current).toBe(true);
  });
});
