"use client";

import { useEffect, useRef } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  getDaysSinceLastActive,
  getSharedEventProperties,
  markPlaythroughResumedTracked,
  shouldTrackPlaythroughResumed,
  toDormancyBucket,
} from "@/lib/analytics/playthroughEventData";
import { trackEvent } from "@/lib/analytics/trackEvent";
import { useActivePlaythrough, useIsLoading } from "./hooks";

type ConsentPreferences = {
  analytics: boolean;
  speedInsights: boolean;
};

const DEFAULT_CONSENT_PREFERENCES: ConsentPreferences = {
  analytics: false,
  speedInsights: false,
};

export function PlaythroughResumeObserver() {
  const activePlaythrough = useActivePlaythrough();
  const isLoading = useIsLoading();
  const lastTrackedPlaythroughId = useRef<string | null>(null);
  const [preferences] = useLocalStorage<ConsentPreferences>(
    "cookie-preferences",
    DEFAULT_CONSENT_PREFERENCES,
  );
  const hasAnalyticsConsent = preferences.analytics;

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
  }, [activePlaythrough, hasAnalyticsConsent, isLoading]);

  return null;
}
