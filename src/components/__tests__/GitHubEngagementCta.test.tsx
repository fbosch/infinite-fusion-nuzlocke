/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubEngagementCta } from "@/components/GitHubEngagementCta";
import { ANALYTICS_EVENTS } from "@/lib/analytics/trackEvent";

const inViewState = vi.hoisted(() => ({
  inView: false,
  ref: vi.fn(),
}));

const analyticsMock = vi.hoisted(() => ({
  trackEvent: vi.fn(),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

vi.mock("react-github-btn", () => ({
  default: ({ children, ...props }: ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("react-intersection-observer", () => ({
  useInView: () => inViewState,
}));

vi.mock("@/hooks/useMounted", () => ({
  useMounted: () => true,
}));

vi.mock("@/lib/analytics/trackEvent", () => ({
  ANALYTICS_EVENTS: {
    githubCtaViewed: "github_cta_viewed",
  },
  trackEvent: analyticsMock.trackEvent,
}));

describe("GitHubEngagementCta", () => {
  beforeEach(() => {
    inViewState.inView = false;
    inViewState.ref.mockClear();
    analyticsMock.trackEvent.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the GitHub star and issue controls with live counts", () => {
    render(<GitHubEngagementCta route="home" />);

    const starLink = screen.getByRole("link", {
      name: "Star fbosch/infinite-fusion-nuzlocke on GitHub",
    });
    const issueLink = screen.getByRole("link", {
      name: "View issues for fbosch/infinite-fusion-nuzlocke on GitHub",
    });

    expect(starLink.getAttribute("href")).toBe(
      "https://github.com/fbosch/infinite-fusion-nuzlocke",
    );
    expect(starLink.getAttribute("data-show-count")).toBe("true");
    expect(starLink.getAttribute("data-color-scheme")).toBe("light");
    expect(starLink.getAttribute("data-text")).toBe("");
    expect(starLink.parentElement?.className).toBe(
      "github-button-control h-7 w-20",
    );
    expect(issueLink.getAttribute("href")).toBe(
      "https://github.com/fbosch/infinite-fusion-nuzlocke/issues",
    );
    expect(issueLink.getAttribute("data-show-count")).toBe("true");
    expect(issueLink.parentElement?.className).toBe(
      "github-button-control h-7 w-20",
    );
  });

  it("emits one impression per route when half of the CTA becomes visible", () => {
    const { rerender } = render(<GitHubEngagementCta route="locations" />);

    expect(analyticsMock.trackEvent).not.toHaveBeenCalled();

    inViewState.inView = true;
    rerender(<GitHubEngagementCta route="locations" />);

    expect(analyticsMock.trackEvent).toHaveBeenCalledTimes(1);
    expect(analyticsMock.trackEvent).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.githubCtaViewed,
      {
        source_surface: "fixed_top_bar",
        route: "locations",
      },
    );

    rerender(<GitHubEngagementCta route="locations" />);

    expect(analyticsMock.trackEvent).toHaveBeenCalledTimes(1);
  });

  it("emits an impression after the CTA remounts for a new route", () => {
    const { rerender } = render(
      <GitHubEngagementCta key="home" route="home" />,
    );

    inViewState.inView = true;
    rerender(<GitHubEngagementCta key="home" route="home" />);
    rerender(<GitHubEngagementCta key="locations" route="locations" />);

    expect(analyticsMock.trackEvent).toHaveBeenNthCalledWith(
      1,
      ANALYTICS_EVENTS.githubCtaViewed,
      {
        source_surface: "fixed_top_bar",
        route: "home",
      },
    );
    expect(analyticsMock.trackEvent).toHaveBeenNthCalledWith(
      2,
      ANALYTICS_EVENTS.githubCtaViewed,
      {
        source_surface: "fixed_top_bar",
        route: "locations",
      },
    );
  });
});
