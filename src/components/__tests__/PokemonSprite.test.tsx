/** @vitest-environment jsdom */

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import gen7SpritesheetMetadata from "@/assets/pokemon-gen7-spritesheet-metadata.json";
import gen8SpritesheetMetadata from "@/assets/pokemon-gen8-spritesheet-metadata.json";

const imageProps = vi.hoisted(() => vi.fn());

vi.mock("next/image", () => ({
  default: (props: unknown) => {
    imageProps(props);
    return <img alt="Pokemon sprite" />;
  },
}));

import { PokemonSprite } from "../PokemonSprite";

describe("PokemonSprite", () => {
  it.each([
    [
      "gen7",
      `/images/pokemon-gen7-spritesheet.webp?v=${gen7SpritesheetMetadata.spritesheetVersion}`,
    ],
    [
      "gen8",
      `/images/pokemon-gen8-spritesheet.webp?v=${gen8SpritesheetMetadata.spritesheetVersion}`,
    ],
  ] as const)(
    "uses the lossless %s sheet without priority loading by default",
    (generation, src) => {
      render(<PokemonSprite generation={generation} pokemonId={25} />);

      expect(imageProps).toHaveBeenCalledWith(
        expect.objectContaining({
          loading: "lazy",
          priority: false,
          src,
        }),
      );
    },
  );
});
