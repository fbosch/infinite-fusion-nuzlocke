/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Header from "@/app/_components/header";

const pathnameState = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.pathname,
}));

vi.mock("@/app/_components/git-hub-engagement-cta", () => ({
  GitHubEngagementCta: ({ route }: { route: string }) => (
    <div data-testid="github-engagement-cta">{route}</div>
  ),
}));

vi.mock("@/app/_components/logo", () => ({
  default: () => <svg aria-hidden="true" />,
}));

vi.mock("@/features/playthroughs", () => ({
  PlaythroughMenu: () => <div>Playthrough selector</div>,
}));

vi.mock("@/features/roster", () => ({
  PokemonPCSheet: () => null,
  TeamSlots: () => <div>Team slots</div>,
}));

vi.mock("@/features/preferences", () => ({
  SettingsModal: () => null,
  ThemeToggle: () => (
    <button data-testid="theme-toggle" type="button">
      Theme toggle
    </button>
  ),
}));

vi.mock("@/app/_components/header/menu-items", () => ({
  default: () => <div data-testid="menu-items">Menu items</div>,
}));

describe("Header", () => {
  beforeEach(() => {
    pathnameState.pathname = "/";
  });

  afterEach(() => {
    cleanup();
  });

  it.each([
    ["/", "home"],
    ["/locations", "locations"],
  ])("shows the GitHub CTA in the top bar on %s", (pathname, route) => {
    pathnameState.pathname = pathname;

    render(<Header />);

    expect(screen.getByTestId("github-engagement-cta").textContent).toBe(route);
    expect(
      screen
        .getByTestId("github-engagement-cta")
        .compareDocumentPosition(screen.getByTestId("theme-toggle")),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("does not show the GitHub CTA on non-table pages", () => {
    pathnameState.pathname = "/licenses";

    render(<Header />);

    expect(screen.queryByTestId("github-engagement-cta")).toBeNull();
  });
});
