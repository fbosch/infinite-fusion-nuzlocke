/** @vitest-environment jsdom */

import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EncounterConfigurationProvider } from "@/shared/ui/encounter-configuration";
import { DraggableComboboxSprite } from "../draggable-combobox-sprite";
import { getDraggableComboboxSpriteMenuOptions } from "../draggable-combobox-sprite-menu";

const { startDragMock } = vi.hoisted(() => ({
  startDragMock: vi.fn(),
}));

vi.mock("next/dynamic", () => ({ default: () => () => null }));

vi.mock("@/shared/ui/context-menu", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/shared/ui/cursor-tooltip", () => ({
  CursorTooltip: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/pokemon", () => ({
  isEggId: () => false,
  PokemonSprite: ({
    pokemonId: _pokemonId,
    ...props
  }: { pokemonId: number } & React.ComponentProps<"img">) => (
    <span aria-label="Pokemon" role="img" {...props} />
  ),
  usePokemonEvolutionData: () => ({ evolutions: [], preEvolution: null }),
  usePokemonTypes: () => ({ primary: null, secondary: null }),
}));

vi.mock("../draggable-sprite-tooltip-content", () => ({
  DraggableSpriteTooltipContent: () => null,
}));

vi.mock("../../../data/locations", () => ({
  getLocationByIdFromMerged: () => null,
  getLocations: () => [],
}));

vi.mock("../../drag-store", () => ({
  dragActions: { startDrag: startDragMock },
}));

vi.mock("@/features/playthroughs", () => ({
  playthroughActions: {},
  useCustomLocations: () => [],
}));

vi.mock("@/features/preferences", async () => {
  const { proxy } = await import("valtio");
  return {
    settingsStore: proxy({
      moveEncountersBetweenLocations: true,
      version: "1.0.0",
    }),
  };
});

describe("DraggableComboboxSprite", () => {
  beforeEach(async () => {
    const { settingsStore } = await import("@/features/preferences");
    settingsStore.moveEncountersBetweenLocations = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not start a drag after moves are disabled", async () => {
    const { settingsStore } = await import("@/features/preferences");
    const spriteProps = {
      comboboxId: "route-1-single",
      dragPreview: null,
      locationId: "route-1",
      value: { id: 25, name: "Pikachu", nationalDexId: 25 },
    };
    const { container, rerender } = render(
      <EncounterConfigurationProvider
        configuration={{
          moveEncountersBetweenLocations: true,
          reducedMotion: false,
        }}
      >
        <DraggableComboboxSprite {...spriteProps} />
      </EncounterConfigurationProvider>,
    );
    const sprite = container.querySelector('span[draggable="true"]');
    expect(sprite).not.toBeNull();

    settingsStore.moveEncountersBetweenLocations = false;
    rerender(
      <EncounterConfigurationProvider
        configuration={{
          moveEncountersBetweenLocations: false,
          reducedMotion: false,
        }}
      >
        <DraggableComboboxSprite {...spriteProps} />
      </EncounterConfigurationProvider>,
    );
    if (sprite === null) {
      throw new Error("Expected a draggable Pokemon sprite");
    }

    const dispatched = fireEvent.dragStart(sprite, {
      dataTransfer: {
        setData: vi.fn(),
        setDragImage: vi.fn(),
      },
    });

    expect(dispatched).toBe(false);
    expect(startDragMock).not.toHaveBeenCalled();
  });

  it("omits Dex links when no Pokemon is selected", () => {
    expect(
      getDraggableComboboxSpriteMenuOptions({
        customLocations: [],
        evolutions: [],
        field: "head",
        locationId: "route-1",
        moveEncountersBetweenLocations: true,
        onOpenMoveModal: vi.fn(),
        preEvolution: null,
        value: undefined,
      }),
    ).toEqual([]);
  });
});
