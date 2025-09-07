'use client';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import { Switch, Field, Label, Description } from '@headlessui/react';
import { X, Monitor, Sun, Moon, Move } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useSnapshot } from 'valtio';
import { settingsStore, settingsActions } from '@/stores/settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const settings = useSnapshot(settingsStore);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className='relative z-50 group'>
      <DialogBackdrop
        transition
        className='fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[2px] data-closed:opacity-0 data-enter:opacity-100'
        aria-hidden='true'
      />

      <div className='fixed inset-0 flex w-screen items-center justify-center p-4'>
        <DialogPanel
          transition
          className={clsx(
            'max-w-md w-full space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6',
            'transition duration-150 ease-out data-closed:opacity-0 data-closed:scale-98'
          )}
        >
          <div className='flex items-center justify-between'>
            <DialogTitle className='text-xl font-semibold text-gray-900 dark:text-white'>
              Settings
            </DialogTitle>
            <button
              onClick={onClose}
              className={clsx(
                'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2',
                'p-1 rounded-md transition-colors cursor-pointer'
              )}
              aria-label='Close modal'
            >
              <X className='h-5 w-5' />
            </button>
          </div>

          <div className='space-y-4 pt-2'>
            <div className='flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700'>
              <div className='flex items-center gap-3'>
                <div className='flex-shrink-0 p-2 rounded-md bg-gray-100 dark:bg-gray-800'>
                  <Monitor className='h-4 w-4 text-gray-600 dark:text-gray-300' />
                </div>
                <div>
                  <h3 className='text-sm font-medium text-gray-900 dark:text-white'>
                    Theme
                  </h3>
                  <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                    Choose your preferred color scheme
                  </p>
                </div>
              </div>
              <div className='flex items-center bg-gray-100 dark:bg-gray-800 rounded-md p-0.5'>
                {[
                  { value: 'system', icon: Monitor, label: 'System' },
                  { value: 'light', icon: Sun, label: 'Light' },
                  { value: 'dark', icon: Moon, label: 'Dark' },
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={clsx(
                      'flex items-center justify-center w-8 h-8 rounded transition-all duration-200 cursor-pointer',
                      theme === value
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    )}
                    aria-label={label}
                    title={label}
                  >
                    <Icon className='w-4 h-4' />
                  </button>
                ))}
              </div>
            </div>

            <Field className='flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700'>
              <div className='flex items-center gap-3'>
                <div className='flex-shrink-0 p-2 rounded-md bg-gray-100 dark:bg-gray-800'>
                  <Move className='h-4 w-4 text-gray-600 dark:text-gray-300' />
                </div>
                <div>
                  <Label className='text-sm font-medium text-gray-900 dark:text-white'>
                    Move Encounters
                  </Label>
                  <Description className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                    Allow moving encounters between locations
                  </Description>
                </div>
              </div>
              <Switch
                checked={settings.moveEncountersBetweenLocations}
                onChange={settingsActions.toggleMoveEncountersBetweenLocations}
                className='group inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition data-checked:bg-blue-600'
              >
                <span className='size-4 translate-x-1 rounded-full bg-white transition group-data-checked:translate-x-6' />
              </Switch>
            </Field>
          </div>

          <div className='flex justify-end pt-4'>
            <button
              type='button'
              onClick={onClose}
              className='inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors'
            >
              Done
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
