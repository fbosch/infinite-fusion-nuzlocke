import { z } from "zod";

export const consentPreferencesSchema = z.object({
  analytics: z.boolean(),
  speedInsights: z.boolean(),
});

export const consentGivenSchema = z.boolean();

export type ConsentPreferences = z.infer<typeof consentPreferencesSchema>;

export const DEFAULT_CONSENT_PREFERENCES: ConsentPreferences = {
  analytics: false,
  speedInsights: false,
};
