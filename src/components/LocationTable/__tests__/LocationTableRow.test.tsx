/** @vitest-environment jsdom */

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LocationTableRow from "../LocationTableRow";

const summaryCardProps = vi.hoisted(() => vi.fn());

vi.mock("react-intersection-observer", () => ({
  useInView: () => ({ inView: true, ref: vi.fn() }),
}));

vi.mock("@/stores/playthroughs/hooks", () => ({
  useActivePlaythroughId: () => "playthrough-1",
  useEncounter: () => ({
    head: { id: 132, name: "Ditto" },
    body: null,
    isFusion: false,
  }),
}));

vi.mock("@/lib/events", () => ({ addEvolutionListener: () => vi.fn() }));
vi.mock("@/utils/pokemonPredicates", () => ({ canFuse: () => false }));
vi.mock("@/components/PokemonSummaryCard", () => ({
  default: (props: unknown) => {
    summaryCardProps(props);
    return <div />;
  },
}));

describe("LocationTableRow", () => {
  it("binds sprite context-menu actions to its encounter location", () => {
    render(
      <table>
        <tbody>
          <LocationTableRow
            row={
              {
                index: 0,
                original: { id: "route-1" },
                getVisibleCells: () => [
                  {
                    id: "sprite-cell",
                    column: { id: "sprite" },
                    getContext: () => ({}),
                  },
                ],
              } as never
            }
          />
        </tbody>
      </table>,
    );

    expect(summaryCardProps).toHaveBeenCalledWith(
      expect.objectContaining({ locationId: "route-1" }),
    );
  });
});
