import { beforeEach, describe, expect, it, vi } from "vitest";
import { PokemonStatus } from "@/loaders/pokemon";
import {
  createFusion,
  flipEncounterFusion,
  flipTeamMemberFusion,
  markEncounterAsDeceased,
  markTeamMemberAsDeceased,
  moveEncounterAtomic,
  updateEncounter,
  updateTeamMember,
} from "../encounters";
import {
  createPlaythrough,
  cycleGameMode,
  playthroughsStore,
  setActivePlaythrough,
  setGameMode,
  setRemixMode,
  toggleRemixMode,
} from "../store";
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

  it("tracks game_mode_changed only on real transitions", () => {
    const { activePlaythrough } = createTestPlaythrough();
    activePlaythrough.gameMode = "classic";
    analyticsMocks.trackEvent.mockClear();

    setGameMode("classic");
    setGameMode("remix");
    setRemixMode(true);
    toggleRemixMode();
    cycleGameMode();

    const modeEvents = getTrackedEvents("game_mode_changed");
    expect(modeEvents).toHaveLength(3);
    expect(modeEvents[0]?.[1]).toMatchObject({
      game_mode: "remix",
      previous_game_mode: "classic",
      new_game_mode: "remix",
      source_surface: "store",
      trigger_method: "programmatic",
    });
    expect(modeEvents[1]?.[1]).toMatchObject({
      game_mode: "classic",
      previous_game_mode: "remix",
      new_game_mode: "classic",
      source_surface: "store",
      trigger_method: "programmatic",
    });
    expect(modeEvents[2]?.[1]).toMatchObject({
      game_mode: "remix",
      previous_game_mode: "classic",
      new_game_mode: "remix",
      source_surface: "store",
      trigger_method: "programmatic",
    });
  });

  it("tracks active playthrough switching with canonical transition fields", async () => {
    const firstId = createPlaythrough("First Run", "classic");
    const secondId = createPlaythrough("Second Run", "remix");
    playthroughsStore.activePlaythroughId = firstId;
    analyticsMocks.trackEvent.mockClear();

    await setActivePlaythrough(secondId, {
      source_surface: "playthrough_selector",
      trigger_method: "keyboard",
    });

    const switchedEvents = getTrackedEvents("playthrough_switched");
    expect(switchedEvents).toHaveLength(1);
    expect(switchedEvents[0]?.[1]).toMatchObject({
      playthrough_id: secondId,
      game_mode: "remix",
      previous_playthrough_id: firstId,
      new_playthrough_id: secondId,
      source_surface: "playthrough_selector",
      trigger_method: "keyboard",
    });
  });

  it("does not track active playthrough switching no-ops", async () => {
    const firstId = createPlaythrough("First Run");
    playthroughsStore.activePlaythroughId = firstId;
    analyticsMocks.trackEvent.mockClear();

    await setActivePlaythrough(firstId);
    await setActivePlaythrough("missing-playthrough");

    expect(getTrackedEvents("playthrough_switched")).toHaveLength(0);
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

    const firstEncounterEvents = getTrackedEvents("first_encounter_saved");
    expect(firstEncounterEvents).toHaveLength(1);
    expect(firstEncounterEvents[0]?.[1]).toMatchObject({
      location_id: "route1",
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

  it("tracks first encounter when a fusion creates the first saved encounter", async () => {
    createTestPlaythrough();
    analyticsMocks.trackEvent.mockClear();

    await createFusion(
      "route1",
      testPokemon.pikachu("first-fusion-head"),
      testPokemon.charmander("first-fusion-body"),
    );

    const firstEncounterEvents = getTrackedEvents("first_encounter_saved");
    expect(firstEncounterEvents).toHaveLength(1);
    expect(firstEncounterEvents[0]?.[1]).toMatchObject({
      location_id: "route1",
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

  it("uses canonical deceased emit semantics from team context flow", async () => {
    createTestPlaythrough();

    await updateEncounter(
      "route1",
      { ...testPokemon.pikachu("tm-1-head"), status: PokemonStatus.CAPTURED },
      "head",
      false,
    );
    await updateEncounter(
      "route1",
      {
        ...testPokemon.charmander("tm-1-body"),
        status: PokemonStatus.CAPTURED,
      },
      "body",
      true,
    );
    await updateTeamMember(0, { uid: "tm-1-head" }, { uid: "tm-1-body" });

    analyticsMocks.trackEvent.mockClear();

    await markTeamMemberAsDeceased(0);

    const deceasedEvents = getTrackedEvents("encounter_marked_deceased");
    expect(deceasedEvents).toHaveLength(1);
    expect(deceasedEvents[0]?.[1]).toMatchObject({
      location_id: "route1",
      was_fused: true,
    });

    expect(playthroughsStore.playthroughs[0]?.team.members[0]).toBeNull();
  });

  it("does not mark non-team partner as deceased for single-uid team slot", async () => {
    createTestPlaythrough();

    await updateEncounter(
      "route1",
      { ...testPokemon.pikachu("solo-head"), status: PokemonStatus.CAPTURED },
      "head",
      false,
    );
    await updateEncounter(
      "route1",
      {
        ...testPokemon.charmander("solo-body"),
        status: PokemonStatus.CAPTURED,
      },
      "body",
      true,
    );
    await updateTeamMember(0, { uid: "solo-head" }, null);

    analyticsMocks.trackEvent.mockClear();

    await markTeamMemberAsDeceased(0);

    const deceasedEvents = getTrackedEvents("encounter_marked_deceased");
    expect(deceasedEvents).toHaveLength(0);

    const encounter = playthroughsStore.playthroughs[0]?.encounters?.route1;
    expect(encounter?.head?.status).toBe(PokemonStatus.DECEASED);
    expect(encounter?.body?.status).toBe(PokemonStatus.CAPTURED);
    expect(playthroughsStore.playthroughs[0]?.team.members[0]).toBeNull();
  });

  it("keeps fusion_flipped semantics equivalent across table and team flows", async () => {
    createTestPlaythrough();

    await updateEncounter(
      "route1",
      testPokemon.pikachu("flip-1-head"),
      "head",
      false,
    );
    await updateEncounter(
      "route1",
      testPokemon.charmander("flip-1-body"),
      "body",
      true,
    );

    analyticsMocks.trackEvent.mockClear();
    await flipEncounterFusion("route1");

    const tableFlowEvents = getTrackedEvents("fusion_flipped");
    expect(tableFlowEvents).toHaveLength(1);
    expect(tableFlowEvents[0]?.[1]).toMatchObject({ location_id: "route1" });

    await updateTeamMember(0, { uid: "flip-1-body" }, { uid: "flip-1-head" });

    analyticsMocks.trackEvent.mockClear();
    await flipTeamMemberFusion(0);

    const teamFlowEvents = getTrackedEvents("fusion_flipped");
    expect(teamFlowEvents).toHaveLength(1);
    expect(teamFlowEvents[0]?.[1]).toMatchObject({ location_id: "route1" });
    expect(playthroughsStore.playthroughs[0]?.team.members[0]).toMatchObject({
      headPokemonUid: "flip-1-head",
      bodyPokemonUid: "flip-1-body",
    });
  });
});
