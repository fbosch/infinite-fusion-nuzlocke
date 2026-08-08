import { describe, expect, it } from "vitest";
import { resolveFusionCombination } from "../fusionCombination";

const pokemon = [
  { id: 11, name: "Metapod", nationalDexId: 11 },
  { id: 200, name: "Misdreavus", nationalDexId: 200 },
];

describe("resolveFusionCombination", () => {
  it("resolves two Infinite Fusion IDs in their entered order", () => {
    expect(resolveFusionCombination("11.200", pokemon)).toEqual({
      body: pokemon[1],
      head: pokemon[0],
    });
  });

  it("accepts surrounding whitespace and self-fusions", () => {
    expect(resolveFusionCombination(" 11.11 ", pokemon)).toEqual({
      body: pokemon[0],
      head: pokemon[0],
    });
  });

  it.each(["", "11", "11.", ".200", "11.200.1", "Metapod.200", "11 . 200"])(
    "rejects malformed shorthand %j",
    (query) => {
      expect(resolveFusionCombination(query, pokemon)).toBeNull();
    },
  );

  it("rejects shorthand with an unknown Pokémon ID", () => {
    expect(resolveFusionCombination("11.999", pokemon)).toBeNull();
  });

  it("rejects a malformed cached Pokémon collection", () => {
    expect(resolveFusionCombination("11.200", {} as typeof pokemon)).toBeNull();
  });

  it("ignores malformed cached Pokémon entries", () => {
    expect(
      resolveFusionCombination("11.200", [null] as unknown as typeof pokemon),
    ).toBeNull();
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 11.5])(
    "rejects a cached Pokémon with invalid ID %s",
    (id) => {
      expect(
        resolveFusionCombination("11.200", [
          { id, name: "Metapod", nationalDexId: 11 },
          pokemon[1],
        ]),
      ).toBeNull();
    },
  );
});
