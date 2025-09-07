'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/client';
import { GlobalTooltipProvider } from '@/contexts/GlobalTooltipContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
      <ThemeProvider>
        <GlobalTooltipProvider>{children}</GlobalTooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
