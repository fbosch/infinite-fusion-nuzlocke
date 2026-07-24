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

  it("uses the latest stored value for functional updates", () => {
    const first = renderHook(() => useLocalStorage("counter", 1));
    const second = renderHook(() => useLocalStorage("counter", 1));

    act(() => {
      second.result.current[1](5);
      first.result.current[1]((value) => value + 1);
    });

    expect(first.result.current[0]).toBe(6);
    expect(localStorage.getItem("counter")).toBe("6");
  });
});
