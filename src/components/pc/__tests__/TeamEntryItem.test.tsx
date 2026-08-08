/** @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TeamEntryItem from "../TeamEntryItem";
import type { PCEntry } from "../types";

let activePlaythroughId = "playthrough-1";

const {
  moveTeamMemberToBoxMock,
  moveEncounterToBoxMock,
  markEncounterAsDeceasedMock,
  markTeamMemberAsDeceasedMock,
  updatePokemonByUIDMock,
  updateTeamMemberMock,
  playEvolutionMock,
} = vi.hoisted(() => ({
  markEncounterAsDeceasedMock: vi.fn().mockResolvedValue(undefined),
  markTeamMemberAsDeceasedMock: vi.fn().mockResolvedValue(undefined),
  moveEncounterToBoxMock: vi.fn().mockResolvedValue(undefined),
  moveTeamMemberToBoxMock: vi.fn().mockResolvedValue(undefined),
  playEvolutionMock: vi.fn(),
  updatePokemonByUIDMock: vi.fn().mockResolvedValue(undefined),
  updateTeamMemberMock: vi.fn().mockResolvedValue(undefined),
}));

type FusionSpriteMockProps = React.HTMLAttributes<HTMLDivElement> & {
  headPokemon?: unknown;
  bodyPokemon?: unknown;
  isFusion?: boolean;
  shouldLoad?: boolean;
  showStatusOverlay?: boolean;
};

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
    return React.forwardRef<
      { playEvolution: typeof playEvolutionMock },
      FusionSpriteMockProps
    >(
      (
        {
          headPokemon: _headPokemon,
          bodyPokemon: _bodyPokemon,
          isFusion: _isFusion,
          shouldLoad: _shouldLoad,
          showStatusOverlay: _showStatusOverlay,
          ...props
        },
        ref,
      ) => {
        React.useImperativeHandle(
          ref,
          () => ({
            playEvolution: playEvolutionMock,
          }),
          [],
        );

        return <div data-testid="fusion-sprite" {...props} />;
      },
    );
  })(),
}));

vi.mock("@/stores/playthroughs/hooks", () => ({
  useActivePlaythrough: () =>
    activePlaythroughId ? { id: activePlaythroughId } : null,
  useEncounters: () => ({}),
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
  getPreferredVariant: () => null,
  preferredVariants: new Map(),
  setPreferredVariant: vi.fn(),
}));

vi.mock("@/loaders/locations", () => ({
  getLocationById: (id: string) => ({ name: id }),
}));

vi.mock("@/stores/playthroughs/index", () => ({
  playthroughActions: {
    markEncounterAsDeceased: markEncounterAsDeceasedMock,
    markTeamMemberAsDeceased: markTeamMemberAsDeceasedMock,
    moveEncounterToBox: moveEncounterToBoxMock,
    moveTeamMemberToBox: moveTeamMemberToBoxMock,
    updatePokemonByUID: updatePokemonByUIDMock,
    updateTeamMember: updateTeamMemberMock,
  },
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
  body: {
    id: 133,
    name: "Eevee",
    nationalDexId: 133,
    originalLocation: "route-2",
    uid: "eevee-uid",
  },
  head: {
    id: 25,
    name: "Pikachu",
    nationalDexId: 25,
    originalLocation: "route-1",
    uid: "pikachu-uid",
  },
  isFusion: true,
  locationId: "team-slot-1",
  locationName: "Team Slot",
  position: 1,
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
    markTeamMemberAsDeceasedMock.mockClear();
    updatePokemonByUIDMock.mockClear();
    updateTeamMemberMock.mockClear();
    playEvolutionMock.mockClear();
  });

  it("opens team assignment from empty team slot", () => {
    const onTeamMemberClick = vi.fn();
    const emptyTeamEntry: PCEntry = {
      body: null,
      head: null,
      isFusion: false,
      locationId: "team-slot-1",
      locationName: "Team Slot",
      position: 1,
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
      bodyPokemon: null,
      headPokemon: null,
      isEmpty: true,
      isFusion: false,
      position: 1,
    });
  });

  it("supports keyboard selection for existing team member", async () => {
    const onTeamMemberClick = vi.fn();
    const user = userEvent.setup();

    render(
      <TeamEntryItem
        entry={filledTeamEntry}
        idToName={idToName}
        onTeamMemberClick={onTeamMemberClick}
      />,
    );

    screen.getByLabelText("Team slot 2").focus();
    await user.keyboard("{Enter}");

    expect(onTeamMemberClick).toHaveBeenCalledWith(1, {
      bodyPokemon: filledTeamEntry.body,
      headPokemon: filledTeamEntry.head,
      isEmpty: false,
      isFusion: true,
      position: 1,
    });
  });

  it("opens an empty team slot from its primary action", () => {
    const onTeamMemberClick = vi.fn();
    const emptyTeamEntry: PCEntry = {
      body: null,
      head: null,
      isFusion: false,
      locationId: "team-slot-1",
      locationName: "Team Slot",
      position: 1,
    };

    render(
      <TeamEntryItem
        entry={emptyTeamEntry}
        idToName={idToName}
        onTeamMemberClick={onTeamMemberClick}
      />,
    );

    fireEvent.click(screen.getByLabelText("Team slot 2"));

    expect(onTeamMemberClick).toHaveBeenCalledWith(1, {
      bodyPokemon: null,
      headPokemon: null,
      isEmpty: true,
      isFusion: false,
      position: 1,
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
      expect(markTeamMemberAsDeceasedMock).toHaveBeenCalledWith(1);
    });
  });

  it("activates nested actions without selecting the team card", async () => {
    const onTeamMemberClick = vi.fn();
    const user = userEvent.setup();

    render(
      <TeamEntryItem
        entry={filledTeamEntry}
        idToName={idToName}
        onTeamMemberClick={onTeamMemberClick}
      />,
    );

    const primaryAction = screen.getByLabelText("Team slot 2");
    const boxAction = screen.getByRole("button", { name: "Move to Box" });
    const graveyardAction = screen.getByRole("button", {
      name: "Move to Graveyard",
    });

    expect(primaryAction.contains(boxAction)).toBe(false);
    expect(primaryAction.contains(graveyardAction)).toBe(false);

    boxAction.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(moveTeamMemberToBoxMock).toHaveBeenCalledWith(1);
    });
    expect(onTeamMemberClick).not.toHaveBeenCalled();

    graveyardAction.focus();
    fireEvent.keyDown(graveyardAction, { key: " " });
    fireEvent.click(graveyardAction);
    await waitFor(() => {
      expect(markTeamMemberAsDeceasedMock).toHaveBeenCalledWith(1);
    });
    expect(onTeamMemberClick).not.toHaveBeenCalled();
  });

  it("does not play evolution animation when active playthrough changes", () => {
    const entryA: PCEntry = {
      ...filledTeamEntry,
    };
    const entryB: PCEntry = {
      ...filledTeamEntry,
      body: {
        ...filledTeamEntry.body!,
        id: 2,
        name: "Ivysaur",
        uid: "ivysaur-uid",
      },
      head: {
        ...filledTeamEntry.head!,
        id: 1,
        name: "Bulbasaur",
        uid: "bulbasaur-uid",
      },
    };
    const entryC: PCEntry = {
      ...filledTeamEntry,
      body: {
        ...filledTeamEntry.body!,
        id: 7,
        name: "Squirtle",
        uid: "squirtle-uid",
      },
      head: {
        ...filledTeamEntry.head!,
        id: 4,
        name: "Charmander",
        uid: "charmander-uid",
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
