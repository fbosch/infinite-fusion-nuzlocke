"use client";

import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { settingsStore } from "@/stores/settings";

export function ReducedMotionController() {
  const settings = useSnapshot(settingsStore);

  useEffect(() => {
    if (typeof settings.reducedMotion === "boolean") {
      document.documentElement.dataset.reducedMotion = String(
        settings.reducedMotion,
      );
      return;
    }

    delete document.documentElement.dataset.reducedMotion;
  }, [settings.reducedMotion]);

  return null;
}
