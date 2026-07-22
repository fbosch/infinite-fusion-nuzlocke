/** @vitest-environment jsdom */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scrollToLocationById } from "@/utils/scrollToLocation";

const {
  locationRowProps,
  scrollToIndexMock,
  scrollToMostRecentLocationMock,
  useVirtualizerMock,
} = vi.hoisted(() => ({
  locationRowProps: vi.fn(),
  scrollToMostRecentLocationMock: vi.fn(),
  scrollToIndexMock: vi.fn(),
  useVirtualizerMock: vi.fn(),
}));

vi.mock("@/utils/scrollToLocation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils/scrollToLocation")>()),
  scrollToMostRecentLocation: scrollToMostRecentLocationMock,
}));

vi.mock("@/stores/playthroughs/index", () => ({
  playthroughActions: {
    getEncounters: vi.fn(() => ({})),
  },
}));

vi.mock("@/stores/playthroughs/hooks", () => ({
  useCustomLocations: vi.fn(() => []),
  useEncounters: vi.fn(() => ({})),
  useIsLoading: vi.fn(() => false),
}));

vi.mock("@/loaders", () => ({
  getLocationsSortedWithCustom: vi.fn(() => [
    { id: "route-1", name: "Route 1" },
    { id: "route-2", name: "Route 2" },
    { id: "route-3", name: "Route 3" },
  ]),
}));

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: useVirtualizerMock,
}));

vi.mock("@/loaders/locations", () => ({
  getLocationById: vi.fn(() => ({ name: "Route 1" })),
}));

vi.mock("@/hooks/useMounted", () => ({
  useMounted: vi.fn(() => true),
}));

vi.mock("@/hooks/useBreakpoint", () => ({
  useBreakpointSmallerThan: vi.fn(() => false),
}));

vi.mock("../LocationTableRow", () => ({
  default: ({ row }: { row: { original: { id: string } } }) => {
    locationRowProps(row.original.id);
    return <tr data-testid="location-row" />;
  },
}));

vi.mock("../LocationCell", () => ({
  default: () => <td data-testid="location-cell" />,
}));

vi.mock("../LocationTableSkeleton", () => ({
  default: () => <div data-testid="skeleton" />,
}));

vi.mock("../customLocations/AddCustomLocationModal", () => ({
  default: () => null,
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

// Pass-through: render children directly so button handlers are preserved
vi.mock("@/components/CursorTooltip", () => ({
  CursorTooltip: ({ children }: { children: React.ReactNode }) => children,
}));

import LocationTable from "../index";

describe("LocationTable scroll-to-recent button", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    locationRowProps.mockReset();
    scrollToIndexMock.mockReset();
    scrollToMostRecentLocationMock.mockReset();
    useVirtualizerMock.mockReset();
    useVirtualizerMock.mockReturnValue({
      getTotalSize: () => 450,
      getVirtualItems: () => [{ end: 150, index: 0, start: 0 }],
      scrollToIndex: scrollToIndexMock,
    });
  });

  it("renders only virtual rows with four-row overscan", async () => {
    useVirtualizerMock.mockReturnValue({
      getTotalSize: () => 450,
      getVirtualItems: () => [{ end: 300, index: 1, start: 150 }],
    });

    await act(async () => {
      render(<LocationTable />);
    });

    const options = useVirtualizerMock.mock.calls[0][0];
    expect(options.count).toBe(3);
    expect(options.estimateSize()).toBe(150);
    expect(options.getScrollElement()).toBeInstanceOf(HTMLDivElement);
    expect(options.overscan).toBe(4);
    expect(locationRowProps).toHaveBeenCalledExactlyOnceWith("route-2");
  });

  it("scrolls an unmounted location through the virtualizer", async () => {
    await act(async () => {
      render(<LocationTable />);
    });

    expect(scrollToLocationById("route-3", { behavior: "smooth" })).toBe(true);

    expect(scrollToIndexMock).toHaveBeenCalledExactlyOnceWith(2, {
      align: "center",
      behavior: "smooth",
    });
  });

  it("scrolls to the most recent location without animation on page load", async () => {
    await act(async () => {
      render(<LocationTable />);
    });

    expect(scrollToMostRecentLocationMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(HTMLDivElement),
      expect.any(HTMLTableElement),
      "auto",
    );
    expect(screen.getByRole("table").parentElement?.className).not.toContain(
      "scroll-smooth",
    );
  });

  it("calls scrollToMostRecentLocation when the button is clicked", async () => {
    await act(async () => {
      render(<LocationTable />);
    });

    const button = screen.getByRole("button", {
      name: "Scroll to most recent encounter",
    });

    const baselineCalls = scrollToMostRecentLocationMock.mock.calls.length;

    fireEvent.click(button);

    expect(scrollToMostRecentLocationMock.mock.calls.length).toBe(
      baselineCalls + 1,
    );
  });

  it("calls scrollToMostRecentLocation when Enter is pressed on the button", async () => {
    await act(async () => {
      render(<LocationTable />);
    });

    const button = screen.getByRole("button", {
      name: "Scroll to most recent encounter",
    });

    const baselineCalls = scrollToMostRecentLocationMock.mock.calls.length;

    fireEvent.keyDown(button, { key: "Enter" });

    expect(scrollToMostRecentLocationMock.mock.calls.length).toBe(
      baselineCalls + 1,
    );
  });

  it("calls scrollToMostRecentLocation when Space is pressed on the button", async () => {
    await act(async () => {
      render(<LocationTable />);
    });

    const button = screen.getByRole("button", {
      name: "Scroll to most recent encounter",
    });

    const baselineCalls = scrollToMostRecentLocationMock.mock.calls.length;

    fireEvent.keyDown(button, { key: " " });

    expect(scrollToMostRecentLocationMock.mock.calls.length).toBe(
      baselineCalls + 1,
    );
  });
});
