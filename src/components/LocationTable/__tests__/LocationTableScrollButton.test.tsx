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

const { scrollToMostRecentLocationMock } = vi.hoisted(() => ({
  scrollToMostRecentLocationMock: vi.fn(),
}));

vi.mock("@/utils/scrollToLocation", () => ({
  scrollToMostRecentLocation: scrollToMostRecentLocationMock,
  scrollToLocationById: vi.fn(),
  flashPokemonOverlaysByUids: vi.fn(),
}));

vi.mock("@/stores/playthroughs", () => ({
  playthroughActions: {
    getEncounters: vi.fn(() => ({})),
  },
  useCustomLocations: vi.fn(() => []),
  useIsLoading: vi.fn(() => false),
}));

vi.mock("@/loaders", () => ({
  getLocationsSortedWithCustom: vi.fn(() => [
    { id: "route-1", name: "Route 1" },
  ]),
}));

vi.mock("@/loaders/locations", () => ({
  getLocationById: vi.fn(() => ({ name: "Route 1" })),
}));

vi.mock("@/lib/events", () => ({
  onScrollToLocation: vi.fn(() => vi.fn()),
  onFlashUids: vi.fn(() => vi.fn()),
}));

vi.mock("@/hooks/useMounted", () => ({
  useMounted: vi.fn(() => true),
}));

vi.mock("@/hooks/useBreakpoint", () => ({
  useBreakpointSmallerThan: vi.fn(() => false),
}));

vi.mock("../LocationTableRow", () => ({
  default: () => <tr data-testid="location-row" />,
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
    scrollToMostRecentLocationMock.mockReset();
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
