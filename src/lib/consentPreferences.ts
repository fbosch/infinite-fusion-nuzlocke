import type { SafeParser } from "@/hooks/use-local-storage";

export interface ConsentPreferences {
  analytics: boolean;
  speedInsights: boolean;
}

const isConsentPreferences = (value: unknown): value is ConsentPreferences =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as ConsentPreferences).analytics === "boolean" &&
  typeof (value as ConsentPreferences).speedInsights === "boolean";

export const consentPreferencesSchema: SafeParser<ConsentPreferences> = {
  safeParse: (value) =>
    isConsentPreferences(value)
      ? { data: value, success: true }
      : { success: false },
};

export const consentGivenSchema: SafeParser<boolean> = {
  safeParse: (value) =>
    typeof value === "boolean"
      ? { data: value, success: true }
      : { success: false },
};

export const DEFAULT_CONSENT_PREFERENCES: ConsentPreferences = {
  analytics: false,
  speedInsights: false,
};
