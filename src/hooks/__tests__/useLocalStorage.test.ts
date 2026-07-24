// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useLocalStorage } from "../useLocalStorage";

describe("useLocalStorage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("uses the initial value for functional updates when the key is absent", () => {
    const { result } = renderHook(() => useLocalStorage("counter", 1));

    act(() => {
      result.current[1]((value) => value + 1);
    });

    expect(result.current[0]).toBe(2);
    expect(localStorage.getItem("counter")).toBe("2");
  });
});
