/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GameModeToggle from "../GameModeToggle";

const { activePlaythrough, setGameModeMock } = vi.hoisted(() => ({
  activePlaythrough: {
    current: { id: "playthrough-1" } as { id: string } | null,
  },
  setGameModeMock: vi.fn(),
}));

vi.mock("@/stores/playthroughs/index", () => ({
  playthroughActions: {
    setGameMode: setGameModeMock,
  },
}));

vi.mock("@/stores/playthroughs/hooks", () => ({
  useActivePlaythrough: () => activePlaythrough.current,
  useGameMode: () => "classic",
}));

describe("GameModeToggle", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    activePlaythrough.current = { id: "playthrough-1" };
    setGameModeMock.mockClear();
  });

  it("disables mode selection without an active playthrough", () => {
    activePlaythrough.current = null;

    render(<GameModeToggle />);

    expect(
      screen
        .getByRole("button", { name: /switch to classic/i })
        .getAttribute("disabled"),
    ).not.toBeNull();
    expect(
      screen
        .getByRole("button", { name: /switch to remix/i })
        .getAttribute("disabled"),
    ).not.toBeNull();
    expect(
      screen
        .getByRole("button", { name: /switch to randomized/i })
        .getAttribute("disabled"),
    ).not.toBeNull();
  });

  it("reports pointer mode changes as click-triggered", () => {
    render(<GameModeToggle />);

    fireEvent.click(screen.getByRole("button", { name: /switch to remix/i }), {
      detail: 1,
    });

    expect(setGameModeMock).toHaveBeenCalledWith("remix", {
      source_surface: "game_mode_toggle",
      trigger_method: "click",
    });
  });

  it("reports keyboard mode changes as keyboard-triggered", () => {
    render(<GameModeToggle />);

    fireEvent.click(screen.getByRole("button", { name: /switch to remix/i }), {
      detail: 0,
    });

    expect(setGameModeMock).toHaveBeenCalledWith("remix", {
      source_surface: "game_mode_toggle",
      trigger_method: "keyboard",
    });
  });
});
