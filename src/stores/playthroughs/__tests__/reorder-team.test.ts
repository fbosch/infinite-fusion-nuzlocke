import { describe, expect, it } from "vitest";
import { reorderTeam } from "../store";
import {
  createTestPlaythrough,
  expectTeamMember,
  resetPlaythroughsStore,
} from "./test-utils";

describe("reorderTeam", () => {
  resetPlaythroughsStore();

  it("returns false when no active playthrough exists", () => {
    const result = reorderTeam(0, 1);
    expect(result).toBe(false);
  });

  it("returns false for invalid fromPosition (< 0)", () => {
    createTestPlaythrough();
    expect(reorderTeam(-1, 0)).toBe(false);
  });

  it("returns false for invalid fromPosition (>= 6)", () => {
    createTestPlaythrough();
    expect(reorderTeam(6, 0)).toBe(false);
  });

  it("returns false for invalid toPosition (< 0)", () => {
    createTestPlaythrough();
    expect(reorderTeam(0, -1)).toBe(false);
  });

  it("returns false for invalid toPosition (>= 6)", () => {
    createTestPlaythrough();
    expect(reorderTeam(0, 6)).toBe(false);
  });

  it("returns false when source position is empty", () => {
    createTestPlaythrough();
    expect(reorderTeam(0, 1)).toBe(false);
  });

  it("returns true (no-op) when fromPosition equals toPosition", () => {
    const { activePlaythrough } = createTestPlaythrough();
    activePlaythrough.team.members[0] = {
      headPokemonUid: "pikachu_uid",
      bodyPokemonUid: "",
    };
    expect(reorderTeam(0, 0)).toBe(true);
    expectTeamMember(activePlaythrough.team.members[0], "pikachu_uid");
  });

  it("moves a team member to an empty slot", () => {
    const { activePlaythrough } = createTestPlaythrough();
    activePlaythrough.team.members[0] = {
      headPokemonUid: "pikachu_uid",
      bodyPokemonUid: "",
    };

    const result = reorderTeam(0, 3);

    expect(result).toBe(true);
    expectTeamMember(activePlaythrough.team.members[0], null);
    expectTeamMember(activePlaythrough.team.members[3], "pikachu_uid");
  });

  it("swaps two occupied slots", () => {
    const { activePlaythrough } = createTestPlaythrough();
    activePlaythrough.team.members[0] = {
      headPokemonUid: "pikachu_uid",
      bodyPokemonUid: "",
    };
    activePlaythrough.team.members[2] = {
      headPokemonUid: "charmander_uid",
      bodyPokemonUid: "bulbasaur_uid",
    };

    const result = reorderTeam(0, 2);

    expect(result).toBe(true);
    expectTeamMember(
      activePlaythrough.team.members[0],
      "charmander_uid",
      "bulbasaur_uid",
    );
    expectTeamMember(activePlaythrough.team.members[2], "pikachu_uid");
  });

  it("updates the playthrough timestamp on move", () => {
    const { activePlaythrough } = createTestPlaythrough();
    activePlaythrough.team.members[1] = {
      headPokemonUid: "squirtle_uid",
      bodyPokemonUid: "",
    };
    const before = activePlaythrough.updatedAt;

    reorderTeam(1, 4);

    expect(activePlaythrough.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it("updates the playthrough timestamp on swap", () => {
    const { activePlaythrough } = createTestPlaythrough();
    activePlaythrough.team.members[0] = {
      headPokemonUid: "pikachu_uid",
      bodyPokemonUid: "",
    };
    activePlaythrough.team.members[5] = {
      headPokemonUid: "eevee_uid",
      bodyPokemonUid: "",
    };
    const before = activePlaythrough.updatedAt;

    reorderTeam(0, 5);

    expect(activePlaythrough.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it("does not change slot ordering on same-slot no-op", () => {
    const { activePlaythrough } = createTestPlaythrough();
    activePlaythrough.team.members[2] = {
      headPokemonUid: "snorlax_uid",
      bodyPokemonUid: "gengar_uid",
    };
    const before = activePlaythrough.updatedAt;

    const result = reorderTeam(2, 2);

    expect(result).toBe(true);
    // timestamp unchanged for no-op
    expect(activePlaythrough.updatedAt).toBe(before);
    expectTeamMember(
      activePlaythrough.team.members[2],
      "snorlax_uid",
      "gengar_uid",
    );
  });
});
