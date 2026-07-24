// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";

describe("preferredVariants persistence", () => {
  afterEach(() => {
    localStorage.removeItem("preferredVariants:v1");
    localStorage.removeItem("preferredVariants");
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
});
