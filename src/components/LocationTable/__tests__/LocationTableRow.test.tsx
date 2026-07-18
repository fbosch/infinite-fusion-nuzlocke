/** @vitest-environment jsdom */

import { render } from "@testing-library/react";
import { forwardRef, useImperativeHandle } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LocationTableRow from "../LocationTableRow";

const summaryCardProps = vi.hoisted(() => vi.fn());
const playEvolution = vi.hoisted(() => vi.fn());
const canFuse = vi.hoisted(() => vi.fn());
const useEncounter = vi.hoisted(() => vi.fn());
const useInView = vi.hoisted(() => vi.fn());

const createRow = (index = 0) =>
  ({
    index,
    original: { id: "route-1" },
    getVisibleCells: () => [
      {
        id: "sprite-cell",
        column: { id: "sprite" },
        getContext: () => ({}),
      },
    ],
  }) as never;

vi.mock("react-intersection-observer", () => ({
  useInView,
}));

vi.mock("@/stores/playthroughs/hooks", () => ({
  useActivePlaythroughId: () => "playthrough-1",
  useEncounter,
}));

vi.mock("@/lib/events", () => ({ addEvolutionListener: () => vi.fn() }));
vi.mock("@/utils/pokemonPredicates", () => ({ canFuse }));
vi.mock("@/components/PokemonSummaryCard", () => ({
  default: forwardRef((props: unknown, ref) => {
    summaryCardProps(props);
    useImperativeHandle(ref, () => ({ playEvolution }));
    return <div />;
  }),
}));

describe("LocationTableRow", () => {
  beforeEach(() => {
    summaryCardProps.mockClear();
    playEvolution.mockClear();
    canFuse.mockReturnValue(false);
    useEncounter.mockReturnValue({
      head: { id: 132, name: "Ditto" },
      body: null,
      isFusion: false,
    });
    useInView.mockReturnValue({ inView: true, ref: vi.fn() });
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
      head: { id: 25, name: "Pikachu" },
      body: { id: 4, name: "Charmander" },
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
      head: { id: 25, name: "Pikachu" },
      body: { id: 4, name: "Charmander" },
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
      head: { id: 25, name: "Pikachu" },
      body: { id: 133, name: "Eevee" },
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
      head: { id: 25, name: "Pikachu" },
      body: { id: 4, name: "Charmander" },
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

  it("renders an offscreen row as a fixed-height placeholder", () => {
    useInView.mockReturnValue({ inView: false, ref: vi.fn() });

    const view = render(
      <table>
        <tbody>
          <LocationTableRow row={createRow(8)} />
        </tbody>
      </table>,
    );

    expect(
      view.container.querySelector("[data-location-row-placeholder]"),
    ).not.toBeNull();
    expect(summaryCardProps).not.toHaveBeenCalled();
  });
});
