import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/PokemonSprite", () => ({
  PokemonSprite: () => null,
}));

import { PokemonSlotSelector } from "../PokemonSlotSelector";

describe("PokemonSlotSelector keyboard interaction", () => {
  it("supports keyboard-only slot selection", async () => {
    const onSlotSelect = vi.fn();
    const onRemovePokemon = vi.fn();

    render(
      <PokemonSlotSelector
        slot="head"
        selectedPokemon={null}
        isActive={false}
        onSlotSelect={onSlotSelect}
        onRemovePokemon={onRemovePokemon}
      />,
    );

    const user = userEvent.setup();
    const selectorButton = screen.getByRole("button", {
      name: "Select Head Pokémon",
    });

    selectorButton.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(onSlotSelect).toHaveBeenCalledTimes(2);
    expect(onSlotSelect).toHaveBeenNthCalledWith(1, "head");
    expect(onSlotSelect).toHaveBeenNthCalledWith(2, "head");
  });
});
