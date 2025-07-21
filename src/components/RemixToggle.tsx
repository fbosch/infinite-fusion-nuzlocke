'use client';

import React from 'react';
import clsx from 'clsx';
import {
  playthroughActions,
  useActivePlaythrough,
  useIsRemixMode,
} from '@/stores/playthroughs';

export default function RemixToggle() {
  const activePlaythrough = useActivePlaythrough();
  const isRemixMode = useIsRemixMode();

  const handleToggle = (targetMode: 'classic' | 'remix') => {
    if (!activePlaythrough) return;

    const shouldToggle =
      (targetMode === 'remix' && !isRemixMode) ||
      (targetMode === 'classic' && isRemixMode);

    if (shouldToggle) {
      playthroughActions.toggleRemixMode();
    }
  };

  return (
    <fieldset
      className={clsx(
        'relative flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1',
        'border border-gray-200 dark:border-gray-600',
        !activePlaythrough && 'opacity-50'
      )}
      disabled={!activePlaythrough}
      aria-describedby={
        !activePlaythrough ? 'remix-toggle-disabled-help' : undefined
      }
    >
      <legend className='sr-only'>Game Mode Selection</legend>
      {activePlaythrough && (
        <div
          className={clsx(
            'absolute top-1 bottom-1 left-1 w-16 bg-white dark:bg-gray-800 rounded-md shadow-sm transition-transform duration-200 ease-out',
            'border border-gray-200 dark:border-gray-500',
            isRemixMode ? 'translate-x-16' : 'translate-x-0'
          )}
          aria-hidden='true'
        />
      )}
      <button
        type='button'
        onClick={() => handleToggle('classic')}
        disabled={!activePlaythrough}
        className={clsx(
          'relative z-10 w-16 py-1.5 text-sm font-medium transition-colors duration-200 text-center',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-gray-700',
          !isRemixMode
            ? 'text-gray-900 dark:text-gray-100'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
          activePlaythrough && 'cursor-pointer'
        )}
        aria-pressed={!isRemixMode}
        aria-label={`Switch to Classic mode${!isRemixMode ? ' (currently selected)' : ''}`}
      >
        Classic
      </button>

      <button
        type='button'
        onClick={() => handleToggle('remix')}
        disabled={!activePlaythrough}
        className={clsx(
          'relative z-10 w-16 py-1.5 text-sm font-medium transition-colors duration-200 text-center',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-gray-700',
          isRemixMode
            ? 'text-purple-700 dark:text-purple-300'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
          activePlaythrough && 'cursor-pointer'
        )}
        aria-pressed={isRemixMode}
        aria-label={`Switch to Remix mode${isRemixMode ? ' (currently selected)' : ''}`}
      >
        Remix
      </button>
      <div
        role='status'
        aria-live='polite'
        aria-atomic='true'
        className='sr-only'
      >
        {activePlaythrough && `Game mode: ${isRemixMode ? 'Remix' : 'Classic'}`}
      </div>
    </fieldset>
  );
}
