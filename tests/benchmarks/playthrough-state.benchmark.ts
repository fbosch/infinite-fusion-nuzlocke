import { performance } from "node:perf_hooks";
import { describe, expect, it, vi } from "vitest";
import "../playthroughs/mocks";

vi.mock("@/lib/analytics/selectors", () => ({
  getSharedEventProperties: () => ({}),
}));
vi.mock("@/lib/analytics/trackEvent", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/events", () => ({ emitEvolutionEvent: vi.fn() }));

import { type PokemonOptionType, PokemonStatus } from "@/loaders/pokemon";
import { relocateEncounterSlot } from "@/stores/playthroughs/encounters/dragDrop";
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
  | "drag-empty-target"
  | "drag-occupied-target";

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
  originalLocation: routeId(0),
});

const createEncounter = (
  head: PokemonOptionType | null,
  body: PokemonOptionType | null = null,
  isFusion = false,
): EncounterData => ({ head, body, isFusion, updatedAt: 1 });

function createFixture(kind: FixtureKind): Playthrough {
  const reverseStatus =
    kind === "reverse-stored" ? PokemonStatus.STORED : PokemonStatus.CAPTURED;
  const head = createPokemon("source-head", 25, reverseStatus);
  const body = createPokemon("source-body", 133, reverseStatus);
  const encounters: Record<string, EncounterData> = {
    [routeId(0)]: createEncounter(head, body, true),
    [routeId(1)]: createEncounter(
      kind === "drag-occupied-target" ? createPokemon("target-head", 4) : null,
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
  };
}

function installFixture(playthrough: Playthrough) {
  playthroughsStore.playthroughs = [playthrough];
  playthroughsStore.activePlaythroughId = playthrough.id;
  playthroughsStore.isLoading = false;
  playthroughsStore.isSaving = false;
}

async function runFixture(kind: FixtureKind) {
  if (kind === "reverse-active" || kind === "reverse-stored") {
    await flipTeamMemberFusion(0);
    return;
  }

  await relocateEncounterSlot({
    sourceLocationId: routeId(0),
    sourceField: "head",
    targetLocationId: routeId(1),
    targetField: "head",
  });
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

  const encounters = activePlaythrough.encounters;
  if (!encounters) {
    throw new Error("Drag benchmark fixture has no encounters");
  }

  void encounters[routeId(0)]?.head?.uid;
  void encounters[routeId(1)]?.head?.uid;
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
    for (const kind of [
      "reverse-active",
      "reverse-stored",
      "drag-empty-target",
      "drag-occupied-target",
    ] as const) {
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
    expect(results).toHaveLength(4);
  }, 120_000);
});
