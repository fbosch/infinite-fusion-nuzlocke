import { describe, expect, it } from "vitest";
import { createProcessedPokemonData } from "../scripts/utils/pokemon-data-utils";

describe("Pokemon data processing", () => {
  it("preserves the project entry identity while assembling PokeAPI data", () => {
    expect(
      createProcessedPokemonData(
        { id: 25, name: "Pikachu" },
        {
          id: 25,
          species: { name: "pikachu" },
          types: [{ type: { name: "electric" } }],
        },
        {
          evolution_chain: {
            url: "https://pokeapi.co/api/v2/evolution-chain/10/",
          },
          generation: { name: "generation-i" },
          is_legendary: false,
          is_mythical: false,
        },
        {
          evolves_from: { id: 172, name: "pichu" },
          evolves_to: [{ id: 26, name: "raichu" }],
        },
      ),
    ).toEqual({
      evolution: {
        evolves_from: { id: 172, name: "pichu" },
        evolves_to: [{ id: 26, name: "raichu" }],
      },
      id: 25,
      name: "Pikachu",
      nationalDexId: 25,
      species: {
        evolution_chain: {
          url: "https://pokeapi.co/api/v2/evolution-chain/10/",
        },
        generation: "generation-i",
        is_legendary: false,
        is_mythical: false,
      },
      types: [{ name: "electric" }],
    });
  });
});
