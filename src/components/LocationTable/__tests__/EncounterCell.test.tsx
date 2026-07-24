/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { EncounterCell } from "../EncounterCell";

const {
  updateEncounterMock,
  createFusionMock,
  toggleEncounterFusionMock,
  flipEncounterFusionMock,
  useEncounterMock,
  useEncountersForLocationMock,
} = vi.hoisted(() => ({
  updateEncounterMock: vi.fn(),
  createFusionMock: vi.fn(),
  toggleEncounterFusionMock: vi.fn(),
  flipEncounterFusionMock: vi.fn(),
  useEncounterMock: vi.fn(),
  useEncountersForLocationMock: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: (props: { alt: string }) => (
    <span role="img" aria-label={props.alt} data-testid="next-image-mock" />
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
    message,
  }: {
    isOpen: boolean;
    title: string;
    onConfirm: () => void;
    onClose: () => void;
    confirmText: string;
    cancelText: string;
    message: string;
  }) => {
    if (isOpen === false) {
      return null;
    }

    return (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        <p>{message}</p>
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
    onFusionChange,
  }: {
    comboboxId: string;
    onChange: (pokemon: PokemonOptionType | null) => void;
    onFusionChange?: (head: PokemonOptionType, body: PokemonOptionType) => void;
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
        <button
          type="button"
          onClick={() =>
            onFusionChange?.(selectedPokemon, {
              id: 200,
              name: "Misdreavus",
              uid: "misdreavus-1",
              nationalDexId: 200,
            })
          }
        >
          {`fuse-${comboboxId}`}
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
  useEncountersForLocation: useEncountersForLocationMock,
}));

vi.mock("@/loaders/locations", () => ({
  getLocationById: () => ({ name: "Route 1" }),
}));

vi.mock("@/lib/preferredVariants", () => ({
  preferredVariants: new Map(),
  getPreferredVariant: () => null,
  setPreferredVariant: vi.fn(),
}));

vi.mock("@/stores/playthroughs/index", () => ({
  playthroughActions: {
    updateEncounter: updateEncounterMock,
    createFusion: createFusionMock,
    toggleEncounterFusion: toggleEncounterFusionMock,
    flipEncounterFusion: flipEncounterFusionMock,
  },
}));

vi.mock("@/stores/playthroughs/hooks", () => ({
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
    createFusionMock.mockReset();
    toggleEncounterFusionMock.mockReset();
    flipEncounterFusionMock.mockReset();
    useEncounterMock.mockReset();
    useEncountersForLocationMock.mockReset();
    useEncountersForLocationMock.mockReturnValue({ routeEncounterData: [] });
  });

  it("does not load route encounters when deferred", () => {
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
            <EncounterCell locationId="route-1" shouldLoad={false} />
          </tr>
        </tbody>
      </table>,
    );

    expect(useEncountersForLocationMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
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

  it("creates a fusion from shorthand selection in a singular combobox", () => {
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
      screen.getByRole("button", { name: "fuse-route-1-single" }),
    );

    expect(createFusionMock).toHaveBeenCalledWith(
      "route-1",
      expect.objectContaining({ id: 133, name: "Eevee" }),
      expect.objectContaining({ id: 200, name: "Misdreavus" }),
    );
  });

  it("confirms before replacing valuable singular data with shorthand fusion", () => {
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
      screen.getByRole("button", { name: "fuse-route-1-single" }),
    );

    expect(createFusionMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Replace Encounter?" }),
    ).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Replace Encounter" }));

    expect(createFusionMock).toHaveBeenCalledWith(
      "route-1",
      expect.objectContaining({ id: 133, name: "Eevee" }),
      expect.objectContaining({ id: 200, name: "Misdreavus" }),
    );
  });

  it("confirms before replacing valuable body data preserved in singular mode", () => {
    useEncounterMock.mockReturnValue({
      head: {
        id: 25,
        name: "Pikachu",
        uid: "pikachu-1",
        nationalDexId: 25,
      },
      body: {
        id: 4,
        name: "Charmander",
        uid: "charmander-1",
        nationalDexId: 4,
        status: "captured",
      },
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
      screen.getByRole("button", { name: "fuse-route-1-single" }),
    );

    expect(createFusionMock).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Pikachu and Charmander with the status "Captured"/),
    ).toBeDefined();
  });
});
