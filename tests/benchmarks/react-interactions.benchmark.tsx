/** @vitest-environment jsdom */

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import React, { Profiler, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SummaryCard from "@/components/PokemonSummaryCard";
import TeamEntryItem from "@/components/pc/TeamEntryItem";
import {
  TeamMemberSelectionProvider,
  useTeamMemberSelection,
} from "@/components/team/TeamMemberSelectionContext";
import { getTeamSlots } from "@/components/team/team-slots";
import { getLocationsSortedWithCustom } from "@/loaders/locations";
import { buildPokemonUidIndex } from "@/utils/encounter-utils";

const SAMPLE_COUNT = 20;
const WARMUP_ITERATIONS = 5;
let activeProfilerDurations: number[] = [];
let selectPokemon: () => void;

function handleProfilerRender(
  _id: string,
  _phase: string,
  actualDuration: number,
) {
  activeProfilerDurations.push(actualDuration);
}

const updatePokemonByUIDMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined),
);

vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/components/context-menu", () => ({
  ContextMenu: ({
    children,
    items,
  }: {
    children: ReactNode;
    items: Array<{ id: string; label?: ReactNode; onClick?: () => void }>;
  }) => (
    <>
      {children}
      {items.map((item) =>
        item.onClick ? (
          <button key={item.id} onClick={item.onClick} type="button">
            {item.label}
          </button>
        ) : null,
      )}
    </>
  ),
}));
vi.mock("@/components/CursorTooltip", () => ({
  CursorTooltip: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/PokemonSummaryCard/ArtworkVariantButton", () => ({
  ArtworkVariantButton: () => null,
}));
vi.mock("@/components/PokemonSummaryCard/FusionSprite", () => ({
  FusionSprite: () => <div data-testid="fusion-sprite" />,
}));
vi.mock("@/components/PokemonSummaryCard/TeamMemberContextMenu", () => ({
  TeamMemberContextMenu: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock("@/components/PokemonSummaryCard/PokemonContextMenu", () => ({
  PokemonContextMenu: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
}));
vi.mock("@/assets/images/head.svg", () => ({ default: () => <svg /> }));
vi.mock("@/assets/images/body.svg", () => ({ default: () => <svg /> }));
vi.mock("@/assets/images/pokeball.svg", () => ({ default: () => <svg /> }));

vi.mock("lucide-react", () => ({
  Box: () => <span />,
  MousePointer: () => <span />,
  Palette: () => <span />,
  Plus: () => <span />,
  Skull: () => <span />,
  SquareArrowUpRight: () => <span />,
}));
vi.mock("@/components/TypePills", () => ({ TypePills: () => null }));
vi.mock("@/hooks/useFusionTypes", () => ({
  useFusionTypesFromPokemon: () => ({ primary: "Electric", secondary: null }),
}));
vi.mock("@/hooks/useSprite", () => ({
  usePreferredVariantState: () => ({ variant: null }),
  useSpriteCredits: () => ({ data: {} }),
  useSpriteVariants: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/lib/sprites", () => ({ getSpriteId: () => null }));
vi.mock("@/utils/formatCredits", () => ({
  formatArtistCredits: () => "artist",
}));
vi.mock("@/utils/pokemonPredicates", () => ({
  canFuse: () => true,
  isPokemonActive: (pokemon: unknown) => Boolean(pokemon),
  isPokemonDeceased: () => false,
  isPokemonStored: () => false,
}));
vi.mock("@/loaders/pokemon", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/loaders/pokemon")>();
  return { ...actual, isEggId: () => false };
});
vi.mock("@/loaders/locations", async () => {
  const actual = await vi.importActual<typeof import("@/loaders/locations")>(
    "@/loaders/locations",
  );
  return { ...actual, getLocationById: (id: string) => ({ name: id }) };
});
vi.mock("@/stores/playthroughs/hooks", () => ({
  useActivePlaythrough: () => ({ team: { members: [] } }),
  useActivePlaythroughId: () => "playthrough-1",
  useEncounters: () => ({}),
}));
vi.mock("@/stores/playthroughs/index", () => ({
  playthroughActions: {
    markTeamMemberAsDeceased: vi.fn(),
    moveTeamMemberToBox: vi.fn(),
    updatePokemonByUID: updatePokemonByUIDMock,
  },
}));
vi.mock("@/utils/scrollToLocation", () => ({ scrollToLocationById: vi.fn() }));

const pikachu = {
  id: 25,
  name: "Pikachu",
  nationalDexId: 25,
  originalLocation: "route-1",
  uid: "pikachu-uid",
};
const eevee = {
  id: 133,
  name: "Eevee",
  nationalDexId: 133,
  originalLocation: "route-2",
  uid: "eevee-uid",
};
const filledTeamEntry = {
  body: eevee,
  head: pikachu,
  isFusion: true,
  locationId: "team-slot-1",
  locationName: "Team Slot",
  position: 1,
};

function profileRender(ui: React.ReactElement) {
  const durations: number[] = [];
  activeProfilerDurations = durations;
  const result = render(<ProfiledBenchmark>{ui}</ProfiledBenchmark>);
  return { ...result, durations };
}

function ProfiledBenchmark({ children }: { children: ReactNode }) {
  return (
    <Profiler id="benchmark" onRender={handleProfilerRender}>
      {children}
    </Profiler>
  );
}

function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (fraction: number) =>
    sorted[Math.ceil(sorted.length * fraction) - 1] ?? 0;
  return { p50Ms: at(0.5), p95Ms: at(0.95) };
}

function measureRender(ui: React.ReactElement) {
  for (let i = 0; i < WARMUP_ITERATIONS; i += 1) {
    profileRender(ui);
    cleanup();
  }
  const wall: number[] = [];
  const profiler: number[] = [];
  for (let i = 0; i < SAMPLE_COUNT; i += 1) {
    const start = performance.now();
    const mounted = profileRender(ui);
    wall.push(performance.now() - start);
    profiler.push(...mounted.durations);
    cleanup();
  }
  return { profiler: summarize(profiler), wall: summarize(wall) };
}

async function repeatSequentially(
  count: number,
  action: () => Promise<void>,
  index = 0,
): Promise<void> {
  if (index === count) {
    return;
  }

  await action();
  await repeatSequentially(count, action, index + 1);
}

async function measureInteraction(
  factory: () => ReturnType<typeof profileRender>,
  interaction: (root: ReturnType<typeof profileRender>) => void,
) {
  await repeatSequentially(WARMUP_ITERATIONS, async () => {
    const root = factory();
    await act(async () => interaction(root));
    cleanup();
  });
  const wall: number[] = [];
  const profiler: number[] = [];
  await repeatSequentially(SAMPLE_COUNT, async () => {
    const root = factory();
    root.durations.length = 0;
    const start = performance.now();
    await act(async () => interaction(root));
    wall.push(performance.now() - start);
    profiler.push(...root.durations);
    cleanup();
  });
  return { profiler: summarize(profiler), wall: summarize(wall) };
}

function SelectionProbe() {
  const selection = useTeamMemberSelection();
  selectPokemon = () => {
    selection.actions.handlePokemonSelect(pikachu, "route-1");
  };

  return (
    <button onClick={selectPokemon} type="button">
      Select
    </button>
  );
}

describe("deterministic React interaction baselines", () => {
  afterEach(() => {
    cleanup();
    updatePokemonByUIDMock.mockClear();
  });

  it("reports React Profiler and wall timings separately", async () => {
    const summaryCard = await measureRender(
      <SummaryCard headPokemon={pikachu} shouldLoad={false} />,
    );
    const pcTeamEntry = await measureInteraction(
      () =>
        profileRender(
          <TeamEntryItem
            entry={filledTeamEntry}
            idToName={new Map([["team-slot-1", "Team Slot"]])}
          />,
        ),
      (root) =>
        fireEvent.click(root.getByRole("button", { name: "Move to Box" })),
    );
    const teamSelection = await measureInteraction(
      () =>
        profileRender(
          <TeamMemberSelectionProvider
            onClose={vi.fn()}
            onSelect={vi.fn()}
            position={0}
          >
            <SelectionProbe />
          </TeamMemberSelectionProvider>,
        ),
      (root) => fireEvent.click(root.getByRole("button", { name: "Select" })),
    );

    console.info(
      JSON.stringify(
        {
          sampleCount: SAMPLE_COUNT,
          timings: {
            pcTeamEntryMoveToBox: pcTeamEntry,
            pokemonSummaryCard: summaryCard,
            teamSelection,
          },
          warmupIterations: WARMUP_ITERATIONS,
        },
        null,
        2,
      ),
    );
    expect(updatePokemonByUIDMock).not.toHaveBeenCalled();
  }, 120_000);

  it("reports pure derivation timings for TeamSlots and locations", () => {
    const encounters = Object.fromEntries(
      Array.from({ length: 512 }, (_, routeIndex) => [
        `route-${routeIndex}`,
        {
          body: routeIndex === 1 ? eevee : null,
          head: routeIndex === 0 ? pikachu : null,
          isFusion: routeIndex === 0,
          updatedAt: 0,
        },
      ]),
    );
    const members = [
      { bodyPokemonUid: "", headPokemonUid: pikachu.uid },
      { bodyPokemonUid: eevee.uid, headPokemonUid: "" },
      null,
      null,
      null,
      null,
    ];
    const pokemonUidIndex = buildPokemonUidIndex(encounters);
    const samples: number[] = [];
    const locationSamples: number[] = [];
    for (let i = 0; i < WARMUP_ITERATIONS; i += 1) {
      getTeamSlots(members, encounters, pokemonUidIndex);
      getLocationsSortedWithCustom([]);
    }
    for (let i = 0; i < SAMPLE_COUNT; i += 1) {
      let start = performance.now();
      getTeamSlots(members, encounters, pokemonUidIndex);
      samples.push(performance.now() - start);
      start = performance.now();
      getLocationsSortedWithCustom([]);
      locationSamples.push(performance.now() - start);
    }
    console.info(
      JSON.stringify(
        {
          derivations: {
            locations: summarize(locationSamples),
            teamSlots512: summarize(samples),
          },
        },
        null,
        2,
      ),
    );
    expect(getTeamSlots(members, encounters, pokemonUidIndex)).toHaveLength(6);
    expect(getLocationsSortedWithCustom([]).length).toBeGreaterThan(0);
  });
});
