"use client";

import dynamic from "next/dynamic";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useMounted } from "@/hooks/use-mounted";
import { isAnalyticsProductionEnvironment } from "@/lib/analytics/trackEvent";
import {
  type ConsentPreferences,
  consentPreferencesSchema,
  DEFAULT_CONSENT_PREFERENCES,
} from "@/lib/consentPreferences";

const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((mod) => mod.SpeedInsights),
  {
    loading: () => null,
    ssr: false,
  },
);

const Analytics = dynamic(
  () => import("@vercel/analytics/next").then((mod) => mod.Analytics),
  {
    loading: () => null,
    ssr: false,
  },
);

export function ConditionalAnalytics() {
  const mounted = useMounted();
  const [preferences] = useLocalStorage<ConsentPreferences>(
    "cookie-preferences",
    DEFAULT_CONSENT_PREFERENCES,
    consentPreferencesSchema,
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
    DEFAULT_CONSENT_PREFERENCES,
    consentPreferencesSchema,
  );

  // Only render SpeedInsights if component has mounted and user has given consent
  // Disable speed insights in development and preview environments
  const isProduction = isAnalyticsProductionEnvironment();

  if (mounted === false || !preferences.speedInsights || !isProduction) {
    return null;
  }

  return <SpeedInsights />;
}
