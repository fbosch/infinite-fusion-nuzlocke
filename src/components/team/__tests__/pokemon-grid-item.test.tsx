/** @vitest-environment jsdom */

import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Pokemon, PokemonOptionType } from "@/loaders/pokemon";
import { PokemonGridItem } from "../PokemonGridItem";

const { getPokemonByIdMock } = vi.hoisted(() => ({
  getPokemonByIdMock: vi.fn(),
}));

vi.mock("@/loaders/pokemon", () => ({
  getPokemonById: getPokemonByIdMock,
}));

vi.mock("@/components/PokemonSprite", () => ({
  PokemonSprite: () => null,
}));

vi.mock("@/components/TypePills", () => ({
  TypePills: ({ primary }: { primary: string }) => (
    <span data-testid="primary-type">{primary}</span>
  ),
}));

const pokemonOption = (id: number, name: string): PokemonOptionType => ({
  id,
  name,
  nationalDexId: id,
});

const pokemonData = (id: number, type: string) =>
  ({
    id,
    types: [{ name: type }],
  }) as Pokemon;

const defaultProps = {
  isActiveSlot: true,
  isSelectedBody: false,
  isSelectedHead: false,
  locationId: "route-1",
  onSelect: vi.fn(),
};

describe("PokemonGridItem", () => {
  it("keeps the newest Pokémon types when lookups resolve out of order", async () => {
    let resolveFirst: (pokemon: Pokemon | null) => void;
    let resolveSecond: (pokemon: Pokemon | null) => void;
    getPokemonByIdMock
      .mockReturnValueOnce(
        new Promise<Pokemon | null>((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise<Pokemon | null>((resolve) => {
          resolveSecond = resolve;
        }),
      );
    const { rerender } = render(
      <PokemonGridItem
        {...defaultProps}
        pokemon={pokemonOption(1, "Bulbasaur")}
      />,
    );

    rerender(
      <PokemonGridItem
        {...defaultProps}
        pokemon={pokemonOption(4, "Charmander")}
      />,
    );

    await act(() =>
      Promise.resolve().then(() => resolveSecond?.(pokemonData(4, "fire"))),
    );
    await waitFor(() => {
      expect(screen.getByTestId("primary-type").textContent).toBe("fire");
    });

    await act(() =>
      Promise.resolve().then(() => resolveFirst?.(pokemonData(1, "grass"))),
    );

    expect(screen.getByTestId("primary-type").textContent).toBe("fire");
  });
});
