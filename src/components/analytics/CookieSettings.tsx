'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { Cookie, X } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export interface ConsentPreferences {
  analytics: boolean;
  speedInsights: boolean;
}

const DEFAULT_PREFERENCES: ConsentPreferences = {
  analytics: false,
  speedInsights: false,
};

interface CookieSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CookieSettings({ isOpen, onClose }: CookieSettingsProps) {
  const [preferences, setStoredPreferences] =
    useLocalStorage<ConsentPreferences>(
      'cookie-preferences',
      DEFAULT_PREFERENCES
    );
  const [localPreferences, setLocalPreferences] =
    useState<ConsentPreferences>(preferences);

  // Sync local state with stored preferences when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLocalPreferences(preferences);
    }
  }, [isOpen, preferences]);

  const savePreferences = (newPreferences: ConsentPreferences) => {
    setStoredPreferences(newPreferences);
    onClose();
  };

  const handlePreferenceChange = (
    key: keyof ConsentPreferences,
    value: boolean
  ) => {
    setLocalPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className='relative z-50'>
      {/* Backdrop */}
      <div className='fixed inset-0 bg-black/50' aria-hidden='true' />

      {/* Full-screen container to center the panel */}
      <div className='fixed inset-0 flex items-center justify-center p-4'>
        <Dialog.Panel className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-w-lg w-full'>
          <div className='p-6'>
            <div className='flex items-center justify-between mb-6'>
              <div className='flex items-center space-x-2'>
                <Cookie className='h-6 w-6 text-blue-600 dark:text-blue-400' />
                <Dialog.Title className='text-xl font-semibold text-gray-900 dark:text-white'>
                  Cookie Preferences
                </Dialog.Title>
              </div>
              <button
                onClick={onClose}
                className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                aria-label='Close cookie settings'
              >
                <X className='h-6 w-6' />
              </button>
            </div>

            <div className='space-y-6 mb-6'>
              <div>
                <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-4'>
                  Manage your cookie preferences
                </h3>
                <Dialog.Description className='text-sm text-gray-600 dark:text-gray-300 mb-6'>
                  You can enable or disable different types of cookies below.
                  These settings will be saved to your browser and you can
                  change them at any time.
                </Dialog.Description>
              </div>

              <div className='space-y-4'>
                <div className='border border-gray-200 dark:border-gray-600 rounded-lg p-4'>
                  <div className='flex items-center justify-between mb-2'>
                    <h4 className='font-medium text-gray-900 dark:text-white'>
                      Essential Cookies
                    </h4>
                    <div className='text-sm text-gray-500 dark:text-gray-400 font-medium'>
                      Always Active
                    </div>
                  </div>
                  <p className='text-sm text-gray-600 dark:text-gray-300'>
                    These cookies are necessary for the website to function and
                    cannot be switched off. They are usually only set in
                    response to actions made by you.
                  </p>
                </div>

                <div className='border border-gray-200 dark:border-gray-600 rounded-lg p-4'>
                  <div className='flex items-center justify-between mb-2'>
                    <h4 className='font-medium text-gray-900 dark:text-white'>
                      Analytics Cookies
                    </h4>
                    <label className='relative inline-flex items-center cursor-pointer'>
                      <input
                        type='checkbox'
                        checked={localPreferences.analytics}
                        onChange={e =>
                          handlePreferenceChange('analytics', e.target.checked)
                        }
                        className='sr-only peer'
                        aria-describedby='analytics-description'
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p
                    id='analytics-description'
                    className='text-sm text-gray-600 dark:text-gray-300'
                  >
                    These cookies help us understand how visitors interact with
                    our website by collecting and reporting information
                    anonymously.
                  </p>
                </div>

                <div className='border border-gray-200 dark:border-gray-600 rounded-lg p-4'>
                  <div className='flex items-center justify-between mb-2'>
                    <h4 className='font-medium text-gray-900 dark:text-white'>
                      Performance Cookies
                    </h4>
                    <label className='relative inline-flex items-center cursor-pointer'>
                      <input
                        type='checkbox'
                        checked={localPreferences.speedInsights}
                        onChange={e =>
                          handlePreferenceChange(
                            'speedInsights',
                            e.target.checked
                          )
                        }
                        className='sr-only peer'
                        aria-describedby='performance-description'
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p
                    id='performance-description'
                    className='text-sm text-gray-600 dark:text-gray-300'
                  >
                    These cookies allow us to monitor and improve the
                    performance of our website by collecting information about
                    how the site is used.
                  </p>
                </div>
              </div>
            </div>

            <div className='flex space-x-3'>
              <button
                onClick={() => savePreferences(localPreferences)}
                className='flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors cursor-pointer'
              >
                Save Preferences
              </button>
              <button
                onClick={() => savePreferences(DEFAULT_PREFERENCES)}
                className='flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-3 px-4 rounded-md transition-colors cursor-pointer'
              >
                Reject All
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
