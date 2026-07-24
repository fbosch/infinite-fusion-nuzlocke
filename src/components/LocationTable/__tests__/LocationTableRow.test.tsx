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
const evolutionListener = vi.hoisted(() => ({
  current: undefined as undefined | ((event: { locationId: string }) => void),
}));

const createRow = (index = 0) =>
  ({
    index,
    original: { id: "route-1", name: "Route 1" },
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

vi.mock("@/lib/events", () => ({
  addEvolutionListener: (listener: (event: { locationId: string }) => void) => {
    evolutionListener.current = listener;
    return vi.fn();
  },
}));
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
      head: { id: 11, name: "Metapod" },
      body: { id: 200, name: "Misdreavus" },
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

    evolutionListener.current?.({ locationId: "route-1" });

    expect(playEvolution).not.toHaveBeenCalled();
  });

  it("keeps offscreen row cells mounted while deferring their content", () => {
    useInView.mockReturnValue({ inView: false, ref: vi.fn() });

    const view = render(
      <table>
        <tbody>
          <LocationTableRow row={createRow(8)} />
        </tbody>
      </table>,
    );

    expect(summaryCardProps).toHaveBeenCalledWith(
      expect.objectContaining({ shouldLoad: false }),
    );
    expect(
      view.queryByRole("button", { name: "Load encounters for Route 1" }),
    ).toBeNull();
  });
});
