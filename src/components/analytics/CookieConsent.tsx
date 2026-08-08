"use client";

import { Description, Field, Label, Switch } from "@headlessui/react";
import { Cookie, Settings, X } from "lucide-react";
import { useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useMounted } from "@/hooks/useMounted";
import {
  type ConsentPreferences,
  consentGivenSchema,
  consentPreferencesSchema,
  DEFAULT_CONSENT_PREFERENCES,
} from "@/lib/consentPreferences";

interface CookieBannerProps {
  onAcceptAll: () => void;
  onOpenSettings: () => void;
  onRejectAll: () => void;
}

function CookieBanner({
  onAcceptAll,
  onRejectAll,
  onOpenSettings,
}: CookieBannerProps) {
  return (
    <div className="p-4">
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
        {/* Content section */}
        <div className="flex items-start space-x-3">
          <Cookie className="mt-1 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="text-base text-gray-900 dark:text-white">
              This site uses cookies
            </h3>
            <p className="mt-1 text-gray-600 text-sm sm:mt-0 dark:text-gray-300">
              Cookies help analyze site traffic and enhance your experience. You
              can manage your preferences any time.
            </p>
          </div>
        </div>

        {/* Actions section */}
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <button
            className="order-1 whitespace-nowrap rounded bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 sm:order-1 sm:px-3 sm:py-1.5"
            onClick={onAcceptAll}
            type="button"
          >
            Accept All
          </button>
          <button
            className="order-2 whitespace-nowrap rounded bg-gray-200 px-4 py-2 text-gray-900 text-sm transition-colors hover:bg-gray-300 sm:order-2 sm:px-3 sm:py-1.5 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
            onClick={onOpenSettings}
            type="button"
          >
            Customize
          </button>
          <button
            className="order-3 whitespace-nowrap rounded border border-gray-300 px-4 py-2 text-gray-600 text-sm transition-colors hover:text-gray-800 sm:order-3 sm:border-0 sm:px-3 sm:py-1.5 dark:border-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
            onClick={onRejectAll}
            type="button"
          >
            Reject All
          </button>
        </div>
      </div>
    </div>
  );
}

interface CookieSettingsProps {
  onClose: () => void;
  onPreferenceChange: (key: keyof ConsentPreferences, value: boolean) => void;
  onRejectAll: () => void;
  onSavePreferences: () => void;
  preferences: ConsentPreferences;
}

function CookieSettings({
  preferences,
  onPreferenceChange,
  onSavePreferences,
  onRejectAll,
  onClose,
}: CookieSettingsProps) {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-gray-900 text-lg dark:text-white">
            Cookie Preferences
          </h3>
        </div>
        <button
          aria-label="Close settings"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          onClick={onClose}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-6 space-y-6">
        <Field className="flex items-start justify-between">
          <div className="flex-1 pr-4">
            <Label className="text-gray-900 dark:text-white">Analytics</Label>
            <Description className="mt-1 text-gray-600 text-sm dark:text-gray-300">
              Help us understand how you use our app to improve your experience.
            </Description>
          </div>
          <Switch
            checked={preferences.analytics}
            className="group inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition data-checked:bg-blue-600 dark:bg-gray-700"
            onChange={(checked) => onPreferenceChange("analytics", checked)}
          >
            <span className="size-4 translate-x-1 rounded-full bg-white transition group-data-checked:translate-x-6" />
          </Switch>
        </Field>

        <Field className="flex items-start justify-between">
          <div className="flex-1 pr-4">
            <Label className="text-gray-900 dark:text-white">
              Performance Monitoring
            </Label>
            <Description className="mt-1 text-gray-600 text-sm dark:text-gray-300">
              Monitor app performance to identify and fix issues.
            </Description>
          </div>
          <Switch
            checked={preferences.speedInsights}
            className="group inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition data-checked:bg-blue-600 dark:bg-gray-700"
            onChange={(checked) => onPreferenceChange("speedInsights", checked)}
          >
            <span className="size-4 translate-x-1 rounded-full bg-white transition group-data-checked:translate-x-6" />
          </Switch>
        </Field>
      </div>

      <div className="flex space-x-3">
        <button
          className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          onClick={onSavePreferences}
          type="button"
        >
          Save Preferences
        </button>
        <button
          className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-gray-900 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
          onClick={onRejectAll}
          type="button"
        >
          Reject All
        </button>
      </div>
    </div>
  );
}

export function CookieConsent() {
  const [showSettings, setShowSettings] = useState(false);
  const mounted = useMounted();
  const [hasConsent, setHasConsent] = useLocalStorage(
    "cookie-consent",
    false,
    consentGivenSchema,
  );
  const [preferences, setPreferences] = useLocalStorage<ConsentPreferences>(
    "cookie-preferences",
    DEFAULT_CONSENT_PREFERENCES,
    consentPreferencesSchema,
  );

  const savePreferences = (newPreferences: ConsentPreferences) => {
    setPreferences(newPreferences);
    setHasConsent(true);
    setShowSettings(false);
  };

  const acceptAll = () => {
    savePreferences({
      analytics: true,
      speedInsights: true,
    });
  };

  const rejectAll = () => {
    savePreferences(DEFAULT_CONSENT_PREFERENCES);
  };

  const handlePreferenceChange = (
    key: keyof ConsentPreferences,
    value: boolean,
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
  };

  // Don't show banner if user has already given consent or component hasn't mounted yet
  if (mounted === false || hasConsent) {
    return null;
  }

  return (
    <>
      {/* Backdrop overlay - only bottom area */}
      <div className="pointer-events-none fixed right-0 bottom-0 left-0 z-40 h-64 bg-gradient-to-t from-gray-800/10 to-transparent dark:from-gray-800/20 dark:to-transparent" />

      <div className="fixed bottom-0 w-full lg:bottom-2 lg:left-1/2 lg:max-w-[1000px] lg:-translate-x-1/2">
        <div className="pointer-events-auto w-full border-gray-200 border-t bg-white shadow-xl lg:rounded-md lg:border dark:border-gray-700 dark:bg-gray-800">
          {showSettings ? (
            <CookieSettings
              onClose={() => setShowSettings(false)}
              onPreferenceChange={handlePreferenceChange}
              onRejectAll={rejectAll}
              onSavePreferences={handleSavePreferences}
              preferences={preferences}
            />
          ) : (
            <CookieBanner
              onAcceptAll={acceptAll}
              onOpenSettings={() => setShowSettings(true)}
              onRejectAll={rejectAll}
            />
          )}
        </div>
      </div>
    </>
  );
}
