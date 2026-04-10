"use client";

import dynamic from "next/dynamic";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useMounted } from "@/hooks/useMounted";
import { isAnalyticsProductionEnvironment } from "@/lib/analytics/trackEvent";

const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((mod) => mod.SpeedInsights),
  {
    ssr: false,
    loading: () => null,
  },
);

const Analytics = dynamic(
  () => import("@vercel/analytics/next").then((mod) => mod.Analytics),
  {
    ssr: false,
    loading: () => null,
  },
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
  const mounted = useMounted();
  const [preferences] = useLocalStorage<ConsentPreferences>(
    "cookie-preferences",
    DEFAULT_PREFERENCES,
  );

  // Only render Analytics if component has mounted and user has given consent
  // Disable analytics in development and preview environments
  const isProduction = isAnalyticsProductionEnvironment();

  if (mounted === false || !preferences.analytics || !isProduction) {
    return null;
  }

  return <Analytics />;
}

export function ConditionalSpeedInsights() {
  const mounted = useMounted();
  const [preferences] = useLocalStorage<ConsentPreferences>(
    "cookie-preferences",
    DEFAULT_PREFERENCES,
  );

  // Only render SpeedInsights if component has mounted and user has given consent
  // Disable speed insights in development and preview environments
  const isProduction = isAnalyticsProductionEnvironment();

  if (mounted === false || !preferences.speedInsights || !isProduction) {
    return null;
  }

  return <SpeedInsights />;
}
