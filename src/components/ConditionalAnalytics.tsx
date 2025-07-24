'use client';

import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface ConsentPreferences {
  analytics: boolean;
  speedInsights: boolean;
}

const DEFAULT_PREFERENCES: ConsentPreferences = {
  analytics: false,
  speedInsights: false,
};

export function ConditionalAnalytics() {
  const [preferences] = useLocalStorage<ConsentPreferences>(
    'cookie-preferences',
    DEFAULT_PREFERENCES
  );

  // Only render Analytics if user has given consent
  if (!preferences.analytics) {
    return null;
  }

  return <Analytics />;
}

export function ConditionalSpeedInsights() {
  const [preferences] = useLocalStorage<ConsentPreferences>(
    'cookie-preferences',
    DEFAULT_PREFERENCES
  );

  // Only render SpeedInsights if user has given consent
  if (!preferences.speedInsights) {
    return null;
  }

  return <SpeedInsights />;
}
