import { describe, expect, it } from "vitest";
import {
  fixOverlaps,
  packSprites,
  type SpriteInfo,
} from "../scripts/generate-spritesheet";
import { rectanglesOverlap } from "../scripts/utils/sprite-packing-utils";

function createSprite(overrides: Partial<SpriteInfo> = {}): SpriteInfo {
  return {
    id: 1,
    name: "Pikachu",
    filename: "pikachu.png",
    exists: true,
    generation: "gen7",
    originalWidth: 20,
    originalHeight: 20,
    contentBounds: { x: 0, y: 0, width: 20, height: 20 },
    x: 0,
    y: 0,
    width: 20,
    height: 20,
    ...overrides,
  };
}

describe("spritesheet packing policies", () => {
  it("packs valid sprites without moving missing records", () => {
    const sprites = [
      createSprite({ id: 1, width: 40, height: 20 }),
      createSprite({ id: 2, width: 20, height: 30 }),
      createSprite({ id: 3, exists: false, contentBounds: null, x: 9, y: 9 }),
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
      createSprite({ x: 0, y: 0, width: 10, height: 10 }),
      createSprite({ id: 2, x: 5, y: 6, width: 10, height: 10 }),
    ];

    expect(fixOverlaps(sprites)).toBe(true);
    expect(sprites[1]).toMatchObject({ x: 11, y: 11 });
    expect(
      rectanglesOverlap(sprites[0] as SpriteInfo, sprites[1] as SpriteInfo),
    ).toBe(false);
  });
});
