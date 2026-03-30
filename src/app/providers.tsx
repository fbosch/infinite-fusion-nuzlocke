"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { GlobalTooltipProvider } from "@/contexts/GlobalTooltipContext";
import { queryClient } from "@/lib/client";
import { PlaythroughResumeObserver } from "@/stores/playthroughs/PlaythroughResumeObserver";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
      <ThemeProvider>
        <GlobalTooltipProvider>
          <PlaythroughResumeObserver />
          {children}
        </GlobalTooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
