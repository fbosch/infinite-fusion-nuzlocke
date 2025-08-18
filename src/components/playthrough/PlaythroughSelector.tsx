'use client';

import React, { useState, useCallback } from 'react';
import { ChevronDown, Album, Plus, Trash2, Calendar } from 'lucide-react';
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
          'bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700',
      };
    case 'randomized':
      return {
        label: 'Random',
        className:
          'bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700',
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
            'flex items-center justify-between gap-3 px-4 py-2.5 text-sm',
            'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700',
            'border border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500',
            'rounded-xl transition-all duration-200 ease-out',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
            'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'w-[200px] sm:min-w-[220px] sm:w-auto',
            'cursor-pointer',
            'h-[40px] sm:h-[44px]',
            'font-medium',
            'shadow-sm hover:shadow-md',
            'backdrop-blur-sm'
          )}
          disabled={isLoading}
        >
          <div className='flex items-center gap-3 min-w-0 flex-1 overflow-hidden'>
            <div className='flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30'>
              <Album className='w-4 h-4 text-blue-600 dark:text-blue-400' />
            </div>
            <span className='truncate min-w-0'>
              {activePlaythrough?.name || 'Select Playthrough'}
            </span>
          </div>
          <ChevronDown className='w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200' />
        </MenuButton>
        <MenuItems
          className={clsx(
            'absolute z-[100] mt-3 rounded-xl',
            'bg-white/95 dark:bg-gray-800/95 backdrop-blur-md',
            'shadow-xl ring-1 ring-gray-200/50 dark:ring-gray-600/50',
            'border border-gray-200/50 dark:border-gray-600/50',
            'focus:outline-none',
            'min-w-[320px] sm:min-w-[360px] max-w-[420px]',
            'left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0',
            'origin-top-center sm:origin-top-right',
            'animate-in fade-in-0 zoom-in-95 duration-200'
          )}
        >
          {/* Current playthroughs section */}
          {allPlaythroughs.length > 0 && (
            <>
              <div className='px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200/50 dark:border-gray-600/50 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700/30 dark:to-gray-600/30 rounded-t-xl'>
                Your Playthroughs
              </div>
              {allPlaythroughs
                .toSorted((a, b) => b.updatedAt - a.updatedAt)
                .map(playthrough => {
                  const gameModeInfo = getGameModeInfo(
                    playthrough.gameMode as GameMode
                  );
                  const isActive = activePlaythrough?.id === playthrough.id;

                  return (
                    <MenuItem key={playthrough.id}>
                      {({ focus }) => (
                        <button
                          onClick={() =>
                            handlePlaythroughSelect(playthrough.id)
                          }
                          className={clsx(
                            'group flex w-full items-center justify-between px-4 py-3.5 text-sm',
                            'focus:outline-none text-left transition-all duration-200 ease-out',
                            'cursor-pointer',
                            // Active state
                            isActive &&
                              'bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 text-blue-700 dark:text-blue-300',
                            // Focus state
                            focus &&
                              !isActive &&
                              'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
                            // Default/hover state
                            !isActive &&
                              !focus &&
                              'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100/50 dark:hover:from-gray-700/30 dark:hover:to-gray-600/30 text-gray-900 dark:text-gray-100'
                          )}
                        >
                          <div className='flex items-center gap-3 flex-1 min-w-0'>
                            <div
                              className={clsx(
                                'w-2.5 h-2.5 rounded-full flex-shrink-0',
                                isActive
                                  ? 'bg-blue-500 shadow-sm'
                                  : 'bg-gray-400 dark:bg-gray-500'
                              )}
                            />
                            <div className='flex flex-col gap-1.5 flex-1 min-w-0'>
                              <div className='flex items-center gap-2'>
                                <span className='truncate font-semibold'>
                                  {playthrough.name}
                                </span>
                                {gameModeInfo && (
                                  <span
                                    className={clsx(
                                      'text-xs px-2 py-1 rounded-full font-medium',
                                      gameModeInfo.className
                                    )}
                                  >
                                    {gameModeInfo.label}
                                  </span>
                                )}
                              </div>
                              <div className='flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400'>
                                <div className='flex items-center gap-1'>
                                  <Calendar className='w-3 h-3' />
                                  <span>
                                    {new Date(
                                      playthrough.updatedAt
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          {allPlaythroughs.length > 1 && (
                            <button
                              onClick={e =>
                                handleDeleteClick(playthrough as Playthrough, e)
                              }
                              className={clsx(
                                'p-2 rounded-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-all duration-200',
                                'hover:bg-red-100 dark:hover:bg-red-900/20',
                                'text-gray-400 hover:text-red-600 dark:hover:text-red-400',
                                'cursor-pointer'
                              )}
                              title='Delete playthrough'
                              aria-label={`Delete ${playthrough.name}`}
                            >
                              <Trash2 className='w-4 h-4' />
                            </button>
                          )}
                        </button>
                      )}
                    </MenuItem>
                  );
                })}
              <div className='border-t border-gray-200/50 dark:border-gray-600/50' />
            </>
          )}

          {/* Create new playthrough section */}
          {showCreateInput ? (
            <div className='p-4'>
              <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3'>
                <input
                  type='text'
                  value={newPlaythroughName}
                  onChange={e => {
                    e.stopPropagation();
                    setNewPlaythroughName(e.target.value);
                  }}
                  onKeyDown={e => {
                    e.stopPropagation();
                    handleCreateInputKeyDown(e);
                  }}
                  placeholder='Enter playthrough name'
                  className={clsx(
                    'flex-1 px-3 py-2.5 text-sm',
                    'border border-gray-300 dark:border-gray-600 rounded-lg',
                    'bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                    'placeholder-gray-500 dark:placeholder-gray-400',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500',
                    'transition-all duration-200'
                  )}
                  autoFocus
                  maxLength={50}
                  spellCheck={false}
                  autoComplete='off'
                />
                <button
                  onClick={handleCreatePlaythrough}
                  disabled={!newPlaythroughName.trim()}
                  className={clsx(
                    'px-4 py-2.5 text-sm font-medium text-white rounded-lg',
                    'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800',
                    'transition-all duration-200 shadow-sm hover:shadow-md',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-blue-800',
                    'cursor-pointer'
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
                  'group flex w-full items-center gap-3 px-4 py-3.5 text-sm',
                  'hover:bg-gradient-to-r hover:from-green-50 hover:to-green-100/50 dark:hover:from-green-900/20 dark:hover:to-green-800/20',
                  'focus:outline-none focus:bg-gradient-to-r focus:from-green-50 focus:to-green-100/50 dark:focus:from-green-900/20 dark:focus:to-green-800/20',
                  'text-gray-700 dark:text-gray-300 transition-all duration-200',
                  'cursor-pointer',
                  'rounded-b-xl'
                )}
              >
                <div className='flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30'>
                  <Plus className='w-4 h-4 text-green-600 dark:text-green-400' />
                </div>
                <span className='font-semibold'>Create New Playthrough</span>
              </button>
            </MenuItem>
          )}

          {isLoading && (
            <div className='px-4 py-4 text-sm text-gray-500 dark:text-gray-400 text-center'>
              <div className='flex items-center justify-center gap-2'>
                <div className='w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin' />
                Loading playthroughs...
              </div>
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
