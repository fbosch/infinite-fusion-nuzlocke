import { beforeEach, describe, expect, it, vi } from "vitest";
import { PokemonStatus } from "@/loaders/pokemon";
import {
  createFusion,
  markEncounterAsDeceased,
  moveEncounterAtomic,
  updateEncounter,
} from "../encounters";
import { createPlaythrough, playthroughsStore } from "../store";
import {
  createTestPlaythrough,
  resetPlaythroughsStore,
  testPokemon,
} from "./test-utils";

const analyticsMocks = vi.hoisted(() => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/analytics/trackEvent", () => ({
  trackEvent: analyticsMocks.trackEvent,
}));

const getTrackedEvents = (eventName: string) => {
  return analyticsMocks.trackEvent.mock.calls.filter(
    (call) => call[0] === eventName,
  );
};

describe("analytics event instrumentation", () => {
  resetPlaythroughsStore();

  beforeEach(() => {
    analyticsMocks.trackEvent.mockReset();
    analyticsMocks.trackEvent.mockReturnValue(true);
    localStorage.clear();
    sessionStorage.clear();
  });

  it("tracks playthrough_created with existing-run flag", () => {
    createPlaythrough("First Run");
    createPlaythrough("Second Run");

    const createdEvents = getTrackedEvents("playthrough_created");
    expect(createdEvents).toHaveLength(2);
    expect(createdEvents[0]?.[1]).toMatchObject({
      has_existing_playthroughs: false,
    });
    expect(createdEvents[1]?.[1]).toMatchObject({
      has_existing_playthroughs: true,
    });
  });

  it("tracks run checkpoints once per threshold", async () => {
    createTestPlaythrough();
    analyticsMocks.trackEvent.mockClear();

    await updateEncounter("route1", testPokemon.pikachu("p-1"), "head", false);
    await updateEncounter("route2", testPokemon.pikachu("p-2"), "head", false);
    await updateEncounter("route3", testPokemon.pikachu("p-3"), "head", false);
    await updateEncounter("route4", testPokemon.pikachu("p-4"), "head", false);
    await updateEncounter("route5", testPokemon.pikachu("p-5"), "head", false);
    await updateEncounter(
      "route5",
      testPokemon.charmander("p-5b"),
      "head",
      false,
    );

    const checkpointEvents = getTrackedEvents("run_checkpoint_reached");
    expect(checkpointEvents).toHaveLength(2);
    expect(checkpointEvents[0]?.[1]).toMatchObject({
      checkpoint: 1,
      checkpoint_label: "cp_1",
    });
    expect(checkpointEvents[1]?.[1]).toMatchObject({
      checkpoint: 5,
      checkpoint_label: "cp_5",
    });
  });

  it("tracks fusion_created for update, create, and drag-drop transitions", async () => {
    createTestPlaythrough();
    analyticsMocks.trackEvent.mockClear();

    await updateEncounter(
      "route1",
      testPokemon.pikachu("f-1-head"),
      "head",
      false,
    );
    await updateEncounter(
      "route1",
      testPokemon.charmander("f-1-body"),
      "body",
      true,
    );

    await createFusion(
      "route2",
      testPokemon.pikachu("f-2-head"),
      testPokemon.charmander("f-2-body"),
    );

    await updateEncounter(
      "route3",
      testPokemon.squirtle("f-3-source"),
      "head",
      false,
    );
    await updateEncounter(
      "route4",
      testPokemon.abra("f-4-head"),
      "head",
      false,
    );
    analyticsMocks.trackEvent.mockClear();

    const sourcePokemon =
      playthroughsStore.playthroughs[0]?.encounters?.route3?.head;
    expect(sourcePokemon).toBeDefined();

    await moveEncounterAtomic(
      "route3",
      "head",
      "route4",
      "body",
      sourcePokemon!,
    );

    const fusionCreatedEvents = getTrackedEvents("fusion_created");
    expect(fusionCreatedEvents).toHaveLength(1);
    expect(fusionCreatedEvents[0]?.[1]).toMatchObject({
      creation_method: "drag_drop",
      location_id: "route4",
    });
  });

  it("tracks encounter_marked_deceased only on transition", async () => {
    createTestPlaythrough();
    analyticsMocks.trackEvent.mockClear();

    await updateEncounter(
      "route1",
      { ...testPokemon.pikachu("d-1-head"), status: PokemonStatus.CAPTURED },
      "head",
      false,
    );
    await updateEncounter(
      "route1",
      { ...testPokemon.charmander("d-1-body"), status: PokemonStatus.CAPTURED },
      "body",
      true,
    );

    analyticsMocks.trackEvent.mockClear();

    await markEncounterAsDeceased("route1");
    await markEncounterAsDeceased("route1");

    const deceasedEvents = getTrackedEvents("encounter_marked_deceased");
    expect(deceasedEvents).toHaveLength(1);
    expect(deceasedEvents[0]?.[1]).toMatchObject({
      location_id: "route1",
      was_fused: true,
    });
  });
});
