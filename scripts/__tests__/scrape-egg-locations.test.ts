import { describe, expect, it } from "vitest";
import { isEggLocationName, isEggRelated } from "../scrape-egg-locations";

describe("egg gift row classification", () => {
  it.each([
    ["Togepi", ""],
    ["Gift Pokemon", "Received as an egg"],
    ["Trade", "Random egg reward"],
  ])("recognizes egg-related rows: %s / %s", (pokemonCell, notesCell) => {
    expect(isEggRelated(pokemonCell, notesCell)).toBe(true);
  });

  it("rejects rows without an egg marker or listed egg Pokemon", () => {
    expect(isEggRelated("Bulbasaur", "Gift Pokemon")).toBe(false);
  });

  it.each(["Route 2", "Cerulean City", "Mt. Moon", "Viridian Forest"])(
    "accepts valid location names: %s",
    (location) => {
      expect(isEggLocationName(location)).toBe(true);
    },
  );

  it.each(["Egg", "Pokemon Center", "Togepi", ""])(
    "rejects non-location names: %s",
    (location) => {
      expect(isEggLocationName(location)).toBe(false);
    },
  );
});
