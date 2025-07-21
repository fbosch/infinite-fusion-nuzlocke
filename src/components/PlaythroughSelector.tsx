'use client';

import React, { useState, useCallback } from 'react';
import { ChevronDown, Album, Plus } from 'lucide-react';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import clsx from 'clsx';
import {
  playthroughActions,
  useActivePlaythrough,
  useAllPlaythroughs,
  useIsLoading,
} from '@/stores/playthroughs';

interface PlaythroughSelectorProps {
  className?: string;
}

export default function PlaythroughSelector({
  className,
}: PlaythroughSelectorProps) {
  const activePlaythrough = useActivePlaythrough();
  const isLoading = useIsLoading();
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newPlaythroughName, setNewPlaythroughName] = useState('');
  const allPlaythroughs = useAllPlaythroughs();

  // Switch to a different playthrough
  const handlePlaythroughSelect = useCallback(async (playthroughId: string) => {
    try {
      await playthroughActions.setActivePlaythrough(playthroughId);
    } catch (error) {
      console.error('Failed to switch playthrough:', error);
    }
  }, []);

  // Create a new playthrough
  const handleCreatePlaythrough = useCallback(async () => {
    const name = newPlaythroughName.trim();
    if (!name) return;

    try {
      const newId = playthroughActions.createPlaythrough(
        name,
        activePlaythrough?.remixMode || false
      );
      await playthroughActions.setActivePlaythrough(newId);
      setNewPlaythroughName('');
      setShowCreateInput(false);
      // Refresh the list
    } catch (error) {
      console.error('Failed to create playthrough:', error);
    }
  }, [newPlaythroughName, activePlaythrough?.remixMode]);

  // Handle enter key in create input
  const handleCreateInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCreatePlaythrough();
      } else if (e.key === 'Escape') {
        setShowCreateInput(false);
        setNewPlaythroughName('');
      }
    },
    [handleCreatePlaythrough]
  );

  return (
    <Menu as='div' className={clsx('relative', className)}>
      <MenuButton
        className={clsx(
          'flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium',
          'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600',
          'border border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500',
          'rounded-md transition-colors cursor-pointer',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1',
          'text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
          'min-w-[140px]'
        )}
      >
        <div className='flex items-center gap-2'>
          <Album className='w-4 h-4 flex-shrink-0' />
          <span className='truncate'>
            {activePlaythrough?.name || 'No Playthrough'}
          </span>
        </div>
        <ChevronDown className='w-4 h-4 flex-shrink-0' />
      </MenuButton>

      <MenuItems
        className={clsx(
          'absolute right-0 z-50 mt-2 origin-top-right rounded-md',
          'bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5',
          'border border-gray-200 dark:border-gray-600',
          'focus:outline-none',
          'min-w-[260px] max-w-[320px]'
        )}
      >
        {/* Current playthroughs section */}
        {allPlaythroughs.length > 0 && (
          <>
            <div className='px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600'>
              Playthroughs
            </div>
            {allPlaythroughs.map(playthrough => (
              <MenuItem key={playthrough.id}>
                <button
                  onClick={() => handlePlaythroughSelect(playthrough.id)}
                  className={clsx(
                    'group flex w-full items-center justify-between px-3 py-3 text-sm cursor-pointer',
                    'hover:bg-gray-100 dark:hover:bg-gray-700',
                    'focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700',
                    'transition-colors',
                    activePlaythrough?.id === playthrough.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-900 dark:text-gray-100'
                  )}
                >
                  <div className='flex items-center gap-2 flex-1 min-w-0'>
                    <div
                      className={clsx(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        activePlaythrough?.id === playthrough.id
                          ? 'bg-blue-500'
                          : 'bg-gray-400'
                      )}
                    />
                    <span className='truncate font-medium'>
                      {playthrough.name}
                    </span>
                    {playthrough.remixMode && (
                      <span className='text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded flex-shrink-0 font-medium'>
                        Remix
                      </span>
                    )}
                  </div>
                  <div className='text-xs text-gray-500 dark:text-gray-400 flex-shrink-0'>
                    {new Date(playthrough.updatedAt).toLocaleDateString()}
                  </div>
                </button>
              </MenuItem>
            ))}
            <div className='border-t border-gray-200 dark:border-gray-600 ' />
          </>
        )}

        {/* Create new playthrough section */}
        {showCreateInput ? (
          <div className='px-1.5 py-1.5'>
            <div className='flex items-center gap-1.5'>
              <input
                type='text'
                value={newPlaythroughName}
                onChange={e => setNewPlaythroughName(e.target.value)}
                onKeyDown={handleCreateInputKeyDown}
                placeholder='Enter playthrough name'
                className={clsx(
                  'flex-1 px-2 py-1.5 text-sm',
                  'border border-gray-300 dark:border-gray-600 rounded',
                  'bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                  'placeholder-gray-500 dark:placeholder-gray-400',
                  'focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
                )}
                autoFocus
                maxLength={50}
              />
              <button
                onClick={handleCreatePlaythrough}
                disabled={!newPlaythroughName.trim()}
                className={clsx(
                  'px-2 py-2 text-xs font-medium text-white rounded',
                  'bg-blue-600 hover:bg-blue-700 transition-colors',
                  'focus:outline-none focus:ring-1 focus:ring-blue-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600'
                )}
              >
                Create
              </button>
            </div>
          </div>
        ) : (
          <MenuItem>
            <button
              onClick={e => {
                e.preventDefault();
                setShowCreateInput(true);
              }}
              className={clsx(
                'group flex w-full items-center gap-2 px-3 py-3 text-sm cursor-pointer',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700',
                'text-gray-700 dark:text-gray-300 transition-colors'
              )}
            >
              <Plus className='w-4 h-4' />
              <span className='font-medium'>Create New Playthrough</span>
            </button>
          </MenuItem>
        )}

        {isLoading && (
          <div className='px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center'>
            Loading playthroughs...
          </div>
        )}
      </MenuItems>
    </Menu>
  );
}
