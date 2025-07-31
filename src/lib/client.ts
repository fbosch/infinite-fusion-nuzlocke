import { QueryClient } from '@tanstack/react-query';
import ms from 'ms';
import { queryPersister } from './persistence';

// Create a centralized query client with optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Conservative default - most data changes occasionally
      staleTime: ms('5m'), 
      gcTime: ms('30m'), // Increased for better UX
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      persister:
        process.env.NODE_ENV !== 'test'
          ? queryPersister.persisterFn
          : undefined,
      // Network-first in dev, cache-first in prod for better DX
      refetchOnWindowFocus: process.env.NODE_ENV === 'production',
      refetchOnReconnect: 'always',
    },
  },
});
