import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareImportedPlaythrough } from "../importPipeline";

const playthroughIdPattern = /^playthrough_/;

const validImportData = (id = "playthrough_existing") => ({
  exportedAt: new Date(0).toISOString(),
  playthrough: {
    createdAt: 1,
    encounters: {},
    gameMode: "classic",
    id,
    name: "Imported Run",
    team: { members: [null, null, null, null, null, null] },
    updatedAt: 2,
    version: "1.0.0",
  },
  version: "1.0.0",
});

describe("playthrough import pipeline", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes valid imported data", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1234);

    const playthrough = await prepareImportedPlaythrough(validImportData(), []);

    expect(playthrough).toMatchObject({
      customLocations: [],
      encounters: {},
      gameMode: "classic",
      id: "playthrough_existing",
      name: "Imported Run",
      team: { members: [null, null, null, null, null, null] },
      updatedAt: 1234,
    });
  });

  it("generates a new id when the imported id already exists", async () => {
    const playthrough = await prepareImportedPlaythrough(validImportData(), [
      "playthrough_existing",
    ]);

    expect(playthrough.id).not.toBe("playthrough_existing");
    expect(playthrough.id).toMatch(playthroughIdPattern);
  });

  it("throws a validation error for invalid import data", async () => {
    const invalidImportData = validImportData();
    (invalidImportData.playthrough as Record<string, unknown>).customLocations =
      [{ bad: "location" }];

    await expect(
      prepareImportedPlaythrough(invalidImportData, []),
    ).rejects.toThrow("Validation failed:");
  });
});
