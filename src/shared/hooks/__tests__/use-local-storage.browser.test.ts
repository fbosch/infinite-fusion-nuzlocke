import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { useLocalStorage } from "../use-local-storage";

describe("useLocalStorage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("uses the initial value for functional updates when the key is absent", () => {
    const { result } = renderHook(() =>
      useLocalStorage("counter", 1, z.number()),
    );

    act(() => {
      result.current[1]((value) => value + 1);
    });

    expect(result.current[0]).toBe(2);
    expect(localStorage.getItem("counter")).toBe("2");
  });

  it("uses the latest stored value for functional updates", () => {
    const first = renderHook(() => useLocalStorage("counter", 1, z.number()));
    const second = renderHook(() => useLocalStorage("counter", 1, z.number()));

    act(() => {
      second.result.current[1](5);
      first.result.current[1]((value) => value + 1);
    });

    expect(first.result.current[0]).toBe(6);
    expect(localStorage.getItem("counter")).toBe("6");
  });

  it("recovers from malformed and invalid persisted values", () => {
    const schema = z.object({ enabled: z.boolean() });
    localStorage.setItem("settings", "not json");
    const malformed = renderHook(() =>
      useLocalStorage("settings", { enabled: false }, schema),
    );
    expect(malformed.result.current[0]).toEqual({ enabled: false });

    localStorage.setItem("settings", JSON.stringify({ enabled: "yes" }));
    const invalid = renderHook(() =>
      useLocalStorage("settings", { enabled: false }, schema),
    );
    expect(invalid.result.current[0]).toEqual({ enabled: false });
  });

  it("uses the latest valid value for functional updates", () => {
    const schema = z.number();
    localStorage.setItem("counter", "invalid");
    const { result } = renderHook(() => useLocalStorage("counter", 1, schema));

    act(() => {
      result.current[1]((value) => value + 1);
    });

    expect(result.current[0]).toBe(2);
    expect(localStorage.getItem("counter")).toBe("2");
  });

  it("preserves serialized fallback values when localStorage writes fail", () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("storage unavailable");
      });
    const boolean = renderHook(() =>
      useLocalStorage("fallback-boolean", true, z.boolean()),
    );
    const number = renderHook(() =>
      useLocalStorage("fallback-number", 1, z.number()),
    );
    const string = renderHook(() =>
      useLocalStorage("fallback-string", "value", z.string()),
    );
    const object = renderHook(() =>
      useLocalStorage(
        "fallback-object",
        { value: 1 },
        z.object({ value: z.number() }),
      ),
    );

    act(() => {
      boolean.result.current[1](false);
      number.result.current[1](0);
      string.result.current[1]("");
      object.result.current[1]({ value: 0 });
    });

    expect(boolean.result.current[0]).toBe(false);
    expect(number.result.current[0]).toBe(0);
    expect(string.result.current[0]).toBe("");
    expect(object.result.current[0]).toEqual({ value: 0 });
    setItem.mockRestore();
  });
});
