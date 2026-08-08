import { performance } from "node:perf_hooks";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import "../playthroughs/mocks";

vi.mock("@/lib/analytics/selectors", () => ({
  getSharedEventProperties: () => ({}),
  getTeamSizeAfter: () => 0,
  getViableRosterSize: () => 0,
}));
vi.mock("@/lib/analytics/playthroughEventData", () => ({
  getEncounterCount: () => 0,
  getNewlyReachedCheckpoints: () => [],
  markCheckpointEventsTracked: () => undefined,
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

const ENCOUNTER_COUNT = z.coerce
  .number()
  .int()
  .min(2)
  .parse(process.env.PLAYTHROUGH_BENCHMARK_ENCOUNTER_COUNT ?? 512);
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

interface BenchmarkResult {
  cold: BenchmarkTiming;
  name: FixtureKind;
  warm: BenchmarkTiming;
}

interface BenchmarkTiming {
  p50Ms: number;
  p95Ms: number;
}

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

interface FixtureOptions {
  hasCustomLocation?: boolean;
  reverseStatus?: PokemonOptionType["status"];
  sourceOriginalLocation?: string;
  targetPokemonId?: number;
}

const fixtureOptions: Record<FixtureKind, FixtureOptions> = {
  "custom-location-remove": { hasCustomLocation: true },
  "drag-empty-target": {},
  "drag-occupied-target": { targetPokemonId: 4 },
  "encounter-clear": {},
  "encounter-evolve": {},
  "encounter-flip-fusion": {},
  "encounter-nickname-update": {},
  "encounter-overwrite": {},
  "encounter-reset": {},
  "encounter-select-empty": {},
  "encounter-status-captured": {},
  "encounter-status-deceased": {},
  "encounter-status-stored": {},
  "encounter-toggle-fusion": {},
  "move-original-empty-target": { sourceOriginalLocation: TARGET_LOCATION_ID },
  "move-original-occupied-target": {
    sourceOriginalLocation: TARGET_LOCATION_ID,
    targetPokemonId: 4,
  },
  "reverse-active": {},
  "reverse-stored": { reverseStatus: PokemonStatus.STORED },
};

const createPokemon = (
  uid: string,
  id: number,
  status: PokemonOptionType["status"] = PokemonStatus.CAPTURED,
): PokemonOptionType => ({
  id,
  name: `Pokemon ${id}`,
  nationalDexId: id,
  originalLocation: SOURCE_LOCATION_ID,
  status,
  uid,
});

const createEncounter = (
  head: PokemonOptionType | null,
  body: PokemonOptionType | null = null,
  isFusion = false,
): EncounterData => ({ body, head, isFusion, updatedAt: 1 });

function createFixture(kind: FixtureKind): Playthrough {
  const options = fixtureOptions[kind];
  const head = {
    ...createPokemon(
      "source-head",
      25,
      options.reverseStatus ?? PokemonStatus.CAPTURED,
    ),
    originalLocation: options.sourceOriginalLocation ?? SOURCE_LOCATION_ID,
  };
  const body = createPokemon(
    "source-body",
    133,
    options.reverseStatus ?? PokemonStatus.CAPTURED,
  );
  const encounters: Record<string, EncounterData> = {
    [SOURCE_LOCATION_ID]: createEncounter(head, body, true),
    [TARGET_LOCATION_ID]: createEncounter(
      options.targetPokemonId
        ? createPokemon("target-head", options.targetPokemonId)
        : null,
    ),
  };

  for (let index = 2; index < ENCOUNTER_COUNT; index += 1) {
    encounters[routeId(index)] = createEncounter(
      createPokemon(`filler-${index}`, index + 1),
    );
  }

  return {
    createdAt: 1,
    customLocations: options.hasCustomLocation
      ? [
          {
            id: "custom-location",
            insertAfterLocationId: SOURCE_LOCATION_ID,
            name: "Custom Location",
          },
        ]
      : undefined,
    encounters,
    gameMode: "randomized",
    id: "benchmark-playthrough",
    name: "Benchmark",
    team: {
      members: [
        { bodyPokemonUid: body.uid ?? "", headPokemonUid: head.uid ?? "" },
        null,
        null,
        null,
        null,
        null,
      ],
    },
    updatedAt: 1,
    version: "1.0.0",
  };
}

function installFixture(playthrough: Playthrough) {
  playthroughsStore.playthroughs = [playthrough];
  playthroughsStore.activePlaythroughId = playthrough.id;
  playthroughsStore.isLoading = false;
  playthroughsStore.isSaving = false;
}

function getSourceHeadPokemon() {
  const activePlaythrough = getActivePlaythrough();
  const pokemon = activePlaythrough?.encounters?.[SOURCE_LOCATION_ID]?.head;
  if (!pokemon) {
    throw new Error("Move-to-original benchmark fixture has no source Pokemon");
  }
  return pokemon;
}

const runFixture: Record<FixtureKind, () => Promise<unknown> | undefined> = {
  "custom-location-remove": () => removeCustomLocation("custom-location"),
  "drag-empty-target": () =>
    relocateEncounterSlot({
      sourceField: "head",
      sourceLocationId: SOURCE_LOCATION_ID,
      targetField: "head",
      targetLocationId: TARGET_LOCATION_ID,
    }),
  "drag-occupied-target": () =>
    relocateEncounterSlot({
      sourceField: "head",
      sourceLocationId: SOURCE_LOCATION_ID,
      targetField: "head",
      targetLocationId: TARGET_LOCATION_ID,
    }),
  "encounter-clear": () => updateEncounter(SOURCE_LOCATION_ID, null, "head"),
  "encounter-evolve": () =>
    updateEncounter(
      SOURCE_LOCATION_ID,
      createPokemon("source-head", 26),
      "head",
    ),
  "encounter-flip-fusion": () => flipEncounterFusion(SOURCE_LOCATION_ID),
  "encounter-nickname-update": () =>
    updatePokemonInEncounter(SOURCE_LOCATION_ID, "source-head", "head", {
      nickname: "Sparky",
    }),
  "encounter-overwrite": () =>
    updateEncounter(
      SOURCE_LOCATION_ID,
      createPokemon("replacement-pokemon", 7),
    ),
  "encounter-reset": () => resetEncounter(SOURCE_LOCATION_ID),
  "encounter-select-empty": () =>
    updateEncounter(EMPTY_LOCATION_ID, createPokemon("selected-pokemon", 7)),
  "encounter-status-captured": () =>
    markEncounterAsCaptured(SOURCE_LOCATION_ID),
  "encounter-status-deceased": () =>
    markEncounterAsDeceased(SOURCE_LOCATION_ID),
  "encounter-status-stored": () => moveEncounterToBox(SOURCE_LOCATION_ID),
  "encounter-toggle-fusion": () => toggleEncounterFusion(SOURCE_LOCATION_ID),
  "move-original-empty-target": () =>
    moveToOriginalLocation(SOURCE_LOCATION_ID, "head", getSourceHeadPokemon()),
  "move-original-occupied-target": () =>
    moveToOriginalLocation(SOURCE_LOCATION_ID, "head", getSourceHeadPokemon()),
  "reverse-active": () => flipTeamMemberFusion(0),
  "reverse-stored": () => flipTeamMemberFusion(0),
};

const warmFixture: Record<FixtureKind, () => unknown> = Object.fromEntries(
  fixtureKinds.map((kind) => [kind, () => getActivePlaythrough()]),
) as Record<FixtureKind, () => unknown>;

warmFixture["reverse-active"] = warmTeamMember;
warmFixture["reverse-stored"] = warmTeamMember;
warmFixture["custom-location-remove"] = warmCustomLocation;

function warmTeamMember() {
  const [teamMember] = getActivePlaythrough().team.members;
  if (!teamMember) {
    throw new Error("Reverse Fusion benchmark fixture has no team member");
  }
  return [teamMember.headPokemonUid, teamMember.bodyPokemonUid];
}

function warmCustomLocation() {
  return getActivePlaythrough().customLocations?.[0]?.id;
}

async function repeatSequentially(
  count: number,
  action: (index: number) => Promise<void>,
  index = 0,
): Promise<void> {
  if (index === count) {
    return;
  }

  await action(index);
  await repeatSequentially(count, action, index + 1);
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
  await repeatSequentially(WARMUP_ITERATIONS, async () => {
    installFixture(createFixture(kind));
    await runFixture[kind]();

    installFixture(createFixture(kind));
    warmFixture[kind]();
    await runFixture[kind]();
  });

  const coldSamples: number[] = [];
  const warmSamples: number[] = [];
  await repeatSequentially(SAMPLE_COUNT, async () => {
    installFixture(createFixture(kind));
    const start = performance.now();
    await runFixture[kind]();
    coldSamples.push(performance.now() - start);

    installFixture(createFixture(kind));
    warmFixture[kind]();
    const warmStart = performance.now();
    await runFixture[kind]();
    warmSamples.push(performance.now() - warmStart);
  });

  return {
    cold: summarizeSamples(coldSamples),
    name: kind,
    warm: summarizeSamples(warmSamples),
  };
}

describe("playthrough interaction hot paths", () => {
  it("reports deterministic Reverse Fusion and drag baselines", async () => {
    const results: BenchmarkResult[] = [];
    await repeatSequentially(fixtureKinds.length, async (index) => {
      const kind = fixtureKinds[index];
      if (!kind) {
        throw new Error("Benchmark fixture kind is missing");
      }
      results.push(await benchmarkFixture(kind));
    });

    console.info(
      JSON.stringify(
        {
          encounterCount: ENCOUNTER_COUNT,
          results,
          sampleCount: SAMPLE_COUNT,
        },
        null,
        2,
      ),
    );
    expect(results).toHaveLength(fixtureKinds.length);
  }, 120_000);
});
