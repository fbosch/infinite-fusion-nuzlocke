/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlaythroughMenu from "../playthrough-menu";

const { activePlaythrough, selectorProps } = vi.hoisted(() => ({
  activePlaythrough: { current: null as { id: string } | null },
  selectorProps: vi.fn(),
}));

vi.mock("@/stores/playthroughs/hooks", () => ({
  useActivePlaythrough: () => activePlaythrough.current,
}));

vi.mock("../game-mode-toggle", () => ({
  default: () => <div data-testid="game-mode-toggle" />,
}));

vi.mock("../playthrough-selector", () => ({
  default: (props: unknown) => {
    selectorProps(props);
    return <div data-testid="playthrough-selector" />;
  },
}));

describe("PlaythroughMenu", () => {
  beforeEach(() => {
    activePlaythrough.current = null;
    selectorProps.mockClear();
  });

  it("reserves the game-mode control when no playthrough is active", () => {
    render(<PlaythroughMenu />);

    expect(screen.getByTestId("game-mode-toggle")).toBeTruthy();
    expect(selectorProps).toHaveBeenCalledWith({ standalone: false });
  });
});
