/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PokemonPCSheet from "../pokemon-pc-sheet";

vi.mock("@/features/playthroughs", () => ({
  buildPokemonUidIndex: () => new Map(),
  useActivePlaythrough: () => null,
  useCustomLocations: () => [],
  useEncounters: () => [],
}));

vi.mock("@/features/encounters", () => ({
  getLocationsSortedWithCustom: () => [],
}));

vi.mock("@/features/roster/components/use-team-member-picker", () => ({
  useTeamMemberPicker: () => ({
    closePicker: vi.fn(),
    openPicker: vi.fn(),
    pickerModalOpen: false,
    selectedPosition: null,
    selectTeamMember: vi.fn(),
  }),
}));

vi.mock("@/features/roster/model/pc-sheet-domain", () => ({
  getDeceasedEntries: () => [],
  getPCTab: () => "team",
  getPCTabIndex: () => 0,
  getStoredEntries: () => [],
}));

vi.mock("@/features/roster/components/team-member-picker-modal", () => ({
  default: () => null,
}));

describe("PokemonPCSheet", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders an animated modal sidebar", () => {
    render(
      <PokemonPCSheet
        activeTab="team"
        isOpen
        onChangeTab={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe("true");
    expect(document.getElementById("pokemon-pc-sheet")?.className).toContain(
      "data-closed:translate-x-full",
    );
    expect(
      document.getElementById("pokemon-pc-sheet")?.parentElement?.className,
    ).toContain("z-[71]");
  });
});
