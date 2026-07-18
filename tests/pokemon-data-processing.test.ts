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
          is_legendary: false,
          is_mythical: false,
          generation: { name: "generation-i" },
          evolution_chain: {
            url: "https://pokeapi.co/api/v2/evolution-chain/10/",
          },
        },
        {
          evolves_from: { id: 172, name: "pichu" },
          evolves_to: [{ id: 26, name: "raichu" }],
        },
      ),
    ).toEqual({
      id: 25,
      nationalDexId: 25,
      name: "Pikachu",
      types: [{ name: "electric" }],
      species: {
        is_legendary: false,
        is_mythical: false,
        generation: "generation-i",
        evolution_chain: {
          url: "https://pokeapi.co/api/v2/evolution-chain/10/",
        },
      },
      evolution: {
        evolves_from: { id: 172, name: "pichu" },
        evolves_to: [{ id: 26, name: "raichu" }],
      },
    });
  });
});
