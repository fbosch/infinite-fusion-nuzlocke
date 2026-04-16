/** @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PokemonStatus } from "@/loaders/pokemon";
import TeamEntryItem from "../TeamEntryItem";
import type { PCEntry } from "../types";

let activePlaythroughId = "playthrough-1";

const {
  moveTeamMemberToBoxMock,
  moveEncounterToBoxMock,
  markEncounterAsDeceasedMock,
  updatePokemonByUIDMock,
  updateTeamMemberMock,
  playEvolutionMock,
} = vi.hoisted(() => ({
  moveTeamMemberToBoxMock: vi.fn().mockResolvedValue(undefined),
  moveEncounterToBoxMock: vi.fn().mockResolvedValue(undefined),
  markEncounterAsDeceasedMock: vi.fn().mockResolvedValue(undefined),
  updatePokemonByUIDMock: vi.fn().mockResolvedValue(undefined),
  updateTeamMemberMock: vi.fn().mockResolvedValue(undefined),
  playEvolutionMock: vi.fn(),
}));

vi.mock("@/assets/images/head.svg", () => ({
  default: () => <svg data-testid="head-icon" />,
}));

vi.mock("@/assets/images/body.svg", () => ({
  default: () => <svg data-testid="body-icon" />,
}));

vi.mock("@/assets/images/pokeball.svg", () => ({
  default: () => <svg data-testid="pokeball-icon" />,
}));

vi.mock("@/components/CursorTooltip", () => ({
  CursorTooltip: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/PokemonSummaryCard/ArtworkVariantButton", () => ({
  ArtworkVariantButton: () => null,
}));

vi.mock("@/components/PokemonSummaryCard/FusionSprite", () => ({
  FusionSprite: (() => {
    const React = require("react") as typeof import("react");
    return React.forwardRef((props, ref) => {
      React.useImperativeHandle(
        ref,
        () => ({
          playEvolution: playEvolutionMock,
        }),
        [],
      );

      return <div data-testid="fusion-sprite" {...props} />;
    });
  })(),
}));

vi.mock("@/stores/playthroughs/hooks", () => ({
  useActivePlaythrough: () =>
    activePlaythroughId ? { id: activePlaythroughId } : null,
}));

vi.mock("@/components/PokemonSummaryCard/TeamMemberContextMenu", () => ({
  TeamMemberContextMenu: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/components/PokemonSummaryCard/utils", () => ({
  getNicknameText: () => "Pikachu",
}));

vi.mock("@/components/TypePills", () => ({
  TypePills: () => null,
}));

vi.mock("@/hooks/useFusionTypes", () => ({
  useFusionTypesFromPokemon: () => ({ primary: "Electric", secondary: null }),
}));

vi.mock("@/hooks/useSprite", () => ({
  useSpriteCredits: () => ({ data: {} }),
}));

vi.mock("@/lib/sprites", () => ({
  getSpriteId: () => null,
}));

vi.mock("@/lib/preferredVariants", () => ({
  preferredVariants: new Map(),
  getPreferredVariant: () => null,
  setPreferredVariant: vi.fn(),
}));

vi.mock("@/loaders/locations", () => ({
  getLocationById: (id: string) => ({ name: id }),
}));

vi.mock("@/stores/playthroughs", () => ({
  playthroughActions: {
    moveTeamMemberToBox: moveTeamMemberToBoxMock,
    moveEncounterToBox: moveEncounterToBoxMock,
    markEncounterAsDeceased: markEncounterAsDeceasedMock,
    updatePokemonByUID: updatePokemonByUIDMock,
    updateTeamMember: updateTeamMemberMock,
  },
  useEncounters: () => ({}),
}));

vi.mock("@/utils/formatCredits", () => ({
  formatArtistCredits: () => "artist",
}));

vi.mock("@/utils/pokemonPredicates", () => ({
  canFuse: () => true,
  isPokemonActive: (pokemon: unknown) => Boolean(pokemon),
}));

vi.mock("@/utils/scrollToLocation", () => ({
  scrollToLocationById: vi.fn(),
}));

const idToName = new Map([["team-slot-1", "Team Slot"]]);

const filledTeamEntry: PCEntry = {
  locationId: "team-slot-1",
  locationName: "Team Slot",
  position: 1,
  isFusion: true,
  head: {
    id: 25,
    name: "Pikachu",
    uid: "pikachu-uid",
    nationalDexId: 25,
    originalLocation: "route-1",
  },
  body: {
    id: 133,
    name: "Eevee",
    uid: "eevee-uid",
    nationalDexId: 133,
    originalLocation: "route-2",
  },
};

describe("TeamEntryItem", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    activePlaythroughId = "playthrough-1";
    moveTeamMemberToBoxMock.mockClear();
    moveEncounterToBoxMock.mockClear();
    markEncounterAsDeceasedMock.mockClear();
    updatePokemonByUIDMock.mockClear();
    updateTeamMemberMock.mockClear();
    playEvolutionMock.mockClear();
  });

  it("opens team assignment from empty team slot", () => {
    const onTeamMemberClick = vi.fn();
    const emptyTeamEntry: PCEntry = {
      locationId: "team-slot-1",
      locationName: "Team Slot",
      position: 1,
      isFusion: false,
      head: null,
      body: null,
    };

    render(
      <TeamEntryItem
        entry={emptyTeamEntry}
        idToName={idToName}
        onTeamMemberClick={onTeamMemberClick}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onTeamMemberClick).toHaveBeenCalledWith(1, {
      position: 1,
      isEmpty: true,
      headPokemon: null,
      bodyPokemon: null,
      isFusion: false,
    });
  });

  it("supports keyboard selection for existing team member", () => {
    const onTeamMemberClick = vi.fn();

    render(
      <TeamEntryItem
        entry={filledTeamEntry}
        idToName={idToName}
        onTeamMemberClick={onTeamMemberClick}
      />,
    );

    fireEvent.keyDown(screen.getByLabelText("Team slot 2"), {
      key: "Enter",
    });

    expect(onTeamMemberClick).toHaveBeenCalledWith(1, {
      position: 1,
      isEmpty: false,
      headPokemon: filledTeamEntry.head,
      bodyPokemon: filledTeamEntry.body,
      isFusion: true,
    });
  });

  it("moves team member to box from action button", async () => {
    render(<TeamEntryItem entry={filledTeamEntry} idToName={idToName} />);

    fireEvent.click(screen.getByRole("button", { name: "Move to Box" }));

    await waitFor(() => {
      expect(moveTeamMemberToBoxMock).toHaveBeenCalledWith(1);
    });
  });

  it("moves team member to graveyard and clears team slot", async () => {
    render(<TeamEntryItem entry={filledTeamEntry} idToName={idToName} />);

    fireEvent.click(screen.getByRole("button", { name: "Move to Graveyard" }));

    await waitFor(() => {
      expect(updatePokemonByUIDMock).toHaveBeenNthCalledWith(1, "pikachu-uid", {
        status: PokemonStatus.DECEASED,
      });
      expect(updatePokemonByUIDMock).toHaveBeenNthCalledWith(2, "eevee-uid", {
        status: PokemonStatus.DECEASED,
      });
      expect(updateTeamMemberMock).toHaveBeenCalledWith(1, null, null);
    });
  });

  it("does not play evolution animation when active playthrough changes", () => {
    const entryA: PCEntry = {
      ...filledTeamEntry,
    };
    const entryB: PCEntry = {
      ...filledTeamEntry,
      head: {
        ...filledTeamEntry.head!,
        id: 1,
        name: "Bulbasaur",
        uid: "bulbasaur-uid",
      },
      body: {
        ...filledTeamEntry.body!,
        id: 2,
        name: "Ivysaur",
        uid: "ivysaur-uid",
      },
    };
    const entryC: PCEntry = {
      ...filledTeamEntry,
      head: {
        ...filledTeamEntry.head!,
        id: 4,
        name: "Charmander",
        uid: "charmander-uid",
      },
      body: {
        ...filledTeamEntry.body!,
        id: 7,
        name: "Squirtle",
        uid: "squirtle-uid",
      },
    };

    const { rerender } = render(
      <TeamEntryItem entry={entryA} idToName={idToName} />,
    );

    rerender(<TeamEntryItem entry={entryB} idToName={idToName} />);
    expect(playEvolutionMock).toHaveBeenCalledTimes(1);

    activePlaythroughId = "playthrough-2";
    rerender(<TeamEntryItem entry={entryC} idToName={idToName} />);
    expect(playEvolutionMock).toHaveBeenCalledTimes(1);
  });
});
