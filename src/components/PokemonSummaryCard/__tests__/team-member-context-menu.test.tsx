/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeamMemberContextMenu } from "../TeamMemberContextMenu";

const devolveToPichu = /Devolve to Pichu/;

const {
  emitEvolutionEventMock,
  flipTeamMemberFusionMock,
  updatePokemonByUIDMock,
  usePokemonEvolutionDataMock,
} = vi.hoisted(() => ({
  emitEvolutionEventMock: vi.fn(),
  flipTeamMemberFusionMock: vi.fn(),
  updatePokemonByUIDMock: vi.fn().mockResolvedValue(undefined),
  usePokemonEvolutionDataMock: vi.fn(),
}));

vi.mock("next/dynamic", () => ({ default: () => () => null }));

vi.mock("@/components/context-menu", () => ({
  ContextMenu: ({
    children,
    items,
  }: {
    children: React.ReactNode;
    items: Array<{ id: string; label?: React.ReactNode; onClick?: () => void }>;
  }) => (
    <>
      {children}
      {items.map((item) =>
        item.onClick ? (
          <button key={item.id} onClick={item.onClick} type="button">
            {item.label}
          </button>
        ) : null,
      )}
    </>
  ),
}));

vi.mock("@/hooks/useSprite", () => ({
  usePreferredVariantState: () => ({ variant: null }),
  useSpriteVariants: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/loaders/pokemon", () => ({
  isEggId: () => false,
  PokemonStatus: {
    CAPTURED: "captured",
    DECEASED: "deceased",
    MISSED: "missed",
    RECEIVED: "received",
    TRADED: "traded",
  },
  usePokemonEvolutionData: usePokemonEvolutionDataMock,
}));

vi.mock("@/stores/playthroughs/index", () => ({
  playthroughActions: {
    flipTeamMemberFusion: flipTeamMemberFusionMock,
    markTeamMemberAsDeceased: vi.fn(),
    moveTeamMemberToBox: vi.fn(),
    updatePokemonByUID: updatePokemonByUIDMock,
  },
}));

vi.mock("@/lib/sprites", () => ({ getSpriteId: () => "25.133" }));
vi.mock("@/lib/events", () => ({ emitEvolutionEvent: emitEvolutionEventMock }));
vi.mock("@/utils/scrollToLocation", () => ({ scrollToLocationById: vi.fn() }));
vi.mock("../PokemonContextMenu", () => ({
  createExternalDexItems: () => [],
}));

const pikachu = {
  id: 25,
  name: "Pikachu",
  nationalDexId: 25,
  uid: "pikachu-uid",
};

describe("TeamMemberContextMenu", () => {
  afterEach(cleanup);

  beforeEach(() => {
    flipTeamMemberFusionMock.mockReset();
    updatePokemonByUIDMock.mockClear();
    emitEvolutionEventMock.mockClear();
    usePokemonEvolutionDataMock.mockReturnValue({
      evolutions: undefined,
      preEvolution: null,
    });
  });

  it("offers Reverse Fusion only for distinct team members", () => {
    const { rerender } = render(
      <TeamMemberContextMenu
        teamMember={{
          bodyPokemon: { ...pikachu },
          headPokemon: pikachu,
          isEmpty: false,
          position: 2,
        }}
      >
        <span>team member</span>
      </TeamMemberContextMenu>,
    );

    expect(screen.queryByRole("button", { name: "Reverse Fusion" })).toBeNull();

    rerender(
      <TeamMemberContextMenu
        teamMember={{
          bodyPokemon: {
            id: 133,
            name: "Eevee",
            nationalDexId: 133,
            uid: "eevee-uid",
          },
          headPokemon: pikachu,
          isEmpty: false,
          position: 2,
        }}
      >
        <span>team member</span>
      </TeamMemberContextMenu>,
    );

    expect(screen.getByRole("button", { name: "Reverse Fusion" })).toBeTruthy();
  });

  it("reverses the selected team slot", () => {
    render(
      <TeamMemberContextMenu
        teamMember={{
          bodyPokemon: {
            id: 133,
            name: "Eevee",
            nationalDexId: 133,
            uid: "eevee-uid",
          },
          headPokemon: pikachu,
          isEmpty: false,
          position: 2,
        }}
      >
        <span>team member</span>
      </TeamMemberContextMenu>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reverse Fusion" }));

    expect(flipTeamMemberFusionMock).toHaveBeenCalledWith(2);
  });

  it("emits an evolution event after devolution", async () => {
    usePokemonEvolutionDataMock
      .mockReturnValueOnce({
        evolutions: undefined,
        preEvolution: { id: 172, name: "Pichu", nationalDexId: 172 },
      })
      .mockReturnValueOnce({ evolutions: undefined, preEvolution: null });

    render(
      <TeamMemberContextMenu
        teamMember={{
          headPokemon: { ...pikachu, originalLocation: "route-1" },
          isEmpty: false,
          position: 0,
        }}
      >
        <span>team member</span>
      </TeamMemberContextMenu>,
    );

    fireEvent.click(screen.getByRole("button", { name: devolveToPichu }));

    await Promise.resolve();
    expect(emitEvolutionEventMock).toHaveBeenCalledWith("route-1");
  });
});
