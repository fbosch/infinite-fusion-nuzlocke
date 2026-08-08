/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { FusionCombinationOption, PokemonOption } from "../PokemonOptions";

vi.mock("@headlessui/react", () => ({
  ComboboxOption: ({
    children,
    className,
    value: _value,
    ...props
  }: {
    children:
      | React.ReactNode
      | ((state: { active: boolean; selected: boolean }) => React.ReactNode);
    className?: string | ((state: { active: boolean }) => string);
    value?: unknown;
  } & Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "className">) => (
    <div
      {...props}
      className={
        typeof className === "function"
          ? className({ active: false })
          : className
      }
    >
      {typeof children === "function"
        ? children({ active: false, selected: false })
        : children}
    </div>
  ),
}));

vi.mock("../SourceTag", () => ({
  SourceTag: () => <span>Route</span>,
}));

vi.mock("@/components/PokemonSprite", () => ({
  PokemonSprite: () => <div data-testid="pokemon-sprite" />,
}));

const mockPokemon: PokemonOptionType = {
  id: 25,
  name: "Pikachu",
  nationalDexId: 25,
};

describe("PokemonOption", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the duplicate badge for already captured species", () => {
    render(
      <PokemonOption
        gameMode="classic"
        getPokemonSource={() => []}
        isDuplicatePokemon={() => true}
        isRoutePokemon={() => true}
        locationId="route-1"
        pokemon={mockPokemon}
      />,
    );

    expect(screen.getByText("Dup")).toBeTruthy();
    expect(screen.getByTitle("Already captured")).toBeTruthy();
  });

  it("omits the duplicate badge for uncaptured species", () => {
    render(
      <PokemonOption
        gameMode="classic"
        getPokemonSource={() => []}
        isDuplicatePokemon={() => false}
        isRoutePokemon={() => false}
        locationId="route-1"
        pokemon={mockPokemon}
      />,
    );

    expect(screen.queryByText("Dup")).toBeNull();
  });
});

describe("FusionCombinationOption", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows both selected Pokémon and their fusion shorthand", () => {
    render(
      <FusionCombinationOption
        pokemon={{
          fusionBody: {
            id: 200,
            name: "Misdreavus",
            nationalDexId: 200,
          },
          id: 11,
          name: "Metapod",
          nationalDexId: 11,
        }}
      />,
    );

    expect(screen.getByText("Metapod / Misdreavus")).toBeTruthy();
    expect(screen.getByText("11.200")).toBeTruthy();
    expect(screen.getAllByTestId("pokemon-sprite")).toHaveLength(2);
  });
});
