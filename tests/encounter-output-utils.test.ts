import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureEncounterOutputDirectories } from "../scripts/utils/encounter-output-utils";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { force: true, recursive: true })),
  );
});

describe("encounter output directories", () => {
  it("creates classic and remix directories under the given data directory", async () => {
    const dataDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "encounter-output-"),
    );
    temporaryDirectories.push(dataDirectory);

    const directories = await ensureEncounterOutputDirectories(dataDirectory);

    expect(directories).toEqual({
      classicDir: path.join(dataDirectory, "classic"),
      remixDir: path.join(dataDirectory, "remix"),
    });
    await expect(fs.stat(directories.classicDir)).resolves.toMatchObject({
      isDirectory: expect.any(Function),
    });
    await expect(fs.stat(directories.remixDir)).resolves.toMatchObject({
      isDirectory: expect.any(Function),
    });
  });
});
