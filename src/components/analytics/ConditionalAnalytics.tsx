'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const SpeedInsights = dynamic(
  () => import('@vercel/speed-insights/next').then(mod => mod.SpeedInsights),
  {
    ssr: false,
    loading: () => null,
  }
);

const Analytics = dynamic(
  () => import('@vercel/analytics/next').then(mod => mod.Analytics),
  {
    ssr: false,
    loading: () => null,
  }
);

interface ConsentPreferences {
  analytics: boolean;
  speedInsights: boolean;
}

const DEFAULT_PREFERENCES: ConsentPreferences = {
  analytics: false,
  speedInsights: false,
};

export function ConditionalAnalytics() {
  const [mounted, setMounted] = useState(false);
  const [preferences] = useLocalStorage<ConsentPreferences>(
    'cookie-preferences',
    DEFAULT_PREFERENCES
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only render Analytics if component has mounted and user has given consent
  // Disable analytics in development and preview environments
  const isProduction =
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';

  if (!mounted || !preferences.analytics || !isProduction) {
    return null;
  }

  return <Analytics />;
}

export function ConditionalSpeedInsights() {
  const [mounted, setMounted] = useState(false);
  const [preferences] = useLocalStorage<ConsentPreferences>(
    'cookie-preferences',
    DEFAULT_PREFERENCES
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only render SpeedInsights if component has mounted and user has given consent
  // Disable speed insights in development and preview environments
  const isProduction =
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';

  if (!mounted || !preferences.speedInsights || !isProduction) {
    return null;
  }

  return <SpeedInsights />;
}
