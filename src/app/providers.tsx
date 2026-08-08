"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReducedMotionController } from "@/components/reduced-motion-controller";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { GlobalTooltipProvider } from "@/contexts/global-tooltip-context";
import { queryClient } from "@/lib/client";
import { PlaythroughResumeObserver } from "@/stores/playthroughs/playthrough-resume-observer";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
      <ThemeProvider>
        <GlobalTooltipProvider>
          <ReducedMotionController />
          <PlaythroughResumeObserver />
          {children}
        </GlobalTooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
