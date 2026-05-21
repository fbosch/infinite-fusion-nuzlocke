import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareImportedPlaythrough } from "../importPipeline";

const validImportData = (id = "playthrough_existing") => ({
  version: "1.0.0",
  exportedAt: new Date(0).toISOString(),
  playthrough: {
    id,
    name: "Imported Run",
    gameMode: "classic",
    version: "1.0.0",
    createdAt: 1,
    updatedAt: 2,
    encounters: {},
    team: { members: [null, null, null, null, null, null] },
  },
});

describe("playthrough import pipeline", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes valid imported data", () => {
    vi.spyOn(Date, "now").mockReturnValue(1234);

    const playthrough = prepareImportedPlaythrough(validImportData(), []);

    expect(playthrough).toMatchObject({
      id: "playthrough_existing",
      name: "Imported Run",
      gameMode: "classic",
      updatedAt: 1234,
      customLocations: [],
      encounters: {},
      team: { members: [null, null, null, null, null, null] },
    });
  });

  it("generates a new id when the imported id already exists", () => {
    const playthrough = prepareImportedPlaythrough(validImportData(), [
      "playthrough_existing",
    ]);

    expect(playthrough.id).not.toBe("playthrough_existing");
    expect(playthrough.id).toMatch(/^playthrough_/);
  });

  it("throws a validation error for invalid import data", () => {
    const invalidImportData = validImportData();
    (invalidImportData.playthrough as Record<string, unknown>).customLocations =
      [{ bad: "location" }];

    expect(() => prepareImportedPlaythrough(invalidImportData, [])).toThrow(
      "Validation failed:",
    );
  });
});
