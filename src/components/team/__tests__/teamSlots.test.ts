import { describe, expect, it, vi } from "vitest";
import { buildPokemonUidIndex } from "@/utils/encounter-utils";
import { getTeamSlots } from "../team-slots";

vi.mock("@/loaders/locations", () => ({
  getLocationById: (id: string) => (id ? { name: `Location ${id}` } : null),
}));

const headPokemon = {
  id: 25,
  name: "Pikachu",
  nationalDexId: 25,
  originalLocation: "route-1",
  uid: "head-uid",
};

const bodyPokemon = {
  id: 133,
  name: "Eevee",
  nationalDexId: 133,
  originalLocation: "route-2",
  uid: "body-uid",
};

describe("getTeamSlots", () => {
  it("resolves members by UID and leaves missing references in their UI slot", () => {
    const encounters = {
      "route-1": {
        body: null,
        head: headPokemon,
        isFusion: false,
        updatedAt: 0,
      },
      "route-2": {
        body: bodyPokemon,
        head: null,
        isFusion: false,
        updatedAt: 0,
      },
    };

    const slots = getTeamSlots(
      [
        { bodyPokemonUid: "body-uid", headPokemonUid: "head-uid" },
        { bodyPokemonUid: "", headPokemonUid: "missing-uid" },
        null,
      ],
      encounters,
      buildPokemonUidIndex(encounters),
    );

    expect(slots).toMatchObject([
      {
        bodyPokemon,
        headPokemon,
        isEmpty: false,
        isFusion: true,
        locationName: "Location route-1",
        position: 0,
      },
      {
        bodyPokemon: null,
        headPokemon: null,
        isEmpty: false,
        isFusion: false,
        position: 1,
      },
      {
        bodyPokemon: null,
        headPokemon: null,
        isEmpty: true,
        isFusion: false,
        locationName: "Team Slot 3",
        position: 2,
      },
    ]);
  });
});
