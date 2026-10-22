"use client";

import { useSnapshot } from "valtio";
import { dragStore } from "@/features/encounters";
import { settingsStore, useReducedMotion } from "@/features/preferences";
import { TooltipConfigurationProvider } from "@/shared/ui/tooltip-configuration-context";

export function AppTooltipConfigurationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dragState = useSnapshot(dragStore);
  const settings = useSnapshot(settingsStore);
  const reducedMotion = useReducedMotion(settings.reducedMotion);

  return (
    <TooltipConfigurationProvider
      isDragging={dragState.isDragging}
      reducedMotion={reducedMotion}
    >
      {children}
    </TooltipConfigurationProvider>
  );
}
