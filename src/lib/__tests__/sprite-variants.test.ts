import { describe, expect, it } from "vitest";
import {
  generateSpriteVariantUrl,
  getSpriteVariantSuffix,
} from "../spriteVariants";

describe("sprite variants", () => {
  it.each([
    [0, ""],
    [1, "a"],
    [26, "z"],
    [27, "ba"],
  ])("maps variant index %i to %s", (index, expected) => {
    expect(getSpriteVariantSuffix(index)).toBe(expected);
  });

  it("builds a CDN URL from a sprite ID and variant", () => {
    expect(generateSpriteVariantUrl("25.125", "b")).toBe(
      "https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/25.125b.png",
    );
  });
});
