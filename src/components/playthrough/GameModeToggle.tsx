'use client';

import React, { useOptimistic, useTransition } from 'react';
import clsx from 'clsx';
import {
  playthroughActions,
  useActivePlaythrough,
  useGameMode,
  type GameMode,
} from '@/stores/playthroughs';

const GameModeToggle = function GameModeToggle() {
  const activePlaythrough = useActivePlaythrough();
  const actualGameMode = useGameMode();
  const [isPending, startTransition] = useTransition();

  // React 19's useOptimistic hook for instant UI updates
  const [optimisticMode, setOptimisticMode] = useOptimistic(
    actualGameMode,
    (currentState, newMode: GameMode) => newMode
  );

  const handleModeSelect = React.useCallback(
    (targetMode: GameMode) => {
      if (!activePlaythrough || isPending || optimisticMode === targetMode)
        return;

      startTransition(() => {
        // Optimistic update - instant UI response
        setOptimisticMode(targetMode);

        // Actual state update
        playthroughActions.setGameMode(targetMode);
      });
    },
    [activePlaythrough, optimisticMode, isPending, setOptimisticMode]
  );

  // Calculate background position based on selected mode
  const getBackgroundPosition = (mode: GameMode): string => {
    switch (mode) {
      case 'classic':
        return 'translate-x-0';
      case 'remix':
        return 'translate-x-14 sm:translate-x-16 md:translate-x-20'; // Smaller on mobile
      case 'randomized':
        return 'translate-x-28 sm:translate-x-32 md:translate-x-40'; // Smaller on mobile
      default:
        return 'translate-x-0';
    }
  };

  return (
    <div className='flex items-center'>
      <fieldset
        className={clsx(
          'relative flex items-center bg-white dark:bg-gray-800 rounded-t-xl p-0.5 sm:p-1',
          'border-b-0 border border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500',
          'font-medium backdrop-blur-sm',
          'h-[40px] sm:h-[44px] w-[180px] sm:w-auto',
          'transition-all duration-200 ease-out',
          !activePlaythrough && 'opacity-50'
        )}
        disabled={!activePlaythrough}
        aria-describedby={
          !activePlaythrough ? 'game-mode-toggle-disabled-help' : undefined
        }
      >
        <legend className='sr-only'>Game Mode Selection</legend>
        {activePlaythrough && (
          <div
            className={clsx(
              'absolute top-1 bottom-1 left-0.5 sm:left-1 w-14 sm:w-16 md:w-20 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-elevation-1 transition-transform duration-200 ease-out',
              'border border-gray-200 dark:border-gray-500',
              getBackgroundPosition(optimisticMode)
            )}
            aria-hidden='true'
          />
        )}

        <button
          type='button'
          onClick={() => handleModeSelect('classic')}
          disabled={!activePlaythrough}
          className={clsx(
            'relative z-10 w-14 sm:w-16 md:w-20 h-[32px] sm:h-[36px] py-1.5 sm:py-2 text-xs sm:text-sm text-center',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
            'focus-visible:border-blue-500 dark:focus-visible:border-blue-400',
            optimisticMode === 'classic'
              ? 'text-gray-900 dark:text-gray-100'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            activePlaythrough && 'cursor-pointer transition-colors duration-200'
          )}
          aria-pressed={optimisticMode === 'classic'}
          aria-label={`Switch to Classic mode${optimisticMode === 'classic' ? ' (currently selected)' : ''}`}
        >
          Classic
        </button>

        <button
          type='button'
          onClick={() => handleModeSelect('remix')}
          disabled={!activePlaythrough}
          className={clsx(
            'relative z-10 w-14 sm:w-16 md:w-20 h-[32px] sm:h-[36px] py-1.5 sm:py-2 text-xs sm:text-sm text-center',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
            'focus-visible:border-blue-500 dark:focus-visible:border-blue-400',
            optimisticMode === 'remix'
              ? 'text-purple-700 dark:text-purple-300'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            activePlaythrough && 'cursor-pointer transition-colors duration-200'
          )}
          aria-pressed={optimisticMode === 'remix'}
          aria-label={`Switch to Remix mode${optimisticMode === 'remix' ? ' (currently selected)' : ''}`}
        >
          Remix
        </button>

        <button
          type='button'
          onClick={() => handleModeSelect('randomized')}
          disabled={!activePlaythrough}
          className={clsx(
            'relative z-10 w-14 sm:w-16 md:w-20 h-[32px] sm:h-[36px] py-1.5 sm:py-2 text-xs sm:text-sm text-center',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
            'focus-visible:border-blue-500 dark:focus-visible:border-blue-400',
            optimisticMode === 'randomized'
              ? 'text-orange-700 dark:text-orange-300'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            activePlaythrough && 'cursor-pointer transition-colors duration-200'
          )}
          aria-pressed={optimisticMode === 'randomized'}
          aria-label={`Switch to Randomized mode${optimisticMode === 'randomized' ? ' (currently selected)' : ''}`}
        >
          Random
        </button>

        <div
          role='status'
          aria-live='polite'
          aria-atomic='true'
          className='sr-only'
        >
          {activePlaythrough &&
            `Game mode: ${optimisticMode}${isPending ? ' (updating...)' : ''}`}
        </div>
      </fieldset>
    </div>
  );
};

export default GameModeToggle;
