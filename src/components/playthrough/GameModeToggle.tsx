'use client';

import React, { useOptimistic, useTransition } from 'react';
import clsx from 'clsx';
import { HelpCircle } from 'lucide-react';
import {
  playthroughActions,
  useActivePlaythrough,
  useGameMode,
  type GameMode,
} from '@/stores/playthroughs';
import { CursorTooltip } from '@/components/CursorTooltip';
import { useBreakpointSmallerThan } from '@/hooks/useBreakpoint';

const GameModeToggle = React.memo(function GameModeToggle() {
  const activePlaythrough = useActivePlaythrough();
  const actualGameMode = useGameMode();
  const [isPending, startTransition] = useTransition();
  const isMobile = useBreakpointSmallerThan('md');

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
    <div className='flex items-center gap-2'>
      <fieldset
        className={clsx(
          'relative flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 sm:p-1',
          'border border-gray-200 dark:border-gray-600 font-medium',
          'h-[36px] sm:h-[42px] w-[180px] sm:w-auto',
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
              'absolute top-1 bottom-1 left-0.5 sm:left-1 w-14 sm:w-16 md:w-20 bg-white dark:bg-gray-800 rounded-md shadow-sm transition-transform duration-200 ease-out',
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
            'relative z-10 w-14 sm:w-16 md:w-20 h-[28px] sm:h-[32px] py-1 sm:py-1.5 text-xs sm:text-sm  text-center',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-gray-700',
            optimisticMode === 'classic'
              ? 'text-gray-900 dark:text-gray-100'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            activePlaythrough && 'cursor-pointer transition-colors duration-150'
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
            'relative z-10 w-14 sm:w-16 md:w-20 h-[28px] sm:h-[32px] py-1 sm:py-1.5 text-xs sm:text-sm  text-center',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-gray-700',
            optimisticMode === 'remix'
              ? 'text-purple-700 dark:text-purple-300'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            activePlaythrough && 'cursor-pointer transition-colors duration-150'
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
            'relative z-10 w-14 sm:w-16 md:w-20 h-[28px] sm:h-[32px] py-1 sm:py-1.5 text-xs sm:text-sm  text-center',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-gray-700',
            optimisticMode === 'randomized'
              ? 'text-orange-700 dark:text-orange-300'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            activePlaythrough && 'cursor-pointer transition-colors duration-150'
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

      <CursorTooltip
        placement={'bottom-end'}
        disabled={isMobile}
        delay={500}
        offset={{ mainAxis: 10, crossAxis: 10 }}
        content={
          <div className='max-w-sm text-xs font-normal leading-5 space-y-2 divide-y divide-gray-200 dark:divide-gray-600 gap-y-4'>
            <div>
              <strong className='text-gray-900 dark:text-gray-100'>
                Classic
              </strong>
              <p className='my-2'>
                Uses the standard encounter tables and route data. The tracker
                will show traditional Pokémon encounters for each route and
                location.
              </p>
            </div>
            <div>
              <strong className='text-purple-700 dark:text-purple-300'>
                Remix
              </strong>
              <p className='my-2'>
                Uses modified encounter tables with different Pokémon
                availability per route. The tracker will show updated encounters
                that include more diverse Pokémon in early game areas.
              </p>
            </div>
            <div>
              <strong className='text-orange-700 dark:text-orange-300'>
                Random
              </strong>
              <p className='my-2'>
                Uses randomized encounters where any Pokémon can appear in any
                location.
              </p>
            </div>
          </div>
        }
      >
        <button
          type='button'
          className={clsx(
            'flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1',
            'transition-colors duration-150 cursor-help md:block hidden'
          )}
          aria-label='Show game mode descriptions'
        >
          <HelpCircle className='w-4 h-4' />
        </button>
      </CursorTooltip>
    </div>
  );
});

export default GameModeToggle;
