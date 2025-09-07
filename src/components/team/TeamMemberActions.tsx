'use client';

import React from 'react';
import clsx from 'clsx';

interface TeamMemberActionsProps {
  canUpdateTeam: boolean;
  hasSelection: boolean;
  onUpdate: () => void;
  onClear: () => void;
}

export function TeamMemberActions({
  canUpdateTeam,
  hasSelection,
  onUpdate,
  onClear,
}: TeamMemberActionsProps) {
  return (
    <div className='space-y-3'>
      <button
        onClick={onUpdate}
        disabled={!canUpdateTeam}
        className={clsx(
          'w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 border shadow-sm',
          canUpdateTeam
            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800 hover:border-blue-300 hover:shadow-md dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/50 dark:hover:text-blue-200 dark:hover:border-blue-700'
            : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-500'
        )}
      >
        Update
      </button>

      <button
        onClick={onClear}
        disabled={!hasSelection}
        className={clsx(
          'w-full px-4 py-3 rounded-lg font-medium transition-all duration-200',
          hasSelection
            ? 'bg-white text-gray-500 hover:bg-red-50 hover:text-red-700 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-red-950/50 dark:hover:text-red-300'
            : 'bg-gray-50 text-gray-400 cursor-not-allowed dark:bg-gray-800/50 dark:text-gray-500'
        )}
      >
        Clear
      </button>
    </div>
  );
}
