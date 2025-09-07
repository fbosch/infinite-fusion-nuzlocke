'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogBackdrop,
} from '@headlessui/react';
import { Switch, Field, Label, Description } from '@headlessui/react';
import { Cookie, X } from 'lucide-react';
import clsx from 'clsx';
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
    <Dialog open={isOpen} onClose={onClose} className='relative z-50 group'>
      <DialogBackdrop
        transition
        className='fixed inset-0 bg-black/50 backdrop-blur-[2px] data-closed:opacity-0 data-enter:opacity-100'
        aria-hidden='true'
      />

      <div className='fixed inset-0 flex items-center justify-center p-4'>
        <DialogPanel
          transition
          className={clsx(
            'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-w-lg w-full',
            'transition duration-150 ease-out data-closed:opacity-0 data-closed:scale-98'
          )}
        >
          <div className='p-6'>
            <div className='flex items-center justify-between mb-6'>
              <div className='flex items-center space-x-2'>
                <Cookie className='h-6 w-6 text-blue-600 dark:text-blue-400' />
                <DialogTitle className='text-xl  text-gray-900 dark:text-white'>
                  Cookie Preferences
                </DialogTitle>
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
                <h3 className='text-lg  text-gray-900 dark:text-white mb-4'>
                  Manage your cookie preferences
                </h3>
                <p className='text-sm text-gray-600 dark:text-gray-300 mb-6'>
                  You can enable or disable different types of cookies below.
                  These settings will be saved to your browser and you can
                  change them at any time.
                </p>
              </div>

              <div className='space-y-4'>
                <div className='border border-gray-200 dark:border-gray-600 rounded-lg p-4'>
                  <div className='flex items-center justify-between mb-2'>
                    <h4 className=' text-gray-900 dark:text-white'>
                      Essential Cookies
                    </h4>
                    <div className='text-sm text-gray-500 dark:text-gray-400 '>
                      Always Active
                    </div>
                  </div>
                  <p className='text-sm text-gray-600 dark:text-gray-300'>
                    These cookies are necessary for the website to function and
                    cannot be switched off. They are usually only set in
                    response to actions made by you.
                  </p>
                </div>

                <Field className='border border-gray-200 dark:border-gray-600 rounded-lg p-4'>
                  <div className='flex items-center justify-between mb-2'>
                    <Label className=' text-gray-900 dark:text-white'>
                      Analytics Cookies
                    </Label>
                    <Switch
                      checked={localPreferences.analytics}
                      onChange={checked =>
                        handlePreferenceChange('analytics', checked)
                      }
                      className='group inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition data-checked:bg-blue-600'
                    >
                      <span className='size-4 translate-x-1 rounded-full bg-white transition group-data-checked:translate-x-6' />
                    </Switch>
                  </div>
                  <Description className='text-sm text-gray-600 dark:text-gray-300'>
                    These cookies help us understand how visitors interact with
                    our website by collecting and reporting information
                    anonymously.
                  </Description>
                </Field>

                <Field className='border border-gray-200 dark:border-gray-600 rounded-lg p-4'>
                  <div className='flex items-center justify-between mb-2'>
                    <Label className=' text-gray-900 dark:text-white'>
                      Performance Cookies
                    </Label>
                    <Switch
                      checked={localPreferences.speedInsights}
                      onChange={checked =>
                        handlePreferenceChange('speedInsights', checked)
                      }
                      className='group inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition data-checked:bg-blue-600'
                    >
                      <span className='size-4 translate-x-1 rounded-full bg-white transition group-data-checked:translate-x-6' />
                    </Switch>
                  </div>
                  <Description className='text-sm text-gray-600 dark:text-gray-300'>
                    These cookies allow us to monitor and improve the
                    performance of our website by collecting information about
                    how the site is used.
                  </Description>
                </Field>
              </div>
            </div>

            <div className='flex space-x-3'>
              <button
                onClick={() => savePreferences(DEFAULT_PREFERENCES)}
                className='flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white  py-3 px-4 rounded-md transition-colors'
              >
                Reject All
              </button>
              <button
                onClick={() => savePreferences(localPreferences)}
                className='flex-1 bg-blue-600 hover:bg-blue-700 text-white  py-3 px-4 rounded-md transition-colors'
              >
                Save Preferences
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
