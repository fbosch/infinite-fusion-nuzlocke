import { describe, expect, it, vi } from "vitest";
import { buildPokemonUidIndex } from "@/utils/encounter-utils";
import { getTeamSlots } from "../team-slots";

vi.mock("@/loaders/locations", () => ({
  getLocationById: (id: string) => (id ? { name: `Location ${id}` } : null),
}));

const headPokemon = {
  id: 25,
  name: "Pikachu",
  uid: "head-uid",
  nationalDexId: 25,
  originalLocation: "route-1",
};

const bodyPokemon = {
  id: 133,
  name: "Eevee",
  uid: "body-uid",
  nationalDexId: 133,
  originalLocation: "route-2",
};

describe("getTeamSlots", () => {
  it("resolves members by UID and leaves missing references in their UI slot", () => {
    const encounters = {
      "route-1": {
        head: headPokemon,
        body: null,
        isFusion: false,
        updatedAt: 0,
      },
      "route-2": {
        head: null,
        body: bodyPokemon,
        isFusion: false,
        updatedAt: 0,
      },
    };

    const slots = getTeamSlots(
      [
        { headPokemonUid: "head-uid", bodyPokemonUid: "body-uid" },
        { headPokemonUid: "missing-uid", bodyPokemonUid: "" },
        null,
      ],
      encounters,
      buildPokemonUidIndex(encounters),
    );

    expect(slots).toMatchObject([
      {
        position: 0,
        isEmpty: false,
        locationName: "Location route-1",
        headPokemon,
        bodyPokemon,
        isFusion: true,
      },
      {
        position: 1,
        isEmpty: false,
        headPokemon: null,
        bodyPokemon: null,
        isFusion: false,
      },
      {
        position: 2,
        isEmpty: true,
        locationName: "Team Slot 3",
        headPokemon: null,
        bodyPokemon: null,
        isFusion: false,
      },
    ]);
  });
});
