import { describe, expect, it } from "vitest";
import {
  fixOverlaps,
  packSprites,
  type SpriteInfo,
} from "../scripts/generate-spritesheet";
import { rectanglesOverlap } from "../scripts/utils/sprite-packing-utils";

function createSprite(overrides: Partial<SpriteInfo> = {}): SpriteInfo {
  return {
    contentBounds: { height: 20, width: 20, x: 0, y: 0 },
    exists: true,
    filename: "pikachu.png",
    generation: "gen7",
    height: 20,
    id: 1,
    name: "Pikachu",
    originalHeight: 20,
    originalWidth: 20,
    width: 20,
    x: 0,
    y: 0,
    ...overrides,
  };
}

describe("spritesheet packing policies", () => {
  it("packs valid sprites without moving missing records", () => {
    const sprites = [
      createSprite({ height: 20, id: 1, width: 40 }),
      createSprite({ height: 30, id: 2, width: 20 }),
      createSprite({ contentBounds: null, exists: false, id: 3, x: 9, y: 9 }),
    ];

    const result = packSprites(sprites);

    expect(result.width).toBeGreaterThanOrEqual(40);
    expect(result.height).toBeGreaterThanOrEqual(30);
    expect(
      rectanglesOverlap(sprites[0] as SpriteInfo, sprites[1] as SpriteInfo),
    ).toBe(false);
    expect(sprites[2]).toMatchObject({ x: 9, y: 9 });
  });

  it("repairs a pair by its overlap plus one pixel", () => {
    const sprites = [
      createSprite({ height: 10, width: 10, x: 0, y: 0 }),
      createSprite({ height: 10, id: 2, width: 10, x: 5, y: 6 }),
    ];

    expect(fixOverlaps(sprites)).toBe(true);
    expect(sprites[1]).toMatchObject({ x: 11, y: 11 });
    expect(
      rectanglesOverlap(sprites[0] as SpriteInfo, sprites[1] as SpriteInfo),
    ).toBe(false);
  });
});
