import { describe, expect, it } from "vitest";
import type { PokemonOptionType } from "@/loaders/pokemon";
import {
  getTeamSelectionNickname,
  selectTeamPokemon,
} from "../teamMemberSelectionDomain";

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

  it("selects head pokemon and advances to body when body is empty", () => {
    const selected = selectTeamPokemon({
      selectedHead: null,
      selectedBody: null,
      activeSlot: "head",
      pokemon: pokemon("head", "Sparky"),
      locationId: "route1",
      nickname: "",
      previewNickname: "",
    });

    expect(selected.selectedHead?.pokemon.uid).toBe("head");
    expect(selected.selectedHead?.locationId).toBe("route1");
    expect(selected.selectedBody).toBeNull();
    expect(selected.activeSlot).toBe("body");
    expect(selected.nickname).toBe("Sparky");
    expect(selected.previewNickname).toBe("Sparky");
  });

  it("selects body pokemon while preserving head nickname priority", () => {
    const selected = selectTeamPokemon({
      selectedHead: {
        pokemon: pokemon("head", "Sparky"),
        locationId: "route1",
      },
      selectedBody: null,
      activeSlot: "body",
      pokemon: pokemon("body", "Flame"),
      locationId: "route2",
      nickname: "Sparky",
      previewNickname: "Sparky",
    });

    expect(selected.selectedHead?.pokemon.uid).toBe("head");
    expect(selected.selectedBody?.pokemon.uid).toBe("body");
    expect(selected.selectedBody?.locationId).toBe("route2");
    expect(selected.activeSlot).toBe("body");
    expect(selected.nickname).toBe("Sparky");
  });

  it("unselects an already selected head pokemon", () => {
    const selected = selectTeamPokemon({
      selectedHead: {
        pokemon: pokemon("head", "Sparky"),
        locationId: "route1",
      },
      selectedBody: {
        pokemon: pokemon("body", "Flame"),
        locationId: "route2",
      },
      activeSlot: "body",
      pokemon: pokemon("head", "Sparky"),
      locationId: "route1",
      nickname: "Sparky",
      previewNickname: "Sparky",
    });

    expect(selected.selectedHead).toBeNull();
    expect(selected.selectedBody?.pokemon.uid).toBe("body");
    expect(selected.activeSlot).toBe("head");
    expect(selected.nickname).toBe("");
  });

  it("keeps current state when selecting a new pokemon without an active slot", () => {
    const selected = selectTeamPokemon({
      selectedHead: {
        pokemon: pokemon("head", "Sparky"),
        locationId: "route1",
      },
      selectedBody: {
        pokemon: pokemon("body", "Flame"),
        locationId: "route2",
      },
      activeSlot: null,
      pokemon: pokemon("new", "Leaf"),
      locationId: "route3",
      nickname: "Custom Fusion",
      previewNickname: "Custom Fusion",
    });

    expect(selected.selectedHead?.pokemon.uid).toBe("head");
    expect(selected.selectedBody?.pokemon.uid).toBe("body");
    expect(selected.activeSlot).toBeNull();
    expect(selected.nickname).toBe("Custom Fusion");
  });
});
