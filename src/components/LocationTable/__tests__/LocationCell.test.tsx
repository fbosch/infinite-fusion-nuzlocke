/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import type { CombinedLocation } from "@/loaders/locations";
import { PokemonStatus } from "@/loaders/pokemon";

vi.mock("valtio", async (importOriginal) => ({
  ...(await importOriginal<typeof import("valtio")>()),
  useSnapshot: () => ({ moveEncountersBetweenLocations: false }),
}));

vi.mock("@/stores/playthroughs/hooks", () => ({
  useEncounters: () => ({
    "route-2": {
      head: {
        id: 25,
        name: "Pikachu",
        nationalDexId: 25,
        originalLocation: "route-1",
        status: PokemonStatus.CAPTURED,
      },
      body: null,
      isFusion: false,
      updatedAt: 0,
    },
  }),
}));

vi.mock("@/stores/settings", () => ({
  settingsStore: { moveEncountersBetweenLocations: false },
}));

vi.mock("@/loaders", () => ({
  isCustomLocation: () => false,
}));

vi.mock("@/components/CursorTooltip", () => ({
  CursorTooltip: ({
    children,
    content,
  }: {
    children: React.ReactNode;
    content: React.ReactNode;
  }) => (
    <div>
      {children}
      <div data-testid="tooltip-content">{content}</div>
    </div>
  ),
}));

vi.mock("@/components/PokemonSprite", () => ({
  PokemonSprite: () => null,
}));

vi.mock("@/constants/special-locations", () => ({
  isStarterLocation: () => false,
}));

import LocationCell from "../LocationCell";

const location = {
  id: "route-1",
  name: "Route 1",
  description: "A quiet starting route.",
} as CombinedLocation;

describe("LocationCell", () => {
  it("hides original encounter details when moving encounters is disabled", () => {
    render(<LocationCell location={location} locationName="Route 1" />);

    expect(screen.getByTestId("tooltip-content").textContent).toContain(
      "A quiet starting route.",
    );
    expect(screen.queryByText("Original Encounter")).toBeNull();
  });
});
