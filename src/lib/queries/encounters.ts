import { queryOptions } from '@tanstack/react-query';
import encountersApiService from '@/services/encountersApiService';
import ms from 'ms';

// Encounters query options
export const encountersQueries = {
  byGameMode: (gameMode: 'classic' | 'remix') =>
    queryOptions({
      queryKey: ['encounters', 'byGameMode', gameMode],
      queryFn: () => encountersApiService.getEncounters(gameMode),
      enabled: !!gameMode,
      staleTime: ms('1h'),
      gcTime: ms('2h'),
    }),

  all: (gameMode: 'classic' | 'remix') =>
    queryOptions({
      queryKey: ['encounters', 'all', gameMode],
      queryFn: () => encountersApiService.getEncountersByGameMode(gameMode),
      enabled: !!gameMode,
      staleTime: ms('1h'),
      gcTime: ms('2h'),
    }),
};

// Query key factories for consistent key generation
export const encountersKeys = {
  byGameMode: (gameMode: 'classic' | 'remix') =>
    ['encounters', 'byGameMode', gameMode] as const,
  all: (gameMode: 'classic' | 'remix') =>
    ['encounters', 'all', gameMode] as const,
};
