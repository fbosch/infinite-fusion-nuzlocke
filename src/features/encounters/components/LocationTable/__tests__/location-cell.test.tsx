/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { PokemonStatus } from "@/features/pokemon";
import type { CombinedLocation } from "../../../data/locations";

vi.mock("valtio", async (importOriginal) => ({
  ...(await importOriginal<typeof import("valtio")>()),
  useSnapshot: () => ({ moveEncountersBetweenLocations: false }),
}));

vi.mock("@/features/playthroughs", () => ({
  useEncounters: () => ({
    "route-2": {
      body: null,
      head: {
        id: 25,
        name: "Pikachu",
        nationalDexId: 25,
        originalLocation: "route-1",
        status: PokemonStatus.CAPTURED,
      },
      isFusion: false,
      updatedAt: 0,
    },
  }),
}));

vi.mock("@/features/preferences", () => ({
  settingsStore: { moveEncountersBetweenLocations: false },
}));

vi.mock("../../../data/locations", () => ({
  isCustomLocation: () => false,
}));

vi.mock("@/shared/ui/cursor-tooltip", () => ({
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

vi.mock("@/features/pokemon", () => ({
  PokemonSprite: () => null,
  PokemonStatus: {
    CAPTURED: "captured",
  },
}));

vi.mock("../../../model/special-locations", () => ({
  isStarterLocation: () => false,
}));

import LocationCell from "../location-cell";

const location = {
  description: "A quiet starting route.",
  id: "route-1",
  name: "Route 1",
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
