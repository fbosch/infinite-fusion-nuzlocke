import { describe, expect, it, vi } from "vitest";
import { type PokemonOptionType, PokemonStatus } from "@/features/pokemon";
import { EncounterSource } from "../../../model/encounters";
import {
  applyEncounterDefaultStatus,
  getPokemonSources,
} from "../encounter-selection";

vi.mock("@/features/pokemon", () => ({
  PokemonStatus: {
    DECEASED: "deceased",
    RECEIVED: "received",
    TRADED: "traded",
  },
}));

const basePokemon: PokemonOptionType = {
  id: 25,
  name: "Pikachu",
  nationalDexId: 25,
  uid: "pikachu-1",
};

describe("encounter selection helpers", () => {
  it("returns route encounter sources for pokemon id", () => {
    const sources = getPokemonSources(
      [
        {
          ...basePokemon,
          sources: [EncounterSource.GRASS, EncounterSource.GIFT],
        },
      ],
      25,
    );

    expect(sources).toEqual([EncounterSource.GRASS, EncounterSource.GIFT]);
  });

  it("applies received status for gift encounters", () => {
    const updated = applyEncounterDefaultStatus(basePokemon, [
      EncounterSource.GIFT,
    ]);

    expect(updated.status).toBe(PokemonStatus.RECEIVED);
  });

  it("applies traded status for trade encounters", () => {
    const updated = applyEncounterDefaultStatus(basePokemon, [
      EncounterSource.TRADE,
    ]);

    expect(updated.status).toBe(PokemonStatus.TRADED);
  });

  it("keeps existing status when no special source applies", () => {
    const pokemon = { ...basePokemon, status: PokemonStatus.DECEASED };
    const updated = applyEncounterDefaultStatus(pokemon, [
      EncounterSource.GRASS,
    ]);

    expect(updated).toEqual(pokemon);
  });
});
