import { getCheckpointLabel } from "@/lib/analytics/buckets";
import {
  getNewlyReachedCheckpoints,
  markCheckpointEventsTracked,
} from "@/lib/analytics/playthrough-event-data";
import {
  getEncounterCount,
  getSharedEventProperties,
} from "@/lib/analytics/selectors";
import { trackEvent } from "@/lib/analytics/track-event";
import type { Playthrough } from "../types";

export const trackEncounterProgress = (
  activePlaythrough: Playthrough,
  locationId: string,
  previousEncounterCount: number,
) => {
  const nextEncounterCount = getEncounterCount(activePlaythrough);

  if (previousEncounterCount === 0 && nextEncounterCount > 0) {
    trackEvent("first_encounter_saved", {
      ...getSharedEventProperties(activePlaythrough),
      location_id: locationId,
    });
  }

  const newlyReachedCheckpoints = getNewlyReachedCheckpoints(
    activePlaythrough.id,
    previousEncounterCount,
    nextEncounterCount,
  );
  const trackedCheckpoints: typeof newlyReachedCheckpoints = [];

  for (const checkpoint of newlyReachedCheckpoints) {
    const wasTracked = trackEvent("run_checkpoint_reached", {
      ...getSharedEventProperties(activePlaythrough),
      checkpoint,
      checkpoint_label: getCheckpointLabel(checkpoint),
    });

    if (wasTracked) {
      trackedCheckpoints.push(checkpoint);
    }
  }

  markCheckpointEventsTracked(
    activePlaythrough.id,
    newlyReachedCheckpoints,
    trackedCheckpoints,
  );
};

export const trackFusionCreatedIfNew = (
  activePlaythrough: Playthrough,
  locationId: string,
  wasCompleteFusion: boolean,
  isCompleteFusion: boolean,
  creationMethod: "update_encounter" | "create_fusion" | "drag_drop",
) => {
  if (wasCompleteFusion || !isCompleteFusion) {
    return;
  }

  trackEvent("fusion_created", {
    ...getSharedEventProperties(activePlaythrough),
    creation_method: creationMethod,
    location_id: locationId,
  });
};
