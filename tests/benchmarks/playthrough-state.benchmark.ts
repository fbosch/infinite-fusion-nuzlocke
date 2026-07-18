import { performance } from "node:perf_hooks";
import { describe, expect, it, vi } from "vitest";
import "../playthroughs/mocks";

vi.mock("@/lib/analytics/selectors", () => ({
  getSharedEventProperties: () => ({}),
  getTeamSizeAfter: () => 0,
  getViableRosterSize: () => 0,
}));
vi.mock("@/lib/analytics/playthroughEventData", () => ({
  getEncounterCount: () => 0,
  getNewlyReachedCheckpoints: () => [],
  markCheckpointEventsTracked: () => {},
}));
vi.mock("@/lib/analytics/trackEvent", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/events", () => ({ emitEvolutionEvent: vi.fn() }));

import { type PokemonOptionType, PokemonStatus } from "@/loaders/pokemon";
import { removeCustomLocation } from "@/stores/playthroughs/customLocations";
import {
  flipEncounterFusion,
  markEncounterAsCaptured,
  markEncounterAsDeceased,
  moveEncounterToBox,
  moveToOriginalLocation,
  relocateEncounterSlot,
  resetEncounter,
  toggleEncounterFusion,
  updateEncounter,
  updatePokemonInEncounter,
} from "@/stores/playthroughs/encounters";
import { flipTeamMemberFusion } from "@/stores/playthroughs/encounters/teamActions";
import { getActivePlaythrough } from "@/stores/playthroughs/playthroughState";
import { playthroughsStore } from "@/stores/playthroughs/store";
import type { EncounterData, Playthrough } from "@/stores/playthroughs/types";

const ENCOUNTER_COUNT = Number(
  process.env.PLAYTHROUGH_BENCHMARK_ENCOUNTER_COUNT ?? 512,
);
const WARMUP_ITERATIONS = 10;
const SAMPLE_COUNT = 30;

type FixtureKind =
  | "reverse-active"
  | "reverse-stored"
  | "encounter-select-empty"
  | "encounter-overwrite"
  | "encounter-clear"
  | "encounter-nickname-update"
  | "encounter-status-captured"
  | "encounter-status-deceased"
  | "encounter-status-stored"
  | "encounter-toggle-fusion"
  | "encounter-flip-fusion"
  | "encounter-evolve"
  | "encounter-reset"
  | "move-original-empty-target"
  | "move-original-occupied-target"
  | "drag-empty-target"
  | "drag-occupied-target"
  | "custom-location-remove";

type BenchmarkResult = {
  name: FixtureKind;
  cold: BenchmarkTiming;
  warm: BenchmarkTiming;
};

type BenchmarkTiming = {
  p50Ms: number;
  p95Ms: number;
};

const routeId = (index: number) => `route-${index.toString().padStart(4, "0")}`;
const SOURCE_LOCATION_ID = routeId(0);
const TARGET_LOCATION_ID = routeId(1);
const EMPTY_LOCATION_ID = routeId(ENCOUNTER_COUNT);

const fixtureKinds: FixtureKind[] = [
  "reverse-active",
  "reverse-stored",
  "encounter-select-empty",
  "encounter-overwrite",
  "encounter-clear",
  "encounter-nickname-update",
  "encounter-status-captured",
  "encounter-status-deceased",
  "encounter-status-stored",
  "encounter-toggle-fusion",
  "encounter-flip-fusion",
  "encounter-evolve",
  "encounter-reset",
  "move-original-empty-target",
  "move-original-occupied-target",
  "drag-empty-target",
  "drag-occupied-target",
  "custom-location-remove",
];

const createPokemon = (
  uid: string,
  id: number,
  status: PokemonOptionType["status"] = PokemonStatus.CAPTURED,
): PokemonOptionType => ({
  id,
  name: `Pokemon ${id}`,
  nationalDexId: id,
  uid,
  status,
  originalLocation: SOURCE_LOCATION_ID,
});

const createEncounter = (
  head: PokemonOptionType | null,
  body: PokemonOptionType | null = null,
  isFusion = false,
): EncounterData => ({ head, body, isFusion, updatedAt: 1 });

function createFixture(kind: FixtureKind): Playthrough {
  const reverseStatus =
    kind === "reverse-stored" ? PokemonStatus.STORED : PokemonStatus.CAPTURED;
  const head = {
    ...createPokemon("source-head", 25, reverseStatus),
    originalLocation:
      kind === "move-original-empty-target" ||
      kind === "move-original-occupied-target"
        ? TARGET_LOCATION_ID
        : SOURCE_LOCATION_ID,
  };
  const body = createPokemon("source-body", 133, reverseStatus);
  const encounters: Record<string, EncounterData> = {
    [SOURCE_LOCATION_ID]: createEncounter(head, body, true),
    [TARGET_LOCATION_ID]: createEncounter(
      kind === "drag-occupied-target" ||
        kind === "move-original-occupied-target"
        ? createPokemon("target-head", 4)
        : null,
    ),
  };

  for (let index = 2; index < ENCOUNTER_COUNT; index += 1) {
    encounters[routeId(index)] = createEncounter(
      createPokemon(`filler-${index}`, index + 1),
    );
  }

  return {
    id: "benchmark-playthrough",
    name: "Benchmark",
    encounters,
    team: {
      members: [
        { headPokemonUid: head.uid ?? "", bodyPokemonUid: body.uid ?? "" },
        null,
        null,
        null,
        null,
        null,
      ],
    },
    gameMode: "randomized",
    version: "1.0.0",
    createdAt: 1,
    updatedAt: 1,
    customLocations:
      kind === "custom-location-remove"
        ? [
            {
              id: "custom-location",
              name: "Custom Location",
              insertAfterLocationId: SOURCE_LOCATION_ID,
            },
          ]
        : undefined,
  };
}

function installFixture(playthrough: Playthrough) {
  playthroughsStore.playthroughs = [playthrough];
  playthroughsStore.activePlaythroughId = playthrough.id;
  playthroughsStore.isLoading = false;
  playthroughsStore.isSaving = false;
}

async function runFixture(kind: FixtureKind) {
  switch (kind) {
    case "reverse-active":
    case "reverse-stored":
      await flipTeamMemberFusion(0);
      return;
    case "encounter-select-empty":
      await updateEncounter(
        EMPTY_LOCATION_ID,
        createPokemon("selected-pokemon", 7),
      );
      return;
    case "encounter-overwrite":
      await updateEncounter(
        SOURCE_LOCATION_ID,
        createPokemon("replacement-pokemon", 7),
      );
      return;
    case "encounter-clear":
      await updateEncounter(SOURCE_LOCATION_ID, null, "head");
      return;
    case "encounter-nickname-update":
      await updatePokemonInEncounter(
        SOURCE_LOCATION_ID,
        "source-head",
        "head",
        { nickname: "Sparky" },
      );
      return;
    case "encounter-status-captured":
      await markEncounterAsCaptured(SOURCE_LOCATION_ID);
      return;
    case "encounter-status-deceased":
      await markEncounterAsDeceased(SOURCE_LOCATION_ID);
      return;
    case "encounter-status-stored":
      await moveEncounterToBox(SOURCE_LOCATION_ID);
      return;
    case "encounter-toggle-fusion":
      await toggleEncounterFusion(SOURCE_LOCATION_ID);
      return;
    case "encounter-flip-fusion":
      await flipEncounterFusion(SOURCE_LOCATION_ID);
      return;
    case "encounter-evolve":
      await updateEncounter(
        SOURCE_LOCATION_ID,
        createPokemon("source-head", 26),
        "head",
      );
      return;
    case "encounter-reset":
      resetEncounter(SOURCE_LOCATION_ID);
      return;
    case "move-original-empty-target":
    case "move-original-occupied-target": {
      const pokemon =
        getActivePlaythrough()?.encounters?.[SOURCE_LOCATION_ID]?.head;
      if (!pokemon) {
        throw new Error(
          "Move-to-original benchmark fixture has no source Pokemon",
        );
      }

      await moveToOriginalLocation(SOURCE_LOCATION_ID, "head", pokemon);
      return;
    }
    case "drag-empty-target":
    case "drag-occupied-target":
      await relocateEncounterSlot({
        sourceLocationId: SOURCE_LOCATION_ID,
        sourceField: "head",
        targetLocationId: TARGET_LOCATION_ID,
        targetField: "head",
      });
      return;
    case "custom-location-remove":
      await removeCustomLocation("custom-location");
      return;
  }
}

function warmFixture(kind: FixtureKind) {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) {
    throw new Error("Benchmark fixture has no active playthrough");
  }

  if (kind === "reverse-active" || kind === "reverse-stored") {
    const teamMember = activePlaythrough.team.members[0];
    if (!teamMember) {
      throw new Error("Reverse Fusion benchmark fixture has no team member");
    }

    void teamMember.headPokemonUid;
    void teamMember.bodyPokemonUid;
    return;
  }

  if (kind === "custom-location-remove") {
    void activePlaythrough.customLocations?.[0]?.id;
    return;
  }

  const encounters = activePlaythrough.encounters;
  if (!encounters) {
    throw new Error("Drag benchmark fixture has no encounters");
  }

  void encounters[SOURCE_LOCATION_ID]?.head?.uid;
  void encounters[TARGET_LOCATION_ID]?.head?.uid;
}

function percentile(values: number[], percentileValue: number) {
  const index = Math.ceil(values.length * percentileValue) - 1;
  return values[index] ?? 0;
}

function summarizeSamples(samples: number[]): BenchmarkTiming {
  samples.sort((left, right) => left - right);
  return {
    p50Ms: percentile(samples, 0.5),
    p95Ms: percentile(samples, 0.95),
  };
}

async function benchmarkFixture(kind: FixtureKind): Promise<BenchmarkResult> {
  for (let index = 0; index < WARMUP_ITERATIONS; index += 1) {
    installFixture(createFixture(kind));
    await runFixture(kind);

    installFixture(createFixture(kind));
    warmFixture(kind);
    await runFixture(kind);
  }

  const coldSamples: number[] = [];
  const warmSamples: number[] = [];
  for (let sample = 0; sample < SAMPLE_COUNT; sample += 1) {
    installFixture(createFixture(kind));
    const start = performance.now();
    await runFixture(kind);
    coldSamples.push(performance.now() - start);

    installFixture(createFixture(kind));
    warmFixture(kind);
    const warmStart = performance.now();
    await runFixture(kind);
    warmSamples.push(performance.now() - warmStart);
  }

  return {
    name: kind,
    cold: summarizeSamples(coldSamples),
    warm: summarizeSamples(warmSamples),
  };
}

describe("playthrough interaction hot paths", () => {
  it("reports deterministic Reverse Fusion and drag baselines", async () => {
    const results: BenchmarkResult[] = [];
    for (const kind of fixtureKinds) {
      results.push(await benchmarkFixture(kind));
    }

    console.info(
      JSON.stringify(
        {
          encounterCount: ENCOUNTER_COUNT,
          sampleCount: SAMPLE_COUNT,
          results,
        },
        null,
        2,
      ),
    );
    expect(results).toHaveLength(fixtureKinds.length);
  }, 120_000);
});
