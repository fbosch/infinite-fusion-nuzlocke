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
  createFusionMock: vi.fn(),
  flipEncounterFusionMock: vi.fn(),
  toggleEncounterFusionMock: vi.fn(),
  updateEncounterMock: vi.fn(),
  useEncounterMock: vi.fn(),
  useEncountersForLocationMock: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: (props: { alt: string }) => (
    <span aria-label={props.alt} data-testid="next-image-mock" role="img" />
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
      <div aria-label={title} role="dialog">
        <h2>{title}</h2>
        <p>{message}</p>
        <button onClick={onConfirm} type="button">
          {confirmText}
        </button>
        <button onClick={onClose} type="button">
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
    onActivate,
  }: {
    comboboxId: string;
    onChange: (pokemon: PokemonOptionType | null) => void;
    onFusionChange?: (head: PokemonOptionType, body: PokemonOptionType) => void;
    onActivate?: () => void;
  }) => {
    const selectedPokemon: PokemonOptionType = {
      id: 133,
      name: "Eevee",
      nationalDexId: 133,
      uid: "eevee-1",
    };

    return (
      <div>
        <button onClick={() => onChange(selectedPokemon)} type="button">
          {`select-${comboboxId}`}
        </button>
        <button onClick={() => onChange(null)} type="button">
          {`clear-${comboboxId}`}
        </button>
        <button onClick={onActivate} type="button">
          {`activate-${comboboxId}`}
        </button>
        <button
          onClick={() =>
            onFusionChange?.(selectedPokemon, {
              id: 200,
              name: "Misdreavus",
              nationalDexId: 200,
              uid: "misdreavus-1",
            })
          }
          type="button"
        >
          {`fuse-${comboboxId}`}
        </button>
      </div>
    );
  },
}));

vi.mock("../FusionToggleButton", () => ({
  FusionToggleButton: ({ onToggleFusion }: { onToggleFusion: () => void }) => (
    <button onClick={onToggleFusion} type="button">
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
  getPreferredVariant: () => null,
  preferredVariants: new Map(),
  setPreferredVariant: vi.fn(),
}));

vi.mock("@/stores/playthroughs/index", () => ({
  playthroughActions: {
    createFusion: createFusionMock,
    flipEncounterFusion: flipEncounterFusionMock,
    toggleEncounterFusion: toggleEncounterFusionMock,
    updateEncounter: updateEncounterMock,
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
      body: null,
      head: null,
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

  it("loads route encounters when a combobox activates", () => {
    useEncounterMock.mockReturnValue({
      body: null,
      head: null,
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

    expect(useEncountersForLocationMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: false }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "activate-route-1-single" }),
    );

    expect(useEncountersForLocationMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });

  it("updates encounter when selecting a pokemon", () => {
    useEncounterMock.mockReturnValue({
      body: null,
      head: null,
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
      body: null,
      head: {
        id: 25,
        name: "Pikachu",
        nationalDexId: 25,
        nickname: "Sparky",
        uid: "pikachu-1",
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

  it("omits a missing nickname from the clear confirmation", () => {
    useEncounterMock.mockReturnValue({
      body: null,
      head: {
        id: 25,
        name: "Pikachu",
        nationalDexId: 25,
        status: "captured",
        uid: "pikachu-1",
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
      screen.getByRole("button", { name: "clear-route-1-single" }),
    );

    expect(
      screen.getByText(
        'This will permanently remove the Pikachu with the status "Captured".',
      ),
    ).toBeDefined();
  });

  it("toggles fusion mode from the fusion toggle button", () => {
    useEncounterMock.mockReturnValue({
      body: null,
      head: {
        id: 25,
        name: "Pikachu",
        nationalDexId: 25,
        uid: "pikachu-1",
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

    fireEvent.click(screen.getByRole("button", { name: "Toggle Fusion" }));

    expect(toggleEncounterFusionMock).toHaveBeenCalledWith("route-1");
  });

  it("creates a fusion from shorthand selection in a singular combobox", () => {
    useEncounterMock.mockReturnValue({
      body: null,
      head: null,
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
      body: null,
      head: {
        id: 25,
        name: "Pikachu",
        nationalDexId: 25,
        nickname: "Sparky",
        uid: "pikachu-1",
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
      body: {
        id: 4,
        name: "Charmander",
        nationalDexId: 4,
        status: "captured",
        uid: "charmander-1",
      },
      head: {
        id: 25,
        name: "Pikachu",
        nationalDexId: 25,
        uid: "pikachu-1",
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
