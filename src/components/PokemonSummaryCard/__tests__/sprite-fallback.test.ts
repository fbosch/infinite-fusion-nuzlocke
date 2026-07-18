import { afterEach, describe, expect, it, vi } from "vitest";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { getNextFallbackUrl } from "../utils";

const pikachu: PokemonOptionType = {
  id: 25,
  name: "Pikachu",
  nationalDexId: 25,
  status: "captured",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubSuccessfulImageLoading(): string[] {
  const loadedUrls: string[] = [];
  vi.stubGlobal("window", {
    Image: class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(url: string) {
        loadedUrls.push(url);
        this.onload?.();
      }
    },
  });
  return loadedUrls;
}

describe("getNextFallbackUrl", () => {
  it("does not try a fallback without a Pokemon", async () => {
    await expect(
      getNextFallbackUrl("https://example.com/sprite.png", null, null),
    ).resolves.toBeNull();
  });

  it("uses the generated sprite when a custom single-Pokemon sprite fails", async () => {
    const loadedUrls = stubSuccessfulImageLoading();

    await expect(
      getNextFallbackUrl(
        "https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/25.png",
        pikachu,
        null,
      ),
    ).resolves.toBe(
      "https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/generated/25.png",
    );
    expect(loadedUrls).toEqual([
      "https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/generated/25.png",
    ]);
  });

  it("removes a custom artwork variant before using a generated sprite", async () => {
    const loadedUrls = stubSuccessfulImageLoading();

    await expect(
      getNextFallbackUrl(
        "https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/25a.png",
        pikachu,
        null,
        "a",
      ),
    ).resolves.toBe(
      "https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/25.png",
    );
    expect(loadedUrls).toEqual([
      "https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/25.png",
    ]);
  });

  it("uses PokeAPI after a generated single-Pokemon sprite fails", async () => {
    const loadedUrls = stubSuccessfulImageLoading();

    await expect(
      getNextFallbackUrl(
        "https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/generated/25.png",
        pikachu,
        null,
      ),
    ).resolves.toBe(
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
    );
    expect(loadedUrls).toEqual([
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
    ]);
  });
});
