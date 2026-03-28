import { describe, expect, it } from "vitest";
import {
  getLocationFromComboboxId,
  moveEncounter,
  moveEncounterAtomic,
  swapEncounters,
  updateEncounter,
} from "../encounters";
import {
  createTestPlaythrough,
  expectTeamMember,
  resetPlaythroughsStore,
  testPokemon,
} from "./test-utils";

describe("Encounter drag/drop operations", () => {
  resetPlaythroughsStore();

  it("preserves team membership during atomic relocation", async () => {
    const { activePlaythrough } = createTestPlaythrough();
    const pikachu = testPokemon.pikachu();

    await updateEncounter("route1", pikachu, "head", false);
    expectTeamMember(activePlaythrough.team.members[0], "pikachu_route1_123");

    await moveEncounterAtomic("route1", "head", "route2", "head", pikachu);

    expectTeamMember(activePlaythrough.team.members[0], "pikachu_route1_123");
    expect(activePlaythrough.encounters?.route1).toBeUndefined();
    expect(activePlaythrough.encounters?.route2?.head?.uid).toBe(
      "pikachu_route1_123",
    );
  });

  it("swaps instead of dropping when destination slot is occupied", async () => {
    const { activePlaythrough } = createTestPlaythrough();
    const pikachu = testPokemon.pikachu();
    const charmander = testPokemon.charmander("charmander_route2_456");

    await updateEncounter("route1", pikachu, "head", false);
    await updateEncounter("route2", charmander, "head", false);

    await moveEncounter("route1", "route2", pikachu, "head");

    expect(activePlaythrough.encounters?.route1?.head?.uid).toBe(
      "charmander_route2_456",
    );
    expect(activePlaythrough.encounters?.route2?.head?.uid).toBe(
      "pikachu_route1_123",
    );
  });

  it("uses source locations as originalLocation fallback in swaps", async () => {
    const { activePlaythrough } = createTestPlaythrough();

    activePlaythrough.encounters = {
      route1: {
        head: {
          id: 25,
          name: "Pikachu",
          nationalDexId: 25,
          uid: "pikachu_no_origin",
        },
        body: null,
        isFusion: false,
        updatedAt: Date.now(),
      },
      route2: {
        head: {
          id: 4,
          name: "Charmander",
          nationalDexId: 4,
          uid: "charmander_no_origin",
        },
        body: null,
        isFusion: false,
        updatedAt: Date.now(),
      },
    };

    await swapEncounters("route1", "route2", "head", "head");

    expect(activePlaythrough.encounters.route1?.head?.originalLocation).toBe(
      "route2",
    );
    expect(activePlaythrough.encounters.route2?.head?.originalLocation).toBe(
      "route1",
    );
  });

  it("parses combobox ids by trimming only trailing suffix", () => {
    expect(getLocationFromComboboxId("dragon-head-cave-head")).toEqual({
      locationId: "dragon-head-cave",
      field: "head",
    });
    expect(getLocationFromComboboxId("dragon-body-cave-body")).toEqual({
      locationId: "dragon-body-cave",
      field: "body",
    });
    expect(getLocationFromComboboxId("dragon-single-cave-single")).toEqual({
      locationId: "dragon-single-cave",
      field: "head",
    });
  });
});
