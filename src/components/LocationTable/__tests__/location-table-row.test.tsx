/** @vitest-environment jsdom */

import { render } from "@testing-library/react";
import { type Ref, useImperativeHandle } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FusionSpriteHandle } from "../../PokemonSummaryCard/fusion-sprite";
import LocationTableRow from "../LocationTableRow";

const summaryCardProps = vi.hoisted(() => vi.fn());
const encounterCellProps = vi.hoisted(() => vi.fn());
const playEvolution = vi.hoisted(() => vi.fn());
const canFuse = vi.hoisted(() => vi.fn());
const useEncounter = vi.hoisted(() => vi.fn());
const evolutionListener = vi.hoisted(() => ({
  current: undefined as undefined | ((event: { locationId: string }) => void),
}));

const createRow = (index = 0, includeEncounter = false) =>
  ({
    getVisibleCells: () => [
      {
        column: { id: "sprite" },
        getContext: () => ({}),
        id: "sprite-cell",
      },
      ...(includeEncounter
        ? [
            {
              column: { id: "encounter" },
              getContext: () => ({}),
              id: "encounter-cell",
            },
          ]
        : []),
    ],
    index,
    original: { id: "route-1", name: "Route 1" },
  }) as never;

vi.mock("@/stores/playthroughs/hooks", () => ({
  useActivePlaythroughId: () => "playthrough-1",
  useEncounter,
}));

vi.mock("@/lib/events", () => ({
  addEvolutionListener: (listener: (event: { locationId: string }) => void) => {
    evolutionListener.current = listener;
    return vi.fn();
  },
}));
vi.mock("@/utils/pokemonPredicates", () => ({ canFuse }));
vi.mock("@/components/PokemonSummaryCard", () => ({
  default: ({ ref, ...props }: { ref: Ref<FusionSpriteHandle> }) => {
    summaryCardProps(props);
    useImperativeHandle(ref, () => ({ playEvolution }));
    return <div />;
  },
}));
vi.mock("../encounter-cell", () => ({
  EncounterCell: (props: unknown) => {
    encounterCellProps(props);
    return <td />;
  },
}));

describe("LocationTableRow", () => {
  beforeEach(() => {
    summaryCardProps.mockClear();
    encounterCellProps.mockClear();
    playEvolution.mockClear();
    canFuse.mockReturnValue(false);
    useEncounter.mockReturnValue({
      body: null,
      head: { id: 132, name: "Ditto" },
      isFusion: false,
    });
    evolutionListener.current = undefined;
  });

  it("binds sprite context-menu actions to its encounter location", () => {
    render(
      <table>
        <tbody>
          <LocationTableRow row={createRow()} />
        </tbody>
      </table>,
    );

    expect(summaryCardProps).toHaveBeenCalledWith(
      expect.objectContaining({ locationId: "route-1" }),
    );
  });

  it("does not animate an eligible fusion on initial render", () => {
    canFuse.mockReturnValue(true);
    useEncounter.mockReturnValue({
      body: { id: 4, name: "Charmander" },
      head: { id: 25, name: "Pikachu" },
      isFusion: true,
    });

    render(
      <table>
        <tbody>
          <LocationTableRow row={createRow()} />
        </tbody>
      </table>,
    );

    expect(playEvolution).not.toHaveBeenCalled();
  });

  it("animates when an eligible fusion changes", () => {
    canFuse.mockReturnValue(true);
    useEncounter.mockReturnValue({
      body: { id: 4, name: "Charmander" },
      head: { id: 25, name: "Pikachu" },
      isFusion: true,
    });

    const view = render(
      <table>
        <tbody>
          <LocationTableRow row={createRow()} />
        </tbody>
      </table>,
    );
    useEncounter.mockReturnValue({
      body: { id: 133, name: "Eevee" },
      head: { id: 25, name: "Pikachu" },
      isFusion: true,
    });
    view.rerender(
      <table>
        <tbody>
          <LocationTableRow row={createRow()} />
        </tbody>
      </table>,
    );

    expect(playEvolution).toHaveBeenCalledOnce();
  });

  it("animates when a singular encounter becomes a fusion", () => {
    canFuse.mockReturnValue(true);
    const view = render(
      <table>
        <tbody>
          <LocationTableRow row={createRow()} />
        </tbody>
      </table>,
    );
    useEncounter.mockReturnValue({
      body: { id: 200, name: "Misdreavus" },
      head: { id: 11, name: "Metapod" },
      isFusion: true,
    });

    view.rerender(
      <table>
        <tbody>
          <LocationTableRow row={createRow()} />
        </tbody>
      </table>,
    );

    expect(playEvolution).toHaveBeenCalledOnce();
  });

  it("does not animate an invalid fusion combination", () => {
    useEncounter.mockReturnValue({
      body: { id: 4, name: "Charmander" },
      head: { id: 25, name: "Pikachu" },
      isFusion: true,
    });

    render(
      <table>
        <tbody>
          <LocationTableRow row={createRow()} />
        </tbody>
      </table>,
    );

    evolutionListener.current?.({ locationId: "route-1" });

    expect(playEvolution).not.toHaveBeenCalled();
  });

  it("renders full cell content for a mounted virtual row", () => {
    const view = render(
      <table>
        <tbody>
          <LocationTableRow row={createRow(8, true)} />
        </tbody>
      </table>,
    );

    expect(summaryCardProps).toHaveBeenCalledWith(
      expect.objectContaining({ locationId: "route-1" }),
    );
    expect(encounterCellProps).toHaveBeenCalledWith(
      expect.objectContaining({ locationId: "route-1" }),
    );
    expect(
      view.container.querySelector("tr")?.getAttribute("aria-rowindex"),
    ).toBe("10");
  });
});
