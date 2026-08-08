/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  TeamMemberSelectionProvider,
  useTeamMemberSelection,
} from "../TeamMemberSelectionContext";

const { updatePokemonByUIDMock } = vi.hoisted(() => ({
  updatePokemonByUIDMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/stores/playthroughs/hooks", () => ({
  useActivePlaythrough: () => ({ team: { members: [] } }),
  useEncounters: () => ({}),
}));

vi.mock("@/stores/playthroughs/index", () => ({
  playthroughActions: {
    updatePokemonByUID: updatePokemonByUIDMock,
  },
}));

vi.mock("@/utils/encounter-utils", () => ({
  findPokemonWithLocation: vi.fn(),
  getAllPokemonWithLocations: () => [],
}));

const pikachu = {
  id: 25,
  name: "Pikachu",
  nationalDexId: 25,
  uid: "pikachu-uid",
};

describe("TeamMemberSelectionProvider", () => {
  beforeEach(() => {
    updatePokemonByUIDMock.mockClear();
  });

  it("updates a selected Pokemon by identity before returning the selected slot", async () => {
    const onSelect = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <TeamMemberSelectionProvider
        onClose={onClose}
        onSelect={onSelect}
        position={0}
      >
        {children}
      </TeamMemberSelectionProvider>
    );
    const { result } = renderHook(() => useTeamMemberSelection(), { wrapper });

    act(() => {
      result.current.actions.handlePokemonSelect(pikachu, "route-1");
    });

    act(() => {
      result.current.actions.setNickname("Sparky");
    });

    await act(async () => {
      await result.current.actions.handleUpdateTeamMember();
    });

    expect(updatePokemonByUIDMock).toHaveBeenCalledWith("pikachu-uid", {
      nickname: "Sparky",
    });
    expect(onSelect).toHaveBeenCalledWith(pikachu, null);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
