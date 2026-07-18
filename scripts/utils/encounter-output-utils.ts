import fs from "node:fs/promises";
import path from "node:path";

export async function ensureEncounterOutputDirectories(
  dataDirectory = path.join(process.cwd(), "data"),
): Promise<{ classicDir: string; remixDir: string }> {
  const classicDir = path.join(dataDirectory, "classic");
  const remixDir = path.join(dataDirectory, "remix");

  await Promise.all([
    fs.mkdir(classicDir, { recursive: true }),
    fs.mkdir(remixDir, { recursive: true }),
  ]);

  return { classicDir, remixDir };
}
