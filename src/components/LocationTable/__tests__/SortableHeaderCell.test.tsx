/** @vitest-environment jsdom */

import type { Header } from "@tanstack/react-table";
import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CombinedLocation } from "@/loaders/locations";
import SortableHeaderCell from "../SortableHeaderCell";

interface BuildHeaderOptions {
  canSort?: boolean;
  content?: ReactNode;
}

function buildHeader(options: BuildHeaderOptions = {}) {
  const { canSort = true, content = "Location" } = options;
  const toggleSortingHandler = vi.fn();

  const header = {
    id: "location-name",
    column: {
      columnDef: {
        header: content,
      },
      getCanSort: () => canSort,
      getIsSorted: () => false,
      getSize: () => 240,
      getToggleSortingHandler: () => toggleSortingHandler,
    },
    getContext: () => ({}),
  } as unknown as Header<CombinedLocation, unknown>;

  return { header, toggleSortingHandler };
}

describe("SortableHeaderCell", () => {
  it("toggles sorting on Enter and Space when header itself is focused", () => {
    const { header, toggleSortingHandler } = buildHeader();

    render(
      <table>
        <thead>
          <tr>
            <SortableHeaderCell header={header} />
          </tr>
        </thead>
      </table>,
    );

    const sortableHeader = screen.getByRole("columnheader", {
      name: "Click to sort.",
    });

    fireEvent.keyDown(sortableHeader, { key: "Enter" });
    fireEvent.keyDown(sortableHeader, { key: " " });

    expect(toggleSortingHandler).toHaveBeenCalledTimes(2);
  });

  it("does not intercept Enter and Space from nested interactive controls", () => {
    const nestedButtonLabel = "Scroll to most recent encounter";
    const { header, toggleSortingHandler } = buildHeader({
      content: <button type="button">{nestedButtonLabel}</button>,
    });

    render(
      <table>
        <thead>
          <tr>
            <SortableHeaderCell header={header} />
          </tr>
        </thead>
      </table>,
    );

    const nestedButton = screen.getByRole("button", {
      name: nestedButtonLabel,
    });

    const enterEvent = createEvent.keyDown(nestedButton, { key: "Enter" });
    fireEvent(nestedButton, enterEvent);

    const spaceEvent = createEvent.keyDown(nestedButton, { key: " " });
    fireEvent(nestedButton, spaceEvent);

    expect(enterEvent.defaultPrevented).toBe(false);
    expect(spaceEvent.defaultPrevented).toBe(false);
    expect(toggleSortingHandler).not.toHaveBeenCalled();
  });
});
