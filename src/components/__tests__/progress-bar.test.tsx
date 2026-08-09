/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProgressBar from "../progress-bar";

const { encounters, locations } = vi.hoisted(() => ({
  encounters: {
    current: {},
  },
  locations: {
    current: [] as { id: string }[],
  },
}));

vi.mock("@/assets/images/escape-cloud.svg", () => ({
  default: () => <svg />,
}));

vi.mock("@/assets/images/pokeball.svg", () => ({
  default: () => <svg />,
}));

vi.mock("@/components/cursor-tooltip", () => ({
  CursorTooltip: ({
    children,
    content,
    onMouseEnter,
    onMouseLeave,
  }: {
    children: React.ReactNode;
    content: React.ReactNode;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
  }) => (
    <button
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      type="button"
    >
      {content}
      {children}
    </button>
  ),
}));

vi.mock("@/loaders/locations", () => ({
  getLocationsSortedWithCustom: () => locations.current,
}));

vi.mock("@/stores/playthroughs/hooks", () => ({
  useCustomLocations: () => [],
  useEncounters: () => encounters.current,
}));

describe("ProgressBar", () => {
  afterEach(cleanup);

  beforeEach(() => {
    locations.current = [{ id: "route-1" }, { id: "route-2" }];
    encounters.current = {};
  });

  it("reports mutually exclusive encounter progress counts", () => {
    encounters.current = {
      "route-1": {
        body: { status: "captured" },
        head: { status: "missed" },
      },
      "route-2": {
        body: { status: "deceased" },
        head: null,
      },
    };

    render(<ProgressBar />);

    expect(
      screen.getByRole("img", {
        name: "Encounter progress: 0 captured, 1 deceased, 1 missed, 0 unencountered",
      }),
    ).toBeTruthy();
  });

  it("dims the other segments when a completed segment is hovered", () => {
    encounters.current = {
      "route-1": {
        body: { status: "captured" },
        head: null,
      },
    };

    const { container } = render(<ProgressBar />);

    fireEvent.mouseEnter(screen.getByText("Captured"));

    const segmentBars = container.querySelectorAll(
      ".transition-\\[background-color\\,transform\\]",
    );
    expect((segmentBars[1] as HTMLElement).style.backgroundColor).toBe(
      "color-mix(in oklab, var(--color-rose-600) 25%, light-dark(var(--color-gray-100), var(--color-gray-800)))",
    );
  });
});
