import { describe, expect, it } from "vitest";
import {
  getNestLocationName,
  isEggLocationName,
  isEggRelated,
} from "../scrape-egg-locations";

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

describe("nest location links", () => {
  it.each([
    ["/wiki/Route_2", "Pikachu nest", false, "Route 2"],
    ["/wiki/Mt.%20Moon", "", true, "Mt. Moon"],
  ])(
    "extracts %s when the parent indicates a nest",
    (href, parentText, hasNestImage, expected) => {
      expect(getNestLocationName(href, parentText, hasNestImage)).toBe(
        expected,
      );
    },
  );

  it.each([
    ["/wiki/Route_2", "Pokemon list", false],
    ["/wiki/Pokemon_Nests", "nest", false],
    ["/wiki/File:Nest.png", "nest", false],
    ["/not-a-wiki-link/Route_2", "nest", false],
  ])("rejects unusable nest link: %s", (href, parentText, hasNestImage) => {
    expect(getNestLocationName(href, parentText, hasNestImage)).toBeNull();
  });
});
