"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import GitHubButton from "react-github-btn";
import { useInView } from "react-intersection-observer";
import { useMounted } from "@/hooks/use-mounted";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics/trackEvent";

interface GitHubEngagementCtaProps {
  route: "home" | "locations";
}

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
      route,
      source_surface: "fixed_top_bar",
    });
  }, [inView, route]);

  const colorScheme =
    mounted === false
      ? "no-preference: light; light: light; dark: dark;"
      : (resolvedTheme ?? "no-preference: light; light: light; dark: dark;");

  return (
    <div
      aria-label="Support the tracker"
      className="flex items-center gap-2"
      ref={ref}
      role="group"
    >
      <span className="github-button-control h-7 w-20">
        <GitHubButton
          aria-label="Star fbosch/infinite-fusion-nuzlocke on GitHub"
          data-color-scheme={colorScheme}
          data-icon="octicon-star"
          data-show-count="true"
          data-size="large"
          data-text=""
          href="https://github.com/fbosch/infinite-fusion-nuzlocke"
        />
      </span>
      <span className="github-button-control h-7 w-20">
        <GitHubButton
          aria-label="View issues for fbosch/infinite-fusion-nuzlocke on GitHub"
          data-color-scheme={colorScheme}
          data-icon="octicon-issue-opened"
          data-show-count="true"
          data-size="large"
          data-text=""
          href="https://github.com/fbosch/infinite-fusion-nuzlocke/issues"
        />
      </span>
    </div>
  );
}
