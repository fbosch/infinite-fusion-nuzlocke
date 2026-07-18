import fs from "node:fs/promises";
import path from "node:path";
import {
  normalizePokemonNameForSprite,
  stripPokemonFormSuffix,
} from "./pokemon-name-utils";

const SPRITE_FETCH_HEADERS = {
  "User-Agent": "Infinite-Fusion-Scraper/1.0",
};

export type SpriteDownloadIcon = {
  id: number;
  name: string;
  url: string;
  filename: string;
  generation: "gen7" | "gen8";
};

export type SpriteDownloadConfig = {
  name: "gen7" | "gen8";
  baseUrl: string;
  spritesDir: string;
  eggSpriteUrl: string;
};

type ReportError = (message: string) => void;

export async function spriteFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fetchSprite(url: string): Promise<Response> {
  return fetch(url, { headers: SPRITE_FETCH_HEADERS });
}

async function saveSprite(response: Response, filePath: string): Promise<void> {
  await fs.writeFile(filePath, Buffer.from(await response.arrayBuffer()));
}

async function tryDownloadBaseForm(
  icon: SpriteDownloadIcon,
  config: SpriteDownloadConfig,
): Promise<boolean> {
  const baseName = stripPokemonFormSuffix(icon.name);
  if (!baseName || baseName === icon.name) return false;

  const baseFilename = `${normalizePokemonNameForSprite(baseName)}.png`;
  const baseFilePath = path.join(config.spritesDir, baseFilename);

  try {
    const response = await fetchSprite(`${config.baseUrl}/${baseFilename}`);
    if (!response.ok) return false;

    await saveSprite(response, baseFilePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadEggSprite(
  config: SpriteDownloadConfig,
  filePath: string,
  reportError: ReportError,
): Promise<boolean> {
  try {
    const response = await fetchSprite(config.eggSpriteUrl);
    if (!response.ok) {
      reportError(
        `Failed to download ${config.name} egg sprite: HTTP ${response.status}`,
      );
      return false;
    }

    await saveSprite(response, filePath);
    return true;
  } catch (error) {
    reportError(
      `Failed to download ${config.name} egg sprite: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return false;
  }
}

async function downloadOriginalOrBaseForm(
  icon: SpriteDownloadIcon,
  config: SpriteDownloadConfig,
  filePath: string,
  attempt: number,
): Promise<void> {
  const response = await fetchSprite(icon.url);
  if (response.ok) {
    await saveSprite(response, filePath);
    return;
  }

  if (response.status === 404 && attempt === 1) {
    if (await tryDownloadBaseForm(icon, config)) return;
  }

  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}

async function downloadWithRetries(
  icon: SpriteDownloadIcon,
  config: SpriteDownloadConfig,
  filePath: string,
  retries: number,
  reportError: ReportError,
): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await downloadOriginalOrBaseForm(icon, config, filePath, attempt);
      return true;
    } catch (error) {
      if (attempt === retries) {
        reportError(
          `Failed to download ${icon.name} (${config.name}) after ${retries} attempts: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
        return false;
      }

      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 200));
    }
  }

  return false;
}

export async function downloadSpriteImage(
  icon: SpriteDownloadIcon,
  config: SpriteDownloadConfig,
  reportError: ReportError,
  retries = 3,
): Promise<boolean> {
  const filePath = path.join(config.spritesDir, icon.filename);
  if (await spriteFileExists(filePath)) return true;

  if (icon.id === -1) {
    return downloadEggSprite(config, filePath, reportError);
  }

  return downloadWithRetries(icon, config, filePath, retries, reportError);
}
