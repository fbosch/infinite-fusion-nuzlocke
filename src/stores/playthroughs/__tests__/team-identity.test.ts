import { describe, expect, it } from "vitest";
import {
  findCanonicalLocationForUids,
  getTeamMemberUids,
} from "../encounters/team";
import {
  createTestPlaythrough,
  resetPlaythroughsStore,
  testPokemon,
} from "./test-utils";

describe("Team identity helpers", () => {
  resetPlaythroughsStore();

  it("returns team member UIDs by slot identity", () => {
    const { activePlaythrough } = createTestPlaythrough();

    activePlaythrough.team.members[1] = {
      headPokemonUid: "pikachu_route1_123",
      bodyPokemonUid: "charmander_route1_456",
    };

    expect(getTeamMemberUids(1)).toEqual([
      "pikachu_route1_123",
      "charmander_route1_456",
    ]);
    expect(getTeamMemberUids(-1)).toEqual([]);
    expect(getTeamMemberUids(6)).toEqual([]);
    expect(getTeamMemberUids(0)).toEqual([]);
  });

  it("resolves canonical encounter location for a unique UID set", () => {
    const { activePlaythrough } = createTestPlaythrough();

    activePlaythrough.encounters = {
      route1: {
        head: testPokemon.pikachu("pikachu_route1_123"),
        body: testPokemon.charmander("charmander_route1_456"),
        isFusion: true,
        updatedAt: Date.now(),
      },
      route2: {
        head: testPokemon.squirtle("squirtle_route2_789"),
        body: null,
        isFusion: false,
        updatedAt: Date.now(),
      },
    };

    expect(
      findCanonicalLocationForUids([
        "pikachu_route1_123",
        "charmander_route1_456",
      ]),
    ).toBe("route1");
  });

  it("returns null when UID set matches multiple encounters", () => {
    const { activePlaythrough } = createTestPlaythrough();

    activePlaythrough.encounters = {
      route1: {
        head: testPokemon.pikachu("shared_uid"),
        body: null,
        isFusion: false,
        updatedAt: Date.now(),
      },
      route2: {
        head: testPokemon.charmander("shared_uid"),
        body: null,
        isFusion: false,
        updatedAt: Date.now(),
      },
    };

    expect(findCanonicalLocationForUids(["shared_uid"])).toBeNull();
  });
});
