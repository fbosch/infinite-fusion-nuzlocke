"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import GitHubButton from "react-github-btn";
import { useInView } from "react-intersection-observer";
import { useMounted } from "@/hooks/useMounted";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics/trackEvent";

type GitHubEngagementCtaProps = {
  route: "home" | "locations";
};

export function GitHubEngagementCta({ route }: GitHubEngagementCtaProps) {
  const { ref, inView } = useInView({ threshold: 0.5, triggerOnce: true });
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const hasTrackedView = useRef(false);

  useEffect(() => {
    if (!inView || hasTrackedView.current) {
      return;
    }

    hasTrackedView.current = true;
    trackEvent(ANALYTICS_EVENTS.githubCtaViewed, {
      source_surface: "above_location_table",
      route,
    });
  }, [inView, route]);

  const colorScheme =
    mounted === false
      ? "no-preference: light; light: light; dark: dark;"
      : (resolvedTheme ?? "no-preference: light; light: light; dark: dark;");

  return (
    <div
      ref={ref}
      role="group"
      aria-label="Support the tracker"
      className="flex items-center gap-2"
    >
      <span className="github-button-control">
        <GitHubButton
          href="https://github.com/fbosch/infinite-fusion-nuzlocke"
          data-color-scheme={colorScheme}
          data-icon="octicon-star"
          data-size="large"
          data-show-count="true"
          data-text=""
          aria-label="Star fbosch/infinite-fusion-nuzlocke on GitHub"
        />
      </span>
      <span className="github-button-control">
        <GitHubButton
          href="https://github.com/fbosch/infinite-fusion-nuzlocke/issues"
          data-color-scheme={colorScheme}
          data-icon="octicon-issue-opened"
          data-size="large"
          data-show-count="true"
          data-text=""
          aria-label="View issues for fbosch/infinite-fusion-nuzlocke on GitHub"
        />
      </span>
    </div>
  );
}
