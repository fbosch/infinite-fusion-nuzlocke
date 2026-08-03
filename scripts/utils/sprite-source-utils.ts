import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

export const BasePokemonEntrySchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

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

export async function loadJsonFile<T>(
  filePath: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const payload: unknown = JSON.parse(await fs.readFile(filePath, "utf-8"));
  const result = schema.safeParse(payload);
  if (result.success === false) {
    throw new Error(
      `Invalid JSON in ${filePath}: ${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}
