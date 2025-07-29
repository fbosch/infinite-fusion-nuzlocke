'use client';

import React, { useState, useCallback } from 'react';
import { ChevronDown, Album, Plus, Trash2 } from 'lucide-react';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import clsx from 'clsx';
import {
  playthroughActions,
  useActivePlaythrough,
  useAllPlaythroughs,
  useIsLoading,
  useGameMode,
  type Playthrough,
  type GameMode,
} from '@/stores/playthroughs';
import ConfirmationDialog from '@/components/ConfirmationDialog';

interface PlaythroughSelectorProps {
  className?: string;
}

// Helper function to get game mode display info
const getGameModeInfo = (gameMode: GameMode) => {
  switch (gameMode) {
    case 'classic':
      return null; // Don't show indicator for classic mode
    case 'remix':
      return {
        label: 'Remix',
        className:
          'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
      };
    case 'randomized':
      return {
        label: 'Random',
        className:
          'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
      };
    default:
      return null;
  }
};

export default function PlaythroughSelector({
  className,
}: PlaythroughSelectorProps) {
  const activePlaythrough = useActivePlaythrough();
  const currentGameMode = useGameMode();
  const isLoading = useIsLoading();
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newPlaythroughName, setNewPlaythroughName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [playthroughToDelete, setPlaythroughToDelete] =
    useState<Playthrough | null>(null);
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
      // Use the current game mode for new playthroughs
      const newId = playthroughActions.createPlaythrough(name, currentGameMode);
      await playthroughActions.setActivePlaythrough(newId);
      setNewPlaythroughName('');
      setShowCreateInput(false);
    } catch (error) {
      console.error('Failed to create playthrough:', error);
    }
  }, [newPlaythroughName, currentGameMode]);

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

  // Handle delete playthrough click
  const handleDeleteClick = useCallback(
    (playthrough: Playthrough, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setPlaythroughToDelete(playthrough);
      setShowDeleteConfirm(true);
    },
    []
  );

  // Confirm delete playthrough
  const handleConfirmDelete = useCallback(async () => {
    if (!playthroughToDelete) return;

    try {
      await playthroughActions.deletePlaythrough(playthroughToDelete.id);
      setShowDeleteConfirm(false);
      setPlaythroughToDelete(null);
    } catch (error) {
      console.error('Failed to delete playthrough:', error);
    }
  }, [playthroughToDelete]);

  // Cancel delete
  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setPlaythroughToDelete(null);
  }, []);

  return (
    <>
      <Menu as='div' className={clsx('relative', className)}>
        <MenuButton
          className={clsx(
            'flex items-center justify-between gap-2 px-3 py-2 sm:py-2.5 text-sm ',
            'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600',
            'border border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500',
            'rounded-md transition-colors cursor-pointer',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1',
            'text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'w-[180px] sm:min-w-[140px] sm:w-auto',
            'touch-manipulation',
            'overflow-hidden'
          )}
          disabled={isLoading}
        >
          <div className='flex items-center gap-2 min-w-0 flex-1 overflow-hidden'>
            <Album className='w-4 h-4 flex-shrink-0' />
            <span className='truncate min-w-0 font-medium'>
              {activePlaythrough?.name || '...'}
            </span>
          </div>
          <ChevronDown className='w-4 h-4 flex-shrink-0' />
        </MenuButton>
        <MenuItems
          className={clsx(
            'absolute z-50 mt-2 rounded-md',
            'bg-white dark:bg-gray-800 shadow-lg ring-1 ring-gray-200 dark:ring-gray-600 ring-opacity-5',
            'border border-gray-200 dark:border-gray-600',
            'focus:outline-none',
            'min-w-[240px] sm:min-w-[260px] max-w-[320px]',
            // Mobile positioning - center on small screens, right-aligned on larger screens
            'left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0',
            'origin-top-center sm:origin-top-right'
          )}
        >
          {/* Current playthroughs section */}
          {allPlaythroughs.length > 0 && (
            <>
              <div className='px-3 py-2 sm:py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600'>
                Playthroughs
              </div>
              {allPlaythroughs
                .toSorted((a, b) => b.updatedAt - a.updatedAt)
                .map(playthrough => {
                  const gameModeInfo = getGameModeInfo(
                    playthrough.gameMode as GameMode
                  );

                  return (
                    <MenuItem key={playthrough.id}>
                      {({ focus }) => (
                        <button
                          onClick={() =>
                            handlePlaythroughSelect(playthrough.id)
                          }
                          className={clsx(
                            'group flex w-full items-center justify-between px-3 py-3 text-sm cursor-pointer',
                            'focus:outline-none text-left transition-color',
                            'touch-manipulation',
                            // Combined: Selected AND focused (most prominent)
                            focus &&
                              activePlaythrough?.id === playthrough.id &&
                              'bg-blue-100 dark:bg-blue-900/35 text-blue-600 dark:text-blue-400 ring-1 ring-blue-300/50 dark:ring-blue-600/50',
                            // Selected but not focused
                            !focus &&
                              activePlaythrough?.id === playthrough.id &&
                              'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
                            // Focused but not selected
                            focus &&
                              activePlaythrough?.id !== playthrough.id &&
                              'bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100',
                            // Default/hover state
                            !focus &&
                              activePlaythrough?.id !== playthrough.id &&
                              'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
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
                            <div className='flex flex-col gap-1 flex-1 min-w-0 mr-1'>
                              <div className='flex items-center gap-2'>
                                <span className='truncate  flex-1'>
                                  {playthrough.name}
                                </span>
                                {gameModeInfo && (
                                  <span
                                    className={clsx(
                                      'text-xs px-1.5 py-0.5 rounded flex-shrink-0 ',
                                      gameModeInfo.className
                                    )}
                                  >
                                    {gameModeInfo.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className='flex items-center gap-2 flex-shrink-0'>
                            <div className='text-xs text-gray-500 dark:text-gray-400 hidden sm:block'>
                              {new Date(
                                playthrough.updatedAt
                              ).toLocaleDateString()}
                            </div>
                            {allPlaythroughs.length > 1 && (
                              <span
                                onClick={e => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleDeleteClick(
                                    playthrough as Playthrough,
                                    e
                                  );
                                }}
                                className={clsx(
                                  'p-1.5 rounded opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity',
                                  'hover:bg-red-100 dark:hover:bg-red-900/20',
                                  'text-gray-400 hover:text-red-600 dark:hover:text-red-400',
                                  'cursor-pointer touch-manipulation'
                                )}
                                title='Delete playthrough'
                                role='button'
                                aria-label={`Delete ${playthrough.name}`}
                              >
                                <Trash2 className='w-3 h-3' />
                              </span>
                            )}
                          </div>
                        </button>
                      )}
                    </MenuItem>
                  );
                })}
              <div className='border-t border-gray-200 dark:border-gray-600 ' />
            </>
          )}

          {/* Create new playthrough section */}
          {showCreateInput ? (
            <div className='px-1.5 py-1.5'>
              <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5'>
                <input
                  type='text'
                  value={newPlaythroughName}
                  onChange={e => {
                    e.stopPropagation();
                    setNewPlaythroughName(e.target.value);
                  }}
                  onKeyDown={e => {
                    // Prevent Menu from intercepting keyboard events
                    e.stopPropagation();
                    handleCreateInputKeyDown(e);
                  }}
                  placeholder='Enter playthrough name'
                  className={clsx(
                    'flex-1 px-2 py-1.5 text-sm',
                    'border border-gray-300 dark:border-gray-600 rounded',
                    'bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                    'placeholder-gray-500 dark:placeholder-gray-400',
                    'focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500'
                  )}
                  autoFocus
                  maxLength={50}
                  spellCheck={false}
                  autoComplete='off'
                />
                <button
                  onClick={handleCreatePlaythrough}
                  disabled={Boolean(!newPlaythroughName.trim())}
                  className={clsx(
                    'px-3 py-1.5 sm:px-2 sm:py-2 text-xs font-medium text-white rounded cursor-pointer',
                    'bg-blue-600 hover:bg-blue-700 transition-colors',
                    'focus:outline-none focus:ring-1 focus:ring-blue-500',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600',
                    'touch-manipulation'
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
                  'group flex w-full items-center gap-2 px-3 py-3 text-sm cursor-pointer rounded-b-md',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  'focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700',
                  'text-gray-700 dark:text-gray-300 transition-colors',
                  'touch-manipulation'
                )}
              >
                <Plus className='w-4 h-4' />
                <span className='font-medium'>Create New Playthrough</span>
              </button>
            </MenuItem>
          )}

          {isLoading && (
            <div className='px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center'>
              Loading...
            </div>
          )}
        </MenuItems>
      </Menu>

      {/* Delete confirmation dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title='Delete Playthrough'
        message={`Are you sure you want to delete "${playthroughToDelete?.name}"? This action cannot be undone and all progress will be lost.`}
        confirmText='Delete'
        cancelText='Cancel'
        variant='danger'
      />
    </>
  );
}
