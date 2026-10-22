"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useSnapshot } from "valtio";
import {
  PlaythroughResumeObserver,
  ReducedMotionController,
  settingsStore,
  ThemeProvider,
  useReducedMotion,
} from "@/features/preferences";
import { EncounterConfigurationProvider } from "@/shared/ui/encounter-configuration";
import { GlobalTooltipProvider } from "@/shared/ui/global-tooltip-context";
import { queryClient } from "./query-client";
import { AppTooltipConfigurationProvider } from "./tooltip-configuration-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const settings = useSnapshot(settingsStore);
  const reducedMotion = useReducedMotion(settings.reducedMotion);

  return (
    <QueryClientProvider client={queryClient}>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
      <EncounterConfigurationProvider
        configuration={{
          moveEncountersBetweenLocations:
            settings.moveEncountersBetweenLocations,
          reducedMotion,
        }}
      >
        <ThemeProvider>
          <AppTooltipConfigurationProvider>
            <GlobalTooltipProvider>
              <ReducedMotionController />
              <PlaythroughResumeObserver />
              {children}
            </GlobalTooltipProvider>
          </AppTooltipConfigurationProvider>
        </ThemeProvider>
      </EncounterConfigurationProvider>
    </QueryClientProvider>
  );
}
