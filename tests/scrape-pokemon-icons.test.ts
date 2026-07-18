import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  downloadSpriteImage,
  type SpriteDownloadConfig,
  type SpriteDownloadIcon,
} from "../scripts/utils/sprite-download-utils";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { force: true, recursive: true })),
  );
});

async function createConfig(): Promise<SpriteDownloadConfig> {
  const spritesDir = await fs.mkdtemp(path.join(os.tmpdir(), "sprite-icons-"));
  temporaryDirectories.push(spritesDir);

  return {
    name: "gen8",
    baseUrl: "https://sprites.example",
    spritesDir,
    eggSpriteUrl: "https://sprites.example/egg.png",
  };
}

function createIcon(
  overrides: Partial<SpriteDownloadIcon> = {},
): SpriteDownloadIcon {
  return {
    id: 25,
    name: "Pikachu",
    url: "https://sprites.example/pikachu.png",
    filename: "pikachu.png",
    generation: "gen8",
    ...overrides,
  };
}

describe("Pokemon icon downloads", () => {
  it("skips an existing sprite without fetching", async () => {
    const config = await createConfig();
    const icon = createIcon();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await fs.writeFile(path.join(config.spritesDir, icon.filename), "existing");

    await expect(downloadSpriteImage(icon, config, vi.fn())).resolves.toBe(
      true,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("writes the configured egg sprite", async () => {
    const config = await createConfig();
    const fetchMock = vi.fn().mockResolvedValue(new Response("egg"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      downloadSpriteImage(
        createIcon({ id: -1, filename: "egg.png" }),
        config,
        vi.fn(),
      ),
    ).resolves.toBe(true);

    await expect(
      fs.readFile(path.join(config.spritesDir, "egg.png"), "utf-8"),
    ).resolves.toBe("egg");
    expect(fetchMock).toHaveBeenCalledWith(config.eggSpriteUrl, {
      headers: { "User-Agent": "Infinite-Fusion-Scraper/1.0" },
    });
  });

  it("falls back to the base form after a first-attempt 404", async () => {
    const config = await createConfig();
    const icon = createIcon({
      name: "Lycanroc Midday Form",
      url: "https://sprites.example/lycanroc-midday.png",
      filename: "lycanroc-midday.png",
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response("base form"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(downloadSpriteImage(icon, config, vi.fn(), 1)).resolves.toBe(
      true,
    );

    await expect(
      fs.readFile(path.join(config.spritesDir, "lycanroc.png"), "utf-8"),
    ).resolves.toBe("base form");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://sprites.example/lycanroc.png",
      { headers: { "User-Agent": "Infinite-Fusion-Scraper/1.0" } },
    );
  });
});
