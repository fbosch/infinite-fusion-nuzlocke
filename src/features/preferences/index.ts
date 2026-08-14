"use client";

// biome-ignore lint/performance/noBarrelFile: Feature boundaries expose explicit public APIs.
export { getDocumentReducedMotion } from "@/shared/utils/reduced-motion";
export {
  ConditionalAnalytics,
  ConditionalSpeedInsights,
} from "./components/conditional-analytics";
export { CookieConsent } from "./components/cookie-consent";
export { CookieSettings } from "./components/cookie-settings";
export { PlaythroughResumeObserver } from "./components/playthrough-resume-observer";
export { ReducedMotionController } from "./components/reduced-motion-controller";
export { default as SettingsModal } from "./components/settings-modal";
export { ThemeProvider } from "./components/theme-provider";
export { default as ThemeToggle } from "./components/theme-toggle";
export type { ConsentPreferences } from "./model/consent-preferences";
export {
  consentGivenSchema,
  consentPreferencesSchema,
  DEFAULT_CONSENT_PREFERENCES,
} from "./model/consent-preferences";
export { settingsActions, settingsStore } from "./model/settings";
export { useReducedMotion } from "./model/use-reduced-motion";
