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
import { getTeamSlots } from "@/components/team/teamSlots";
import { getLocationsSortedWithCustom } from "@/loaders/locations";
import { buildPokemonUidIndex } from "@/utils/encounter-utils";

const SAMPLE_COUNT = 20;
const WARMUP_ITERATIONS = 5;

const updatePokemonByUIDMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined),
);

vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/components/ContextMenu", () => ({
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
          <button key={item.id} type="button" onClick={item.onClick}>
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
  FusionSprite: React.forwardRef(() => <div data-testid="fusion-sprite" />),
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
  Plus: () => <span />,
  Skull: () => <span />,
  MousePointer: () => <span />,
  Palette: () => <span />,
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
  isPokemonDeceased: () => false,
  isPokemonStored: () => false,
  isPokemonActive: (pokemon: unknown) => Boolean(pokemon),
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
  useEncounters: () => ({}),
  useActivePlaythroughId: () => "playthrough-1",
}));
vi.mock("@/stores/playthroughs/index", () => ({
  playthroughActions: {
    updatePokemonByUID: updatePokemonByUIDMock,
    moveTeamMemberToBox: vi.fn(),
    markTeamMemberAsDeceased: vi.fn(),
  },
}));
vi.mock("@/utils/scrollToLocation", () => ({ scrollToLocationById: vi.fn() }));

const pikachu = {
  id: 25,
  name: "Pikachu",
  nationalDexId: 25,
  uid: "pikachu-uid",
  originalLocation: "route-1",
};
const eevee = {
  id: 133,
  name: "Eevee",
  nationalDexId: 133,
  uid: "eevee-uid",
  originalLocation: "route-2",
};
const filledTeamEntry = {
  locationId: "team-slot-1",
  locationName: "Team Slot",
  position: 1,
  isFusion: true,
  head: pikachu,
  body: eevee,
};

function profileRender(ui: React.ReactElement) {
  const durations: number[] = [];
  const result = render(
    <Profiler
      id="benchmark"
      onRender={(_id, _phase, actualDuration) => durations.push(actualDuration)}
    >
      {ui}
    </Profiler>,
  );
  return { ...result, durations };
}

function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (fraction: number) =>
    sorted[Math.ceil(sorted.length * fraction) - 1] ?? 0;
  return { p50Ms: at(0.5), p95Ms: at(0.95) };
}

async function measureRender(ui: React.ReactElement) {
  for (let i = 0; i < WARMUP_ITERATIONS; i += 1) {
    const mounted = profileRender(ui);
    cleanup();
    void mounted;
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
  return { wall: summarize(wall), profiler: summarize(profiler) };
}

async function measureInteraction(
  factory: () => ReturnType<typeof profileRender>,
  interaction: (root: ReturnType<typeof profileRender>) => void,
) {
  for (let i = 0; i < WARMUP_ITERATIONS; i += 1) {
    const root = factory();
    await act(async () => interaction(root));
    cleanup();
  }
  const wall: number[] = [];
  const profiler: number[] = [];
  for (let i = 0; i < SAMPLE_COUNT; i += 1) {
    const root = factory();
    root.durations.length = 0;
    const start = performance.now();
    await act(async () => interaction(root));
    wall.push(performance.now() - start);
    profiler.push(...root.durations);
    cleanup();
  }
  return { wall: summarize(wall), profiler: summarize(profiler) };
}

function SelectionProbe() {
  const selection = useTeamMemberSelection();
  return (
    <button
      type="button"
      onClick={() => selection.actions.handlePokemonSelect(pikachu, "route-1")}
    >
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
            position={0}
            onSelect={vi.fn()}
            onClose={vi.fn()}
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
          warmupIterations: WARMUP_ITERATIONS,
          timings: {
            pokemonSummaryCard: summaryCard,
            pcTeamEntryMoveToBox: pcTeamEntry,
            teamSelection: teamSelection,
          },
        },
        null,
        2,
      ),
    );
    expect(updatePokemonByUIDMock).not.toHaveBeenCalled();
  }, 120_000);

  it("reports pure derivation timings for TeamSlots and locations", () => {
    const encounters = Object.fromEntries(
      Array.from({ length: 512 }, (_, index) => [
        `route-${index}`,
        {
          head: index === 0 ? pikachu : null,
          body: index === 1 ? eevee : null,
          isFusion: index === 0,
          updatedAt: 0,
        },
      ]),
    );
    const members = [
      { headPokemonUid: pikachu.uid, bodyPokemonUid: "" },
      { headPokemonUid: "", bodyPokemonUid: eevee.uid },
      null,
      null,
      null,
      null,
    ];
    const index = buildPokemonUidIndex(encounters);
    const samples: number[] = [];
    const locationSamples: number[] = [];
    for (let i = 0; i < WARMUP_ITERATIONS; i += 1) {
      getTeamSlots(members, encounters, index);
      getLocationsSortedWithCustom([]);
    }
    for (let i = 0; i < SAMPLE_COUNT; i += 1) {
      let start = performance.now();
      getTeamSlots(members, encounters, index);
      samples.push(performance.now() - start);
      start = performance.now();
      getLocationsSortedWithCustom([]);
      locationSamples.push(performance.now() - start);
    }
    console.info(
      JSON.stringify(
        {
          derivations: {
            teamSlots512: summarize(samples),
            locations: summarize(locationSamples),
          },
        },
        null,
        2,
      ),
    );
    expect(getTeamSlots(members, encounters, index)).toHaveLength(6);
    expect(getLocationsSortedWithCustom([]).length).toBeGreaterThan(0);
  });
});
