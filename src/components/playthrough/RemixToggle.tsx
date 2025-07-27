'use client';

import React, { useOptimistic, useTransition } from 'react';
import clsx from 'clsx';
import {
  playthroughActions,
  useActivePlaythrough,
  useGameMode,
  type GameMode,
} from '@/stores/playthroughs';
import { CursorTooltip } from '../CursorTooltip';

const GameModeToggle = React.memo(function GameModeToggle() {
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
        return 'translate-x-20'; // 5rem (80px)
      case 'randomized':
        return 'translate-x-40'; // 10rem (160px)
      default:
        return 'translate-x-0';
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
        !activePlaythrough ? 'game-mode-toggle-disabled-help' : undefined
      }
    >
      <legend className='sr-only'>Game Mode Selection</legend>
      {activePlaythrough && (
        <div
          className={clsx(
            'absolute top-1 bottom-1 left-1 w-20 bg-white dark:bg-gray-800 rounded-md shadow-sm transition-transform duration-200 ease-out',
            'border border-gray-200 dark:border-gray-500',
            getBackgroundPosition(optimisticMode)
          )}
          aria-hidden='true'
        />
      )}

      <CursorTooltip
        placement={'bottom'}
        className='origin-top'
        delay={500}
        content={
          <p className='max-w-xs text-xs font-normal'>
            Uses the standard encounter tables and route data. The tracker will
            show traditional Pokémon encounters for each route and location.
          </p>
        }
      >
        <button
          type='button'
          onClick={() => handleModeSelect('classic')}
          disabled={!activePlaythrough}
          className={clsx(
            'relative z-10 w-20 py-1.5 text-sm font-semibold text-center',
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
      </CursorTooltip>

      <CursorTooltip
        placement={'bottom'}
        delay={500}
        className='origin-top'
        content={
          <p className='max-w-xs text-xs font-normal'>
            Uses modified encounter tables with different Pokémon availability
            per route. The tracker will show updated encounters that include
            more diverse Pokémon in early game areas.
          </p>
        }
      >
        <button
          type='button'
          onClick={() => handleModeSelect('remix')}
          disabled={!activePlaythrough}
          className={clsx(
            'relative z-10 w-20 py-1.5 text-sm font-semibold text-center',
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
      </CursorTooltip>

      <CursorTooltip
        placement={'bottom'}
        delay={500}
        className='origin-top'
        content={
          <p className='max-w-xs text-xs font-normal'>
            Uses randomized encounters where any Pokémon can appear in any
            location.
          </p>
        }
      >
        <button
          type='button'
          onClick={() => handleModeSelect('randomized')}
          disabled={!activePlaythrough}
          className={clsx(
            'relative z-10 w-20 py-1.5 text-sm font-semibold text-center',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-gray-700',
            optimisticMode === 'randomized'
              ? 'text-green-700 dark:text-green-300'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            activePlaythrough && 'cursor-pointer transition-colors duration-150'
          )}
          aria-pressed={optimisticMode === 'randomized'}
          aria-label={`Switch to Randomized mode${optimisticMode === 'randomized' ? ' (currently selected)' : ''}`}
        >
          Random
        </button>
      </CursorTooltip>

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
  );
});

export default GameModeToggle;
