/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeamMemberContextMenu } from "../TeamMemberContextMenu";

const flipTeamMemberFusionMock = vi.hoisted(() => vi.fn());

vi.mock("next/dynamic", () => ({ default: () => () => null }));

vi.mock("@/components/ContextMenu", () => ({
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
          <button key={item.id} type="button" onClick={item.onClick}>
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
  PokemonStatus: {
    CAPTURED: "captured",
    DECEASED: "deceased",
    MISSED: "missed",
    RECEIVED: "received",
    TRADED: "traded",
  },
  isEggId: () => false,
  usePokemonEvolutionData: () => ({
    evolutions: undefined,
    preEvolution: null,
  }),
}));

vi.mock("@/stores/playthroughs/index", () => ({
  playthroughActions: {
    flipTeamMemberFusion: flipTeamMemberFusionMock,
    markTeamMemberAsDeceased: vi.fn(),
    moveTeamMemberToBox: vi.fn(),
    updatePokemonByUID: vi.fn(),
  },
}));

vi.mock("@/lib/sprites", () => ({ getSpriteId: () => "25.133" }));
vi.mock("@/lib/events", () => ({ emitEvolutionEvent: vi.fn() }));
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
  });

  it("offers Reverse Fusion only for distinct team members", () => {
    const { rerender } = render(
      <TeamMemberContextMenu
        teamMember={{
          position: 2,
          isEmpty: false,
          headPokemon: pikachu,
          bodyPokemon: { ...pikachu },
        }}
      >
        <span>team member</span>
      </TeamMemberContextMenu>,
    );

    expect(screen.queryByRole("button", { name: "Reverse Fusion" })).toBeNull();

    rerender(
      <TeamMemberContextMenu
        teamMember={{
          position: 2,
          isEmpty: false,
          headPokemon: pikachu,
          bodyPokemon: {
            id: 133,
            name: "Eevee",
            nationalDexId: 133,
            uid: "eevee-uid",
          },
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
          position: 2,
          isEmpty: false,
          headPokemon: pikachu,
          bodyPokemon: {
            id: 133,
            name: "Eevee",
            nationalDexId: 133,
            uid: "eevee-uid",
          },
        }}
      >
        <span>team member</span>
      </TeamMemberContextMenu>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reverse Fusion" }));

    expect(flipTeamMemberFusionMock).toHaveBeenCalledWith(2);
  });
});
