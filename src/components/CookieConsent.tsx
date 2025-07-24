'use client';

import { useState } from 'react';
import { X, Cookie, Settings } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export interface ConsentPreferences {
  analytics: boolean;
  speedInsights: boolean;
}

const DEFAULT_PREFERENCES: ConsentPreferences = {
  analytics: false,
  speedInsights: false,
};

export function CookieConsent() {
  const [showSettings, setShowSettings] = useState(false);
  const [hasConsent, setHasConsent] = useLocalStorage('cookie-consent', false);
  const [preferences, setPreferences] = useLocalStorage<ConsentPreferences>(
    'cookie-preferences',
    DEFAULT_PREFERENCES
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

  // Don't show banner if user has already given consent
  if (hasConsent) return null;

  return (
    <div className='fixed bottom-0 left-1/2 -translate-x-1/2 z-50 max-w-[1700px] p-4 pointer-events-none'>
      <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg w-full pointer-events-auto rounded-md'>
        {showSettings ? (
          // Settings View
          <div className='p-6'>
            <div className='flex items-center justify-between mb-6'>
              <div className='flex items-center space-x-2'>
                <Settings className='h-5 w-5 text-blue-600 dark:text-blue-400' />
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                  Cookie Preferences
                </h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                aria-label='Close settings'
              >
                <X className='h-5 w-5' />
              </button>
            </div>

            <div className='space-y-6 mb-6'>
              <div className='flex items-start justify-between'>
                <div className='flex-1 pr-4'>
                  <h4 className='font-medium text-gray-900 dark:text-white'>
                    Analytics
                  </h4>
                  <p className='text-sm text-gray-600 dark:text-gray-300 mt-1'>
                    Help us understand how you use our app to improve your
                    experience.
                  </p>
                </div>
                <label className='relative inline-flex items-center cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={preferences.analytics}
                    onChange={e =>
                      handlePreferenceChange('analytics', e.target.checked)
                    }
                    className='sr-only peer'
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className='flex items-start justify-between'>
                <div className='flex-1 pr-4'>
                  <h4 className='font-medium text-gray-900 dark:text-white'>
                    Performance Monitoring
                  </h4>
                  <p className='text-sm text-gray-600 dark:text-gray-300 mt-1'>
                    Monitor app performance to identify and fix issues.
                  </p>
                </div>
                <label className='relative inline-flex items-center cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={preferences.speedInsights}
                    onChange={e =>
                      handlePreferenceChange('speedInsights', e.target.checked)
                    }
                    className='sr-only peer'
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className='flex space-x-3'>
              <button
                onClick={() => savePreferences(preferences)}
                className='flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors'
              >
                Save Preferences
              </button>
              <button
                onClick={rejectAll}
                className='flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-md transition-colors'
              >
                Reject All
              </button>
            </div>
          </div>
        ) : (
          // Banner View
          <div className='p-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-3'>
                <Cookie className='h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0' />
                <div>
                  <h3 className='text-base font-semibold text-gray-900 dark:text-white'>
                    We use cookies
                  </h3>
                  <p className='text-sm text-gray-600 dark:text-gray-300'>
                    We use cookies to analyze traffic and improve your
                    experience.
                  </p>
                </div>
              </div>

              <div className='flex items-center space-x-3 ml-4'>
                <button
                  onClick={acceptAll}
                  className='bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 px-3 rounded text-sm transition-colors whitespace-nowrap'
                >
                  Accept All
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className='bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-1.5 px-3 rounded text-sm transition-colors whitespace-nowrap'
                >
                  Customize
                </button>
                <button
                  onClick={rejectAll}
                  className='text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 font-medium py-1.5 px-3 text-sm transition-colors whitespace-nowrap'
                >
                  Reject All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
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
