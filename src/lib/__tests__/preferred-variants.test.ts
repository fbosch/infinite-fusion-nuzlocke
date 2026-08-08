// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

describe("preferredVariants persistence", () => {
  afterEach(() => {
    localStorage.removeItem("preferredVariants:v1");
    localStorage.removeItem("preferredVariants");
    vi.resetModules();
  });

  it("falls back to and migrates legacy data when the versioned key is empty", async () => {
    const entries = [["25", "variant-a"]];
    localStorage.setItem("preferredVariants:v1", "");
    localStorage.setItem("preferredVariants", JSON.stringify(entries));

    const { preferredVariants } = await import("../preferredVariants");

    expect(preferredVariants.get("25")).toBe("variant-a");
    expect(localStorage.getItem("preferredVariants:v1")).toBe(
      JSON.stringify(entries),
    );
    expect(localStorage.getItem("preferredVariants")).toBeNull();
  });

  it("uses valid legacy data when the versioned payload is invalid", async () => {
    const entries = [["25", "variant-a"]];
    localStorage.setItem("preferredVariants:v1", "not json");
    localStorage.setItem("preferredVariants", JSON.stringify(entries));

    const { preferredVariants } = await import("../preferredVariants");

    expect(preferredVariants.get("25")).toBe("variant-a");
    expect(localStorage.getItem("preferredVariants:v1")).toBe(
      JSON.stringify(entries),
    );
    expect(localStorage.getItem("preferredVariants")).toBeNull();
  });

  it("migrates valid legacy data when the versioned key is missing", async () => {
    const entries = [["25", "variant-a"]];
    localStorage.setItem("preferredVariants", JSON.stringify(entries));

    const { preferredVariants } = await import("../preferredVariants");

    expect(preferredVariants.get("25")).toBe("variant-a");
    expect(localStorage.getItem("preferredVariants:v1")).toBe(
      JSON.stringify(entries),
    );
    expect(localStorage.getItem("preferredVariants")).toBeNull();
  });

  it("does not load partially valid entry arrays", async () => {
    localStorage.setItem(
      "preferredVariants:v1",
      JSON.stringify([
        ["25", "variant-a"],
        ["26", 1],
      ]),
    );

    const { preferredVariants } = await import("../preferredVariants");

    expect(preferredVariants.size).toBe(0);
  });
});
