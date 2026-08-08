/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import { useKeyPressed } from "../use-key-pressed";

describe("useKeyPressed", () => {
  it("keeps a key pressed across the external-store update", () => {
    const { result, unmount } = renderHook(() => useKeyPressed("Shift"));

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
    });

    expect(result.current).toBe(true);

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift" }));
    });

    expect(result.current).toBe(false);
    unmount();
  });

  it("keeps its subscription stable after Strict Mode resubscribes", () => {
    const { result, unmount } = renderHook(() => useKeyPressed("Shift"), {
      wrapper: StrictMode,
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
    });

    expect(result.current).toBe(true);

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift" }));
    });

    expect(result.current).toBe(false);
    unmount();
  });
});
