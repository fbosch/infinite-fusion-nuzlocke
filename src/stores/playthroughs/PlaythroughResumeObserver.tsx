"use client";

import { useEffect, useRef } from "react";
import {
  getDaysSinceLastActive,
  getSharedEventProperties,
  shouldTrackPlaythroughResumed,
  toDormancyBucket,
} from "@/lib/analytics/playthroughEventData";
import { trackEvent } from "@/lib/analytics/trackEvent";
import { useActivePlaythrough, useIsLoading } from "./hooks";

export function PlaythroughResumeObserver() {
  const activePlaythrough = useActivePlaythrough();
  const isLoading = useIsLoading();
  const lastTrackedPlaythroughId = useRef<string | null>(null);

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

    trackEvent("playthrough_resumed", {
      ...getSharedEventProperties(activePlaythrough),
      days_since_last_active_bucket: toDormancyBucket(
        getDaysSinceLastActive(activePlaythrough.updatedAt),
      ),
    });

    lastTrackedPlaythroughId.current = activePlaythrough.id;
  }, [activePlaythrough, isLoading]);

  return null;
}
