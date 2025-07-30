import { QueryClient } from '@tanstack/react-query';
import ms from 'ms';
import { queryPersister } from './persistence';

// Create a centralized query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: ms('5m'), // 5 minutes
      gcTime: ms('10m'), // 10 minutes
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      persister:
        process.env.NODE_ENV !== 'test'
          ? queryPersister.persisterFn
          : undefined,
    },
  },
});
