import { queryOptions } from '@tanstack/react-query';
import encountersApiService from '@/services/encountersApiService';
import ms from 'ms';

// Encounters query options
export const encountersQueries = {
  all: (gameMode: 'classic' | 'remix') =>
    queryOptions({
      queryKey: ['encounters', 'all', gameMode],
      queryFn: () => encountersApiService.getEncountersByGameMode(gameMode),
      enabled: !!gameMode,
      staleTime: process.env.NODE_ENV === 'development' ? 0 : ms('1h'),
      gcTime: process.env.NODE_ENV === 'development' ? 0 : ms('2h'),
    }),
};

// Encounters query keys
export const encountersKeys = {
  all: ['encounters'] as const,
  lists: () => [...encountersKeys.all, 'list'] as const,
  list: (gameMode: 'classic' | 'remix') =>
    [...encountersKeys.lists(), gameMode] as const,
};
