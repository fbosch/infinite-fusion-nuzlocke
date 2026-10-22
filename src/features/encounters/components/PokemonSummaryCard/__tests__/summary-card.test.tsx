/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SummaryCard from "..";

vi.mock("@/shared/ui/cursor-tooltip", () => ({
  CursorTooltip: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("../artwork-variant-button", () => ({
  ArtworkVariantButton: () => <button type="button">Change artwork</button>,
}));

vi.mock("../fusion-sprite", () => ({
  FusionSprite: () => <div data-testid="fusion-sprite" />,
}));

vi.mock("../pokemon-context-menu", () => ({
  PokemonContextMenu: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/pokemon", () => ({
  getSpriteId: (headId: number, bodyId?: number) =>
    bodyId ? `${headId}.${bodyId}` : String(headId),
  isEggId: (id: number | undefined) => id !== undefined && id < 0,
  isPokemonDeceased: () => false,
  TypePills: () => null,
  useFusionTypesFromPokemon: () => ({ primary: null, secondary: null }),
  usePreferredVariantState: () => ({ variant: null }),
  useSpriteCredits: () => ({ data: {} }),
}));

describe("SummaryCard", () => {
  afterEach(cleanup);

  it("links non-egg Pokemon to their Pokédex entry", () => {
    render(
      <SummaryCard
        headPokemon={{
          id: 25,
          name: "Pikachu",
          nationalDexId: 25,
          uid: "pikachu-uid",
        }}
      />,
    );

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe(
      "https://infinitefusiondex.com/details/25",
    );
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(
      screen.getByRole("button", { name: "Change artwork" }),
    ).not.toBeNull();
  });

  it("keeps eggs out of external navigation and artwork selection", () => {
    render(
      <SummaryCard
        headPokemon={{
          id: -1,
          name: "Egg",
          nationalDexId: 0,
          uid: "egg-uid",
        }}
      />,
    );

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button", { name: "Change artwork" })).toBeNull();
  });
});
