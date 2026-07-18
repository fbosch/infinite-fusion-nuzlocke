import { describe, expect, it } from "vitest";
import { getSpriteSourcePaths } from "../scripts/utils/sprite-source-utils";

describe("sprite source paths", () => {
  it("derives the shared source and generation directories from a script URL", () => {
    expect(
      getSpriteSourcePaths(
        "file:///tmp/project/scripts/generate-spritesheet.ts",
      ),
    ).toEqual({
      scriptDirectory: "/tmp/project/scripts",
      baseEntriesPath: "/tmp/project/data/shared/base-entries.json",
      spritesBaseDir: "/tmp/project/scripts/sprites",
      gen7SpritesDir: "/tmp/project/scripts/sprites/pokemon-gen7",
      gen8SpritesDir: "/tmp/project/scripts/sprites/pokemon-gen8",
    });
  });
});
