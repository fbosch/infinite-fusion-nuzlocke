/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GameModeToggle from "../GameModeToggle";

const { setGameModeMock } = vi.hoisted(() => ({
  setGameModeMock: vi.fn(),
}));

vi.mock("@/stores/playthroughs", () => ({
  playthroughActions: {
    setGameMode: setGameModeMock,
  },
  useActivePlaythrough: () => ({ id: "playthrough-1" }),
  useGameMode: () => "classic",
}));

describe("GameModeToggle", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    setGameModeMock.mockClear();
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
