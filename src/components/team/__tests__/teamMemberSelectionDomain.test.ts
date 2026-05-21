import { describe, expect, it } from "vitest";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { getTeamSelectionNickname } from "../teamMemberSelectionDomain";

const pokemon = (uid: string, nickname?: string): PokemonOptionType => ({
  id: 25,
  name: "Pikachu",
  nationalDexId: 25,
  uid,
  nickname,
});

describe("team member selection domain", () => {
  it("prioritizes head nickname for fusion selections", () => {
    expect(
      getTeamSelectionNickname(
        pokemon("head", "Sparky"),
        pokemon("body", "Flame"),
      ),
    ).toBe("Sparky");
  });

  it("falls back to body nickname when head has none", () => {
    expect(
      getTeamSelectionNickname(pokemon("head"), pokemon("body", "Flame")),
    ).toBe("Flame");
  });

  it("falls back to body nickname when head nickname is blank", () => {
    expect(
      getTeamSelectionNickname(pokemon("head", ""), pokemon("body", "Flame")),
    ).toBe("Flame");
  });

  it("returns empty nickname when no selected pokemon has one", () => {
    expect(getTeamSelectionNickname(pokemon("head"), pokemon("body"))).toBe("");
    expect(getTeamSelectionNickname(null, null)).toBe("");
  });
});
