import { queryOptions } from '@tanstack/react-query';
import encountersApiService from '@/services/encountersApiService';
import ms from 'ms';
import { getCacheBuster } from '@/lib/persistence';

// Encounters query options
export const encountersQueries = {
  all: (gameMode: 'classic' | 'remix') =>
    queryOptions({
      queryKey: ['encounters', 'all', gameMode, getCacheBuster()],
      queryFn: () => encountersApiService.getEncountersByGameMode(gameMode),
      enabled: !!gameMode,
      staleTime: process.env.NODE_ENV === 'development' ? 0 : ms('1h'),
      gcTime: process.env.NODE_ENV === 'development' ? 0 : ms('2h'),
    }),
};
