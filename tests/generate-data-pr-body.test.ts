import { describe, expect, it } from "vitest";
import { flattenLocationPokemonEntries } from "../scripts/generate-data-pr-body";

describe("data refresh location normalization", () => {
  it("preserves encounter precedence and direct-location ordering", () => {
    expect(
      flattenLocationPokemonEntries("data/classic/safari-encounters.json", {
        locations: [
          {
            encounters: [16, { encounterType: "cave", pokemonId: 27 }],
            pokemonId: 54,
            pokemonIds: [41],
            routeName: "Route 1",
          },
          {
            pokemonId: 54,
            pokemonIds: [41],
            routeName: "Route 2",
            source: "Gift",
          },
        ],
      }),
    ).toEqual([
      { location: "Route 1", pokemonId: 16, source: "Safari Encounters" },
      { location: "Route 1", pokemonId: 27, source: "cave" },
      { location: "Route 2", pokemonId: 41, source: "Safari Encounters" },
      { location: "Route 2", pokemonId: 54, source: "Gift" },
    ]);
  });

  it("returns no entries for a non-array payload", () => {
    expect(
      flattenLocationPokemonEntries("data/shared/egg-locations.json", {}),
    ).toEqual([]);
  });
});
