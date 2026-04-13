/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { PokemonOption } from "../PokemonOptions";

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
        pokemon={mockPokemon}
        locationId="route-1"
        isRoutePokemon={() => true}
        isDuplicatePokemon={() => true}
        getPokemonSource={() => []}
        gameMode="classic"
      />,
    );

    expect(screen.getByText("Dup")).toBeTruthy();
    expect(screen.getByTitle("Already captured")).toBeTruthy();
  });

  it("omits the duplicate badge for uncaptured species", () => {
    render(
      <PokemonOption
        pokemon={mockPokemon}
        locationId="route-1"
        isRoutePokemon={() => false}
        isDuplicatePokemon={() => false}
        getPokemonSource={() => []}
        gameMode="classic"
      />,
    );

    expect(screen.queryByText("Dup")).toBeNull();
  });
});
