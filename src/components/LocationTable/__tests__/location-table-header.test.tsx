/** @vitest-environment jsdom */

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { locationTableColumnWidths } from "../columnWidths";
import LocationTableHeader from "../LocationTableHeader";

const sortableHeaderCellProps = vi.hoisted(() => vi.fn());

vi.mock("@/components/ProgressBar", () => ({
  default: () => <div />,
}));

vi.mock("../SortableHeaderCell", () => ({
  default: (props: unknown) => {
    sortableHeaderCellProps(props);
    return <th />;
  },
}));

describe("LocationTableHeader", () => {
  it("uses the skeleton column widths", () => {
    render(
      <table>
        <LocationTableHeader
          headerGroups={
            [
              {
                headers: Object.keys(locationTableColumnWidths).map((id) => ({
                  column: { id },
                  id,
                })),
                id: "header-group",
              },
            ] as never
          }
        />
      </table>,
    );

    expect(sortableHeaderCellProps).toHaveBeenCalledTimes(4);
    for (const className of Object.values(locationTableColumnWidths)) {
      expect(sortableHeaderCellProps).toHaveBeenCalledWith(
        expect.objectContaining({ className }),
      );
    }
  });
});
