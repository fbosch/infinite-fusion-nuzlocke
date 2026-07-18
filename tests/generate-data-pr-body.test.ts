import { describe, expect, it } from "vitest";
import { flattenLocationPokemonEntries } from "../scripts/generate-data-pr-body";

describe("data refresh location normalization", () => {
  it("preserves encounter precedence and direct-location ordering", () => {
    expect(
      flattenLocationPokemonEntries("data/classic/safari-encounters.json", {
        locations: [
          {
            routeName: "Route 1",
            encounters: [16, { pokemonId: 27, encounterType: "cave" }],
            pokemonIds: [41],
            pokemonId: 54,
          },
          {
            routeName: "Route 2",
            pokemonIds: [41],
            pokemonId: 54,
            source: "Gift",
          },
        ],
      }),
    ).toEqual([
      { location: "Route 1", source: "Safari Encounters", pokemonId: 16 },
      { location: "Route 1", source: "cave", pokemonId: 27 },
      { location: "Route 2", source: "Safari Encounters", pokemonId: 41 },
      { location: "Route 2", source: "Gift", pokemonId: 54 },
    ]);
  });

  it("returns no entries for a non-array payload", () => {
    expect(
      flattenLocationPokemonEntries("data/shared/egg-locations.json", {}),
    ).toEqual([]);
  });
});
