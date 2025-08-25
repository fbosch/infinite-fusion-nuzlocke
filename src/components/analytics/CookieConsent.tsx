'use client';

import { useState, useEffect } from 'react';
import { X, Cookie, Settings } from 'lucide-react';
import { Switch, Field, Label, Description } from '@headlessui/react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export interface ConsentPreferences {
  analytics: boolean;
  speedInsights: boolean;
}

const DEFAULT_PREFERENCES: ConsentPreferences = {
  analytics: false,
  speedInsights: false,
};

interface CookieBannerProps {
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onOpenSettings: () => void;
}

function CookieBanner({
  onAcceptAll,
  onRejectAll,
  onOpenSettings,
}: CookieBannerProps) {
  return (
    <div className='p-4'>
      <div className='grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 sm:gap-6 items-start sm:items-center'>
        {/* Content section */}
        <div className='flex items-start space-x-3'>
          <Cookie className='h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1' />
          <div>
            <h3 className='text-base  text-gray-900 dark:text-white'>
              This site uses cookies
            </h3>
            <p className='text-sm text-gray-600 dark:text-gray-300 mt-1 sm:mt-0'>
              Cookies help analyze site traffic and enhance your experience. You
              can manage your preferences any time.
            </p>
          </div>
        </div>

        {/* Actions section */}
        <div className='flex flex-col sm:flex-row gap-2 sm:gap-3'>
          <button
            onClick={onAcceptAll}
            className='bg-blue-600 hover:bg-blue-700 text-white  py-2 sm:py-1.5 px-4 sm:px-3 rounded text-sm transition-colors whitespace-nowrap order-1 sm:order-1'
          >
            Accept All
          </button>
          <button
            onClick={onOpenSettings}
            className='bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white  py-2 sm:py-1.5 px-4 sm:px-3 rounded text-sm transition-colors whitespace-nowrap order-2 sm:order-2'
          >
            Customize
          </button>
          <button
            onClick={onRejectAll}
            className='text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100  py-2 sm:py-1.5 px-4 sm:px-3 text-sm transition-colors whitespace-nowrap border border-gray-300 dark:border-gray-600 sm:border-0 rounded order-3 sm:order-3'
          >
            Reject All
          </button>
        </div>
      </div>
    </div>
  );
}

interface CookieSettingsProps {
  preferences: ConsentPreferences;
  onPreferenceChange: (key: keyof ConsentPreferences, value: boolean) => void;
  onSavePreferences: () => void;
  onRejectAll: () => void;
  onClose: () => void;
}

function CookieSettings({
  preferences,
  onPreferenceChange,
  onSavePreferences,
  onRejectAll,
  onClose,
}: CookieSettingsProps) {
  return (
    <div className='p-6'>
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center space-x-2'>
          <Settings className='h-5 w-5 text-blue-600 dark:text-blue-400' />
          <h3 className='text-lg  text-gray-900 dark:text-white'>
            Cookie Preferences
          </h3>
        </div>
        <button
          onClick={onClose}
          className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
          aria-label='Close settings'
        >
          <X className='h-5 w-5' />
        </button>
      </div>

      <div className='space-y-6 mb-6'>
        <Field className='flex items-start justify-between'>
          <div className='flex-1 pr-4'>
            <Label className=' text-gray-900 dark:text-white'>Analytics</Label>
            <Description className='text-sm text-gray-600 dark:text-gray-300 mt-1'>
              Help us understand how you use our app to improve your experience.
            </Description>
          </div>
          <Switch
            checked={preferences.analytics}
            onChange={checked => onPreferenceChange('analytics', checked)}
            className='group inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition data-checked:bg-blue-600'
          >
            <span className='size-4 translate-x-1 rounded-full bg-white transition group-data-checked:translate-x-6' />
          </Switch>
        </Field>

        <Field className='flex items-start justify-between'>
          <div className='flex-1 pr-4'>
            <Label className=' text-gray-900 dark:text-white'>
              Performance Monitoring
            </Label>
            <Description className='text-sm text-gray-600 dark:text-gray-300 mt-1'>
              Monitor app performance to identify and fix issues.
            </Description>
          </div>
          <Switch
            checked={preferences.speedInsights}
            onChange={checked => onPreferenceChange('speedInsights', checked)}
            className='group inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition data-checked:bg-blue-600'
          >
            <span className='size-4 translate-x-1 rounded-full bg-white transition group-data-checked:translate-x-6' />
          </Switch>
        </Field>
      </div>

      <div className='flex space-x-3'>
        <button
          onClick={onSavePreferences}
          className='flex-1 bg-blue-600 hover:bg-blue-700 text-white  py-2 px-4 rounded-md transition-colors'
        >
          Save Preferences
        </button>
        <button
          onClick={onRejectAll}
          className='flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white  py-2 px-4 rounded-md transition-colors'
        >
          Reject All
        </button>
      </div>
    </div>
  );
}

export function CookieConsent() {
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hasConsent, setHasConsent] = useLocalStorage('cookie-consent', false);
  const [preferences, setPreferences] = useLocalStorage<ConsentPreferences>(
    'cookie-preferences',
    DEFAULT_PREFERENCES
  );

  useEffect(() => {
    setMounted(true);
  }, []);

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
    savePreferences(DEFAULT_PREFERENCES);
  };

  const handlePreferenceChange = (
    key: keyof ConsentPreferences,
    value: boolean
  ) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
  };

  // Don't show banner if user has already given consent or component hasn't mounted yet
  if (!mounted || hasConsent) return null;

  return (
    <>
      {/* Backdrop overlay - only bottom area */}
      <div className='fixed bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-gray-800/10 to-transparent dark:from-gray-800/20 dark:to-transparent z-40 pointer-events-none' />

      <div className='fixed bottom-0 lg:bottom-2 w-full lg:max-w-[1000px] lg:left-1/2 lg:-translate-x-1/2'>
        <div className='bg-white dark:bg-gray-800 border-t lg:border border-gray-200 dark:border-gray-700 shadow-xl w-full pointer-events-auto lg:rounded-md'>
          {showSettings ? (
            <CookieSettings
              preferences={preferences}
              onPreferenceChange={handlePreferenceChange}
              onSavePreferences={handleSavePreferences}
              onRejectAll={rejectAll}
              onClose={() => setShowSettings(false)}
            />
          ) : (
            <CookieBanner
              onAcceptAll={acceptAll}
              onRejectAll={rejectAll}
              onOpenSettings={() => setShowSettings(true)}
            />
          )}
        </div>
      </div>
    </>
  );
}

// Hook to check if analytics should be loaded
export function useAnalyticsConsent() {
  const [preferences] = useLocalStorage<ConsentPreferences>(
    'cookie-preferences',
    DEFAULT_PREFERENCES
  );
  return preferences.analytics;
}

// Hook to check if speed insights should be loaded
export function useSpeedInsightsConsent() {
  const [preferences] = useLocalStorage<ConsentPreferences>(
    'cookie-preferences',
    DEFAULT_PREFERENCES
  );
  return preferences.speedInsights;
}
