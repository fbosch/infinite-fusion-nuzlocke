/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { EncounterCell } from "../EncounterCell";

const {
  updateEncounterMock,
  toggleEncounterFusionMock,
  flipEncounterFusionMock,
  useEncounterMock,
} = vi.hoisted(() => ({
  updateEncounterMock: vi.fn(),
  toggleEncounterFusionMock: vi.fn(),
  flipEncounterFusionMock: vi.fn(),
  useEncounterMock: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: (props: { alt: string }) => (
    <span aria-label={props.alt} data-testid="next-image-mock" />
  ),
}));

vi.mock("@/components/CursorTooltip", () => ({
  CursorTooltip: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/ConfirmationDialog", () => ({
  default: ({
    isOpen,
    title,
    onConfirm,
    onClose,
    confirmText,
    cancelText,
  }: {
    isOpen: boolean;
    title: string;
    onConfirm: () => void;
    onClose: () => void;
    confirmText: string;
    cancelText: string;
  }) => {
    if (isOpen === false) {
      return null;
    }

    return (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        <button type="button" onClick={onConfirm}>
          {confirmText}
        </button>
        <button type="button" onClick={onClose}>
          {cancelText}
        </button>
      </div>
    );
  },
}));

vi.mock("@/components/PokemonCombobox/PokemonCombobox", () => ({
  PokemonCombobox: ({
    comboboxId,
    onChange,
  }: {
    comboboxId: string;
    onChange: (pokemon: PokemonOptionType | null) => void;
  }) => {
    const selectedPokemon: PokemonOptionType = {
      id: 133,
      name: "Eevee",
      uid: "eevee-1",
      nationalDexId: 133,
    };

    return (
      <div>
        <button type="button" onClick={() => onChange(selectedPokemon)}>
          {`select-${comboboxId}`}
        </button>
        <button type="button" onClick={() => onChange(null)}>
          {`clear-${comboboxId}`}
        </button>
      </div>
    );
  },
}));

vi.mock("../FusionToggleButton", () => ({
  FusionToggleButton: ({ onToggleFusion }: { onToggleFusion: () => void }) => (
    <button type="button" onClick={onToggleFusion}>
      Toggle Fusion
    </button>
  ),
}));

vi.mock("@/loaders/encounters", () => ({
  EncounterSource: {
    GIFT: "gift",
    TRADE: "trade",
  },
  useEncountersForLocation: () => ({ routeEncounterData: [] }),
}));

vi.mock("@/loaders/locations", () => ({
  getLocationById: () => ({ name: "Route 1" }),
}));

vi.mock("@/lib/preferredVariants", () => ({
  preferredVariants: new Map(),
  getPreferredVariant: () => null,
  setPreferredVariant: vi.fn(),
}));

vi.mock("@/stores/playthroughs", () => ({
  playthroughActions: {
    updateEncounter: updateEncounterMock,
    toggleEncounterFusion: toggleEncounterFusionMock,
    flipEncounterFusion: flipEncounterFusionMock,
  },
  useCustomLocations: () => [],
  useEncounter: useEncounterMock,
  useGameMode: () => "classic",
}));

describe("EncounterCell", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    updateEncounterMock.mockReset();
    toggleEncounterFusionMock.mockReset();
    flipEncounterFusionMock.mockReset();
    useEncounterMock.mockReset();
  });

  it("updates encounter when selecting a pokemon", () => {
    useEncounterMock.mockReturnValue({
      head: null,
      body: null,
      isFusion: false,
      updatedAt: Date.now(),
    });

    render(
      <table>
        <tbody>
          <tr>
            <EncounterCell locationId="route-1" />
          </tr>
        </tbody>
      </table>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "select-route-1-single" }),
    );

    expect(updateEncounterMock).toHaveBeenCalledWith(
      "route-1",
      expect.objectContaining({ id: 133, name: "Eevee" }),
      "head",
      false,
    );
  });

  it("prompts before clearing pokemon with valuable data", () => {
    useEncounterMock.mockReturnValue({
      head: {
        id: 25,
        name: "Pikachu",
        uid: "pikachu-1",
        nationalDexId: 25,
        nickname: "Sparky",
      },
      body: null,
      isFusion: false,
      updatedAt: Date.now(),
    });

    render(
      <table>
        <tbody>
          <tr>
            <EncounterCell locationId="route-1" />
          </tr>
        </tbody>
      </table>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "clear-route-1-single" }),
    );

    expect(updateEncounterMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Clear Encounter?" }),
    ).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Clear Encounter" }));

    expect(updateEncounterMock).toHaveBeenCalledWith(
      "route-1",
      null,
      "head",
      false,
    );
  });

  it("toggles fusion mode from the fusion toggle button", () => {
    useEncounterMock.mockReturnValue({
      head: {
        id: 25,
        name: "Pikachu",
        uid: "pikachu-1",
        nationalDexId: 25,
      },
      body: null,
      isFusion: false,
      updatedAt: Date.now(),
    });

    render(
      <table>
        <tbody>
          <tr>
            <EncounterCell locationId="route-1" />
          </tr>
        </tbody>
      </table>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Toggle Fusion" }));

    expect(toggleEncounterFusionMock).toHaveBeenCalledWith("route-1");
  });
});
