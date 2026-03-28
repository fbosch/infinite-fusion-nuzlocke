import { describe, expect, it } from "vitest";
import { extractStaticEncounterLocations } from "../scripts/scrape-special-encounters";

describe("extractStaticEncounterLocations", () => {
  it("expands Trash Cans static locations to all listed locations", () => {
    const locations = extractStaticEncounterLocations(
      "Trash Cans (static), Route 4, 5, Route 10, Safari Zone A1, A2",
    );

    expect(locations).toEqual([
      "Route 4",
      "Route 5",
      "Route 10",
      "Safari Zone A1",
      "Safari Zone A2",
    ]);
  });

  it("keeps only explicit static locations for non-trash rows", () => {
    const locations = extractStaticEncounterLocations(
      "Route 12, 16 (static), Vermillion City",
    );

    expect(locations).toEqual(["Route 16"]);
  });

  it("drops trash-can placeholder for singular and lowercase variants", () => {
    const locations = extractStaticEncounterLocations(
      "trash can (static), Route 11, Route 12",
    );

    expect(locations).toEqual(["Route 11", "Route 12"]);
  });
});
