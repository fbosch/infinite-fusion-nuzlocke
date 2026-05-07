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
import PlaythroughSelector from "../PlaythroughSelector";

const { setActivePlaythroughMock, trackEventMock } = vi.hoisted(() => ({
  setActivePlaythroughMock: vi.fn().mockResolvedValue(undefined),
  trackEventMock: vi.fn(),
}));

const playthroughs = [
  {
    id: "older",
    name: "Older Run",
    gameMode: "classic",
    createdAt: 100,
  },
  {
    id: "newest",
    name: "Newest Run",
    gameMode: "remix",
    createdAt: 300,
  },
  {
    id: "middle",
    name: "Middle Run",
    gameMode: "randomized",
    createdAt: 200,
  },
];

type PopoverChildren =
  | React.ReactNode
  | ((state: { open: boolean }) => React.ReactNode);

vi.mock("@headlessui/react", () => ({
  Popover: ({ children }: { children: PopoverChildren }) => {
    if (typeof children === "function") {
      return <div>{children({ open: false })}</div>;
    }

    return <div>{children}</div>;
  },
  PopoverButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  }) => <button {...props}>{children}</button>,
  PopoverPanel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ConfirmationDialog", () => ({
  default: () => null,
}));

vi.mock("@/components/CursorTooltip", () => ({
  CursorTooltip: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/hooks/usePlaythroughImportExport", () => ({
  usePlaythroughImportExport: () => ({
    showImportError: false,
    setShowImportError: vi.fn(),
    importErrorMessage: "",
    handleExportClick: vi.fn(),
    handleExportKeyDown: vi.fn(),
    handleImportClick: vi.fn(),
  }),
}));

vi.mock("@/lib/analytics/playthroughEventData", () => ({
  getSharedEventProperties: () => ({
    playthrough_id: "older",
    game_mode: "classic",
    encounter_count_bucket: "e_0",
    deceased_count_bucket: "c_0",
    boxed_count_bucket: "c_0",
    fusion_count_bucket: "c_0",
    viable_roster_bucket: "v_0",
  }),
}));

vi.mock("@/lib/analytics/trackEvent", () => ({
  trackEvent: trackEventMock,
}));

vi.mock("../CreatePlaythroughModal", () => ({
  default: () => null,
}));

vi.mock("../ImportErrorContent", () => ({
  ImportErrorContent: () => null,
}));

vi.mock("@/stores/playthroughs", () => ({
  playthroughActions: {
    setActivePlaythrough: setActivePlaythroughMock,
    deletePlaythrough: vi.fn(),
    createPlaythrough: vi.fn(),
  },
  useActivePlaythrough: () => playthroughs[0],
  useAllPlaythroughs: () => playthroughs,
  useGameMode: () => "classic",
  useIsLoading: () => false,
}));

describe("PlaythroughSelector", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    setActivePlaythroughMock.mockClear();
    trackEventMock.mockClear();
  });

  it("tracks when the playthrough selector opens", () => {
    render(<PlaythroughSelector />);

    fireEvent.click(screen.getByRole("button", { name: /^older run$/i }));

    expect(trackEventMock).toHaveBeenCalledWith(
      "playthrough_selector_opened",
      expect.objectContaining({ source_surface: "header" }),
    );
  });

  it("tracks when the create playthrough modal opens", () => {
    render(<PlaythroughSelector />);

    fireEvent.click(screen.getByRole("button", { name: /create new/i }));

    expect(trackEventMock).toHaveBeenCalledWith(
      "create_playthrough_modal_opened",
      expect.objectContaining({ source_surface: "header" }),
    );
  });

  it("supports arrow/home/end keyboard navigation between playthrough rows", () => {
    render(<PlaythroughSelector />);

    const newestRow = screen.getByLabelText("Select playthrough: Newest Run");
    const middleRow = screen.getByLabelText("Select playthrough: Middle Run");
    const olderRow = screen.getByLabelText("Select playthrough: Older Run");

    newestRow.focus();
    fireEvent.keyDown(newestRow, { key: "ArrowDown" });
    expect(document.activeElement).toBe(middleRow);

    fireEvent.keyDown(middleRow, { key: "ArrowUp" });
    expect(document.activeElement).toBe(newestRow);

    fireEvent.keyDown(newestRow, { key: "End" });
    expect(document.activeElement).toBe(olderRow);

    fireEvent.keyDown(olderRow, { key: "Home" });
    expect(document.activeElement).toBe(newestRow);
  });

  it("selects a playthrough with Enter key", async () => {
    render(<PlaythroughSelector />);

    const middleRow = screen.getByLabelText("Select playthrough: Middle Run");
    fireEvent.keyDown(middleRow, { key: "Enter" });

    await waitFor(() => {
      expect(setActivePlaythroughMock).toHaveBeenCalledWith("middle");
    });
  });

  it("selects a playthrough with Space key", async () => {
    render(<PlaythroughSelector />);

    const olderRow = screen.getByLabelText("Select playthrough: Older Run");
    fireEvent.keyDown(olderRow, { key: " " });

    await waitFor(() => {
      expect(setActivePlaythroughMock).toHaveBeenCalledWith("older");
    });
  });
});
