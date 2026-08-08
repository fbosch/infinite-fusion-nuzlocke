/** @vitest-environment jsdom */

import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DraggableComboboxSprite } from "../DraggableComboboxSprite";
import { getDraggableComboboxSpriteMenuOptions } from "../draggable-combobox-sprite-menu";

const { startDragMock } = vi.hoisted(() => ({
  startDragMock: vi.fn(),
}));

vi.mock("next/dynamic", () => ({ default: () => () => null }));

vi.mock("@/components/context-menu", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/cursor-tooltip", () => ({
  CursorTooltip: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/PokemonSprite", () => ({
  PokemonSprite: () => <span aria-label="Pokemon" role="img" />,
}));

vi.mock("@/components/PokemonCombobox/DraggableSpriteTooltipContent", () => ({
  DraggableSpriteTooltipContent: () => null,
}));

vi.mock("@/hooks/usePokemonTypes", () => ({
  default: () => ({ primary: null, secondary: null }),
}));

vi.mock("@/loaders/locations", () => ({
  getLocationByIdFromMerged: () => null,
  getLocations: () => [],
}));

vi.mock("@/loaders/pokemon", () => ({
  isEggId: () => false,
  usePokemonEvolutionData: () => ({ evolutions: [], preEvolution: null }),
}));

vi.mock("@/stores/dragStore", () => ({
  dragActions: { startDrag: startDragMock },
}));

vi.mock("@/stores/playthroughs/hooks", () => ({
  useCustomLocations: () => [],
}));

vi.mock("@/stores/playthroughs/index", () => ({
  playthroughActions: {},
}));

vi.mock("@/stores/playthroughs/store", () => ({
  getActivePlaythrough: () => null,
}));

vi.mock("@/stores/settings", async () => {
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
    const { settingsStore } = await import("@/stores/settings");
    settingsStore.moveEncountersBetweenLocations = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not start a drag after moves are disabled", async () => {
    const { settingsStore } = await import("@/stores/settings");
    const { container } = render(
      <DraggableComboboxSprite
        comboboxId="route-1-single"
        dragPreview={null}
        locationId="route-1"
        value={{ id: 25, name: "Pikachu", nationalDexId: 25 }}
      />,
    );
    const sprite = container.querySelector('[draggable="true"]');
    expect(sprite).not.toBeNull();

    settingsStore.moveEncountersBetweenLocations = false;
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
