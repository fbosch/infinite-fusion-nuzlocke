/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PokemonPCSheet from "@/components/pc/PokemonPCSheet";

vi.mock("@/stores/playthroughs/hooks", () => ({
  useActivePlaythrough: () => null,
  useCustomLocations: () => [],
  useEncounters: () => [],
}));

vi.mock("@/utils/encounter-utils", () => ({
  buildPokemonUidIndex: () => new Map(),
}));

vi.mock("@/components/team/useTeamMemberPicker", () => ({
  useTeamMemberPicker: () => ({
    closePicker: vi.fn(),
    openPicker: vi.fn(),
    pickerModalOpen: false,
    selectTeamMember: vi.fn(),
    selectedPosition: null,
  }),
}));

vi.mock("@/components/pc/pcSheetDomain", () => ({
  getDeceasedEntries: () => [],
  getPCTab: () => "team",
  getPCTabIndex: () => 0,
  getStoredEntries: () => [],
}));

vi.mock("@/components/team/TeamMemberPickerModal", () => ({
  default: () => null,
}));

describe("PokemonPCSheet", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders an animated modal sidebar", () => {
    render(
      <PokemonPCSheet
        isOpen
        onClose={vi.fn()}
        activeTab="team"
        onChangeTab={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe("true");
    expect(document.getElementById("pokemon-pc-sheet")?.className).toContain(
      "data-closed:translate-x-full",
    );
  });
});
