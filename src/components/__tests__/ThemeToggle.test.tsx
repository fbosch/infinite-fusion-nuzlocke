/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ThemeToggle from "@/components/ThemeToggle";

const themeMock = vi.hoisted(() => ({
  setTheme: vi.fn(),
  theme: "system",
}));

vi.mock("next-themes", () => ({
  useTheme: () => themeMock,
}));

vi.mock("@/hooks/useMounted", () => ({
  useMounted: () => true,
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    themeMock.setTheme.mockClear();
    themeMock.theme = "system";
  });

  afterEach(() => {
    cleanup();
  });

  it("selects a theme through labeled radio controls", () => {
    render(<ThemeToggle />);

    expect(
      screen.getByRole("radiogroup", { name: "Theme selection" }),
    ).not.toBeNull();
    expect(
      screen
        .getByRole("radio", { name: "System theme" })
        .getAttribute("aria-checked"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("radio", { name: "Dark theme" }));

    expect(themeMock.setTheme).toHaveBeenCalledWith("dark");
  });
});
