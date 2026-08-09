"use client";

import { useEffect, useRef } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { toDormancyBucket } from "@/lib/analytics/buckets";
import {
  getDaysSinceLastActive,
  markLandingViewedTracked,
  markPlaythroughResumedTracked,
  shouldTrackLandingViewed,
  shouldTrackPlaythroughResumed,
} from "@/lib/analytics/playthrough-event-data";
import { getSharedEventProperties } from "@/lib/analytics/selectors";
import { trackEvent } from "@/lib/analytics/track-event";
import {
  type ConsentPreferences,
  consentPreferencesSchema,
  DEFAULT_CONSENT_PREFERENCES,
} from "@/lib/consent-preferences";
import { useActivePlaythrough, useIsLoading } from "./hooks";

export function PlaythroughResumeObserver() {
  const activePlaythrough = useActivePlaythrough();
  const isLoading = useIsLoading();
  const lastTrackedLandingPlaythroughId = useRef<string | null>(null);
  const lastTrackedPlaythroughId = useRef<string | null>(null);
  const [preferences] = useLocalStorage<ConsentPreferences>(
    "cookie-preferences",
    DEFAULT_CONSENT_PREFERENCES,
    consentPreferencesSchema,
  );
  const _hasAnalyticsConsent = preferences.analytics;

  useEffect(() => {
    if (isLoading || !activePlaythrough) {
      return;
    }

    if (lastTrackedLandingPlaythroughId.current === activePlaythrough.id) {
      return;
    }

    if (!shouldTrackLandingViewed(activePlaythrough.id)) {
      lastTrackedLandingPlaythroughId.current = activePlaythrough.id;
      return;
    }

    const pathname = globalThis.location?.pathname;
    let entryRoute: "home" | "locations" | "other" = "other";
    if (pathname === "/") {
      entryRoute = "home";
    } else if (pathname === "/locations") {
      entryRoute = "locations";
    }

    const wasTracked = trackEvent("landing_viewed", {
      ...getSharedEventProperties(activePlaythrough),
      entry_route: entryRoute,
    });

    if (wasTracked) {
      markLandingViewedTracked(activePlaythrough.id);
      lastTrackedLandingPlaythroughId.current = activePlaythrough.id;
    }
  }, [activePlaythrough, isLoading]);

  useEffect(() => {
    if (isLoading || !activePlaythrough) {
      return;
    }

    if (lastTrackedPlaythroughId.current === activePlaythrough.id) {
      return;
    }

    if (!shouldTrackPlaythroughResumed(activePlaythrough.id)) {
      lastTrackedPlaythroughId.current = activePlaythrough.id;
      return;
    }

    const wasTracked = trackEvent("playthrough_resumed", {
      ...getSharedEventProperties(activePlaythrough),
      days_since_last_active_bucket: toDormancyBucket(
        getDaysSinceLastActive(activePlaythrough.updatedAt),
      ),
    });

    if (wasTracked) {
      markPlaythroughResumedTracked(activePlaythrough.id);
      lastTrackedPlaythroughId.current = activePlaythrough.id;
    }
  }, [activePlaythrough, isLoading]);

  return null;
}
