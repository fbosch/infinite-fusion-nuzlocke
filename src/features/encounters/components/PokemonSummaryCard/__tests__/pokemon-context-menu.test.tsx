/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PokemonStatus } from "@/features/pokemon";
import { PokemonContextMenu } from "../pokemon-context-menu";

const { markEncounterAsDeceasedMock } = vi.hoisted(() => ({
  markEncounterAsDeceasedMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/dynamic", () => ({ default: () => () => null }));

vi.mock("@/assets/images/pokeball.svg", () => ({
  default: () => <svg />,
}));

vi.mock("@/assets/images/escape-cloud.svg", () => ({
  default: () => <svg />,
}));

vi.mock("@/assets/images/head.svg", () => ({ default: () => <svg /> }));
vi.mock("@/assets/images/body.svg", () => ({ default: () => <svg /> }));

vi.mock("@/features/pokemon", () => ({
  getSpriteId: () => "25",
  isEggId: (id: number | undefined) => id !== undefined && id < 0,
  PokemonStatus: {
    CAPTURED: "captured",
    DECEASED: "deceased",
    MISSED: "missed",
    RECEIVED: "received",
    TRADED: "traded",
  },
  usePreferredVariantState: () => ({ variant: null }),
  useSpriteVariants: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/features/playthroughs", () => ({
  getDisplayPokemon: (head: unknown, body: unknown, isFusion: boolean) => ({
    body,
    head,
    isFusion,
  }),
  playthroughActions: {
    markEncounterAsCaptured: vi.fn(),
    markEncounterAsDeceased: markEncounterAsDeceasedMock,
    markEncounterAsMissed: vi.fn(),
    markEncounterAsReceived: vi.fn(),
    moveEncounterToBox: vi.fn(),
    relocateEncounterSlot: vi.fn(),
  },
}));

vi.mock("@/features/preferences", async () => {
  const { proxy } = await import("valtio");
  return {
    settingsStore: proxy({
      moveEncountersBetweenLocations: false,
      reducedMotion: false,
    }),
    useReducedMotion: () => false,
  };
});

describe("PokemonContextMenu", () => {
  afterEach(cleanup);

  beforeEach(() => {
    markEncounterAsDeceasedMock.mockClear();
  });

  it("executes location-bound status actions", async () => {
    render(
      <PokemonContextMenu
        encounterData={{
          head: {
            id: 25,
            name: "Pikachu",
            nationalDexId: 25,
            uid: "pikachu-uid",
          },
          isFusion: false,
        }}
        locationId="route-1"
      >
        <button type="button">Pikachu</button>
      </PokemonContextMenu>,
    );

    fireEvent.contextMenu(screen.getByRole("button", { name: "Pikachu" }));
    const action = await screen.findByRole("menuitem", {
      name: "Mark as Deceased",
    });

    fireEvent.click(action);

    expect(markEncounterAsDeceasedMock).toHaveBeenCalledWith("route-1");
  });

  it("does not expose status actions for eggs", () => {
    render(
      <PokemonContextMenu
        encounterData={{
          head: {
            id: -1,
            name: "Egg",
            nationalDexId: 0,
            status: PokemonStatus.CAPTURED,
            uid: "egg-uid",
          },
          isFusion: false,
        }}
        locationId="route-1"
      >
        <button type="button">Egg</button>
      </PokemonContextMenu>,
    );

    fireEvent.contextMenu(screen.getByRole("button", { name: "Egg" }));

    expect(screen.queryByRole("menu")).toBeNull();
  });
});
