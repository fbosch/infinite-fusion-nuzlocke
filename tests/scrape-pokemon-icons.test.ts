import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadAllIcons } from "../scripts/scrape-pokemon-icons";
import { ConsoleFormatter } from "../scripts/utils/console-utils";
import type {
  SpriteDownloadConfig,
  SpriteDownloadIcon,
} from "../scripts/utils/sprite-download-utils";
import * as spriteDownloadUtils from "../scripts/utils/sprite-download-utils";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
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
    baseUrl: "https://sprites.example",
    eggSpriteUrl: "https://sprites.example/egg.png",
    name: "gen8",
    spritesDir,
  };
}

function createIcon(
  overrides: Partial<SpriteDownloadIcon> = {},
): SpriteDownloadIcon {
  return {
    filename: "pikachu.png",
    generation: "gen8",
    id: 25,
    name: "Pikachu",
    url: "https://sprites.example/pikachu.png",
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

    await expect(
      spriteDownloadUtils.downloadSpriteImage(icon, config, vi.fn()),
    ).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("writes the configured egg sprite", async () => {
    const config = await createConfig();
    const fetchMock = vi.fn().mockResolvedValue(new Response("egg"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      spriteDownloadUtils.downloadSpriteImage(
        createIcon({ filename: "egg.png", id: -1 }),
        config,
        vi.fn(),
      ),
    ).resolves.toBe(true);

    await expect(
      fs.readFile(path.join(config.spritesDir, "egg.png"), "utf-8"),
    ).resolves.toBe("egg");
    expect(fetchMock).toHaveBeenCalledWith(config.eggSpriteUrl, {
      headers: { "User-Agent": "Infinite-Fusion-Scraper/1.0" },
      signal: expect.any(AbortSignal),
    });
  });

  it("falls back to the base form after a first-attempt 404", async () => {
    const config = await createConfig();
    const icon = createIcon({
      filename: "lycanroc-midday.png",
      name: "Lycanroc Midday Form",
      url: "https://sprites.example/lycanroc-midday.png",
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response("base form"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      spriteDownloadUtils.downloadSpriteImage(icon, config, vi.fn(), 1),
    ).resolves.toBe(true);

    await expect(
      fs.readFile(path.join(config.spritesDir, "lycanroc.png"), "utf-8"),
    ).resolves.toBe("base form");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://sprites.example/lycanroc.png",
      {
        headers: { "User-Agent": "Infinite-Fusion-Scraper/1.0" },
        signal: expect.any(AbortSignal),
      },
    );
  });

  it("downloads generation batches in order with cumulative progress", async () => {
    const progressBar = { stop: vi.fn(), update: vi.fn() };
    vi.spyOn(ConsoleFormatter, "createProgressBar").mockReturnValue(
      progressBar as never,
    );
    vi.spyOn(ConsoleFormatter, "working").mockImplementation(() => {});
    vi.spyOn(ConsoleFormatter, "success").mockImplementation(() => {});
    vi.spyOn(ConsoleFormatter, "warn").mockImplementation(() => {});
    vi.spyOn(spriteDownloadUtils, "spriteFileExists")
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);
    vi.spyOn(spriteDownloadUtils, "downloadSpriteImage").mockResolvedValue(
      true,
    );

    const gen7Icons = Array.from({ length: 11 }, (_, index) =>
      createIcon({ filename: `gen7-${index}.png`, generation: "gen7" }),
    );
    const gen8Icon = createIcon({ filename: "gen8.png", generation: "gen8" });

    await expect(downloadAllIcons([...gen7Icons, gen8Icon])).resolves.toEqual({
      downloaded: 11,
      errors: 0,
      skipped: 1,
    });
    expect(progressBar.update).toHaveBeenNthCalledWith(
      1,
      10,
      expect.objectContaining({
        status: "Gen 7: New: 9, Skipped: 1, Errors: 0",
      }),
    );
    expect(progressBar.update).toHaveBeenNthCalledWith(
      3,
      12,
      expect.objectContaining({
        status: "Gen 8: New: 11, Skipped: 1, Errors: 0",
      }),
    );
    expect(progressBar.stop).toHaveBeenCalledOnce();
  });
});
