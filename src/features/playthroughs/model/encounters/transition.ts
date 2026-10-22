import { getCheckpointLabel } from "@/shared/analytics/buckets";
import { trackEvent } from "@/shared/analytics/track-event";
import {
  getEncounterCount,
  getSharedEventProperties,
} from "../analytics-selectors";
import {
  getNewlyReachedCheckpoints,
  markCheckpointEventsTracked,
} from "../playthrough-event-data";
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
