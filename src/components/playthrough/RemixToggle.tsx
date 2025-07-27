'use client';

import React, { useOptimistic, useTransition } from 'react';
import clsx from 'clsx';
import {
  playthroughActions,
  useActivePlaythrough,
  useIsRemixMode,
} from '@/stores/playthroughs';
import { CursorTooltip } from '../CursorTooltip';

const RemixToggle = React.memo(function RemixToggle() {
  const activePlaythrough = useActivePlaythrough();
  const actualIsRemixMode = useIsRemixMode();
  const [isPending, startTransition] = useTransition();

  // React 19's useOptimistic hook for instant UI updates
  const [optimisticMode, setOptimisticMode] = useOptimistic(
    actualIsRemixMode,
    (currentState, newMode: boolean) => newMode
  );

  const handleToggle = React.useCallback(
    (targetMode: 'classic' | 'remix') => {
      if (!activePlaythrough || isPending) return;

      const shouldToggle =
        (targetMode === 'remix' && !optimisticMode) ||
        (targetMode === 'classic' && optimisticMode);

      if (!shouldToggle) return;

      startTransition(() => {
        // Optimistic update - instant UI response
        setOptimisticMode(targetMode === 'remix');

        // Actual state update
        playthroughActions.toggleRemixMode();
      });
    },
    [activePlaythrough, optimisticMode, isPending, setOptimisticMode]
  );

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
            'absolute top-1 bottom-1 left-1 w-16 bg-white dark:bg-gray-800 rounded-md shadow-sm transition-transform duration-150 ease-out',
            'border border-gray-200 dark:border-gray-500',
            optimisticMode ? 'translate-x-16' : 'translate-x-0'
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
            The default experience for the game. The majority of the early game
            uses Pokémon from generation 1, but all 501 Pokémon are in this
            mode.
          </p>
        }
      >
        <button
          type='button'
          onClick={() => handleToggle('classic')}
          disabled={!activePlaythrough}
          className={clsx(
            'relative z-10 w-16 py-1.5 text-sm font-semibold text-center',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-gray-700',
            !optimisticMode
              ? 'text-gray-900 dark:text-gray-100'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            activePlaythrough && 'cursor-pointer transition-colors duration-150'
          )}
          aria-pressed={!optimisticMode}
          aria-label={`Switch to Classic mode${!optimisticMode ? ' (currently selected)' : ''}`}
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
            A variation of classic mode that adjusts wild encounters, trainers,
            and gym leaders to frequently use Pokémon introduced after
            generation 2 in the early game. All of the same Pokémon are
            available as classic mode.
          </p>
        }
      >
        <div>
          <button
            type='button'
            onClick={() => handleToggle('remix')}
            disabled={!activePlaythrough}
            className={clsx(
              'relative z-10 w-16 py-1.5 text-sm font-semibold text-center',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-gray-700',
              optimisticMode
                ? 'text-purple-700 dark:text-purple-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
              activePlaythrough &&
                'cursor-pointer transition-colors duration-150'
            )}
            aria-pressed={optimisticMode}
            aria-label={`Switch to Remix mode${optimisticMode ? ' (currently selected)' : ''}`}
          >
            Remix
          </button>
          <div
            role='status'
            aria-live='polite'
            aria-atomic='true'
            className='sr-only'
          >
            {activePlaythrough &&
              `Game mode: ${optimisticMode ? 'Remix' : 'Classic'}${isPending ? ' (updating...)' : ''}`}
          </div>
        </div>
      </CursorTooltip>
    </fieldset>
  );
});

export default RemixToggle;
