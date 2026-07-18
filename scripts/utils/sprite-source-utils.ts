import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function getSpriteSourcePaths(moduleUrl: string): {
  scriptDirectory: string;
  baseEntriesPath: string;
  spritesBaseDir: string;
  gen7SpritesDir: string;
  gen8SpritesDir: string;
} {
  const scriptDirectory = path.dirname(fileURLToPath(moduleUrl));
  const spritesBaseDir = path.join(scriptDirectory, "sprites");

  return {
    scriptDirectory,
    baseEntriesPath: path.join(
      scriptDirectory,
      "..",
      "data",
      "shared",
      "base-entries.json",
    ),
    spritesBaseDir,
    gen7SpritesDir: path.join(spritesBaseDir, "pokemon-gen7"),
    gen8SpritesDir: path.join(spritesBaseDir, "pokemon-gen8"),
  };
}

export async function loadJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf-8")) as T;
}
