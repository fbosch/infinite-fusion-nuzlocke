'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, Album, Plus, Trash2, Calendar } from 'lucide-react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
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
import CreatePlaythroughModal from './CreatePlaythroughModal';
import { CursorTooltip } from '@/components/CursorTooltip';
import { Upload, Download } from 'lucide-react';
import { usePlaythroughImportExport } from '@/hooks/usePlaythroughImportExport';
import { ImportErrorContent } from './ImportErrorContent';

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
          'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      };
    case 'randomized':
      return {
        label: 'Random',
        className:
          'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [playthroughToDelete, setPlaythroughToDelete] =
    useState<Playthrough | null>(null);

  const {
    showImportError,
    setShowImportError,
    importErrorMessage,
    handleExportClick,
    handleExportKeyDown,
    handleImportClick,
  } = usePlaythroughImportExport();

  const allPlaythroughs = useAllPlaythroughs();
  const playthroughRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Initialize refs array when playthroughs change
  useEffect(() => {
    playthroughRefs.current = playthroughRefs.current.slice(
      0,
      allPlaythroughs.length
    );
  }, [allPlaythroughs.length]);

  // Switch to a different playthrough
  const handlePlaythroughSelect = useCallback(async (playthroughId: string) => {
    try {
      await playthroughActions.setActivePlaythrough(playthroughId);
    } catch (error) {
      console.error('Failed to switch playthrough:', error);
    }
  }, []);

  // Handle delete playthrough click
  const handleDeleteClick = useCallback(
    (playthrough: { id: string; name: string }) => {
      setPlaythroughToDelete(playthrough as Playthrough);
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

  // Handle arrow key navigation using refs
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      e.preventDefault();

      // Get the sorted playthroughs (newest first)
      const sortedPlaythroughs = allPlaythroughs.toSorted(
        (a, b) => b.createdAt - a.createdAt
      );

      switch (e.key) {
        case 'ArrowDown':
          const nextIndex =
            currentIndex < sortedPlaythroughs.length - 1 ? currentIndex + 1 : 0;
          playthroughRefs.current[nextIndex]?.focus();
          break;
        case 'ArrowUp':
          const prevIndex =
            currentIndex > 0 ? currentIndex - 1 : sortedPlaythroughs.length - 1;
          playthroughRefs.current[prevIndex]?.focus();
          break;
        case 'Home':
          playthroughRefs.current[0]?.focus();
          break;
        case 'End':
          playthroughRefs.current[sortedPlaythroughs.length - 1]?.focus();
          break;
      }
    },
    [allPlaythroughs]
  );

  return (
    <>
      <div className={clsx('relative group l', className)}>
        {/* Playthrough Selector Dropdown */}
        <Popover className='relative'>
          {({ open }) => (
            <>
              <PopoverButton
                className={clsx(
                  'flex items-center justify-between gap-3 px-4 py-2.5 text-sm',
                  'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700',
                  'border border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500',
                  'rounded-b-xl transition-all duration-200 ease-out',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                  'focus-visible:border-blue-500 dark:focus-visible:border-blue-400',
                  'text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'w-full md:w-[calc(100%-1.75rem)]',
                  'cursor-pointer',
                  'h-[40px] sm:h-[44px]',
                  'font-medium',
                  'backdrop-blur-sm'
                )}
                disabled={isLoading}
              >
                <div className='flex items-center gap-3 min-w-0 flex-1 overflow-hidden'>
                  <div className='flex items-center justify-center size-6 rounded-lg bg-gradient-to-br '>
                    <Album className='size-4' />
                  </div>
                  <span className='truncate min-w-0'>
                    {activePlaythrough?.name || 'Select Playthrough'}
                  </span>
                </div>
                <ChevronDown
                  className={clsx(
                    'w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200',
                    open && 'rotate-180'
                  )}
                />
              </PopoverButton>
              <PopoverPanel
                anchor={{ to: 'bottom end', gap: '12px' }}
                className={clsx(
                  'z-[50] rounded-xl',
                  'bg-white/95 dark:bg-gray-800/95 backdrop-blur-md',
                  'shadow-dropdown',
                  'border border-gray-200/50 dark:border-gray-600/50',
                  'min-w-[320px] sm:min-w-[360px] max-w-[420px]',
                  'origin-top-right'
                )}
              >
                {/* Current playthroughs section */}
                {allPlaythroughs.length > 0 && (
                  <>
                    <div className='px-4 py-3 flex items-center justify-between border-b border-gray-200/50 dark:border-gray-600/50 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-700/30 dark:to-gray-600/30 rounded-t-xl'>
                      <span className='text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                        Your Playthroughs
                      </span>
                      <button
                        onClick={handleImportClick}
                        className={clsx(
                          'px-2 py-1 text-xs font-medium rounded-md flex items-center gap-1.5',
                          'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400',
                          'border border-gray-300 dark:border-gray-600',
                          'hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-300 dark:hover:border-blue-600',
                          'focus:bg-blue-100 focus:text-blue-700 focus:border-blue-300 dark:focus:bg-blue-900/30 dark:focus:text-blue-300 dark:focus:border-blue-600',
                          'transition-colors duration-200',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset',
                          'cursor-pointer'
                        )}
                        title='Import playthrough from file'
                        aria-label='Import playthrough'
                      >
                        <Upload className='w-3 h-3' />
                        Import
                      </button>
                    </div>
                    {allPlaythroughs
                      .toSorted((a, b) => b.createdAt - a.createdAt)
                      .map(playthrough => {
                        const gameModeInfo = getGameModeInfo(
                          playthrough.gameMode as GameMode
                        );
                        const isActive =
                          activePlaythrough?.id === playthrough.id;

                        return (
                          <div
                            key={playthrough.id}
                            className={clsx(
                              'relative',
                              'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100/50 dark:hover:from-gray-700/30 dark:hover:to-gray-600/30 text-gray-900 dark:text-gray-100',
                              isActive &&
                                'bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 text-blue-700 dark:text-blue-300'
                            )}
                          >
                            <div
                              ref={el => {
                                // Use the index in the sorted array (newest first)
                                const sortedPlaythroughs =
                                  allPlaythroughs.toSorted(
                                    (a, b) => b.createdAt - a.createdAt
                                  );
                                const index = sortedPlaythroughs.findIndex(
                                  p => p.id === playthrough.id
                                );
                                if (index >= 0) {
                                  playthroughRefs.current[index] = el;
                                }
                              }}
                              onClick={() =>
                                handlePlaythroughSelect(playthrough.id)
                              }
                              onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handlePlaythroughSelect(playthrough.id);
                                } else if (
                                  e.key === 'ArrowDown' ||
                                  e.key === 'ArrowUp' ||
                                  e.key === 'Home' ||
                                  e.key === 'End'
                                ) {
                                  // Use the index in the sorted array (newest first)
                                  const sortedPlaythroughs =
                                    allPlaythroughs.toSorted(
                                      (a, b) => b.createdAt - a.createdAt
                                    );
                                  const index = sortedPlaythroughs.findIndex(
                                    p => p.id === playthrough.id
                                  );
                                  handleKeyDown(e, index);
                                }
                              }}
                              tabIndex={0}
                              role='button'
                              aria-label={`Select playthrough: ${playthrough.name}`}
                              data-playthrough-index={allPlaythroughs
                                .toSorted((a, b) => b.createdAt - a.createdAt)
                                .findIndex(p => p.id === playthrough.id)}
                              className={clsx(
                                'group/menu-item flex w-full items-center justify-between px-4 py-3.5 text-sm',
                                'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset text-left transition-all duration-200 ease-out',
                                'cursor-pointer'
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
                                          playthrough.createdAt
                                        ).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className='flex items-center gap-1 opacity-0 group-hover/menu-item:opacity-100 group-focus-within/menu-item:opacity-100 transition-all duration-200'>
                                <button
                                  onClick={e =>
                                    handleExportClick(
                                      playthrough as Playthrough,
                                      e
                                    )
                                  }
                                  onKeyDown={e =>
                                    handleExportKeyDown(
                                      playthrough as Playthrough,
                                      e
                                    )
                                  }
                                  className={clsx(
                                    'p-2 rounded-lg transition-all duration-200',
                                    'border border-transparent',
                                    'hover:bg-blue-100 hover:border-blue-300 dark:hover:bg-blue-900/20 dark:hover:border-blue-600',
                                    'focus:bg-blue-100 focus:border-blue-300 dark:focus:bg-blue-900/20 dark:focus:border-blue-600',
                                    'text-gray-400 hover:text-blue-600 dark:hover:text-blue-400',
                                    'focus:text-blue-600 dark:focus:text-blue-400',
                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset',
                                    'cursor-pointer'
                                  )}
                                  aria-label={`Export ${playthrough.name}`}
                                  tabIndex={0}
                                >
                                  <div className='relative z-[1000]'>
                                    <CursorTooltip
                                      delay={200}
                                      content='Export playthrough'
                                      placement='bottom-start'
                                    >
                                      <Download className='w-4 h-4' />
                                    </CursorTooltip>
                                  </div>
                                </button>
                                {allPlaythroughs.length > 1 && (
                                  <button
                                    onClick={e => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDeleteClick(playthrough);
                                    }}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDeleteClick(playthrough);
                                      }
                                    }}
                                    className={clsx(
                                      'p-2 rounded-lg transition-all duration-200',
                                      'border border-transparent',
                                      'hover:bg-red-100 hover:border-red-300 dark:hover:bg-red-900/20 dark:hover:border-red-600',
                                      'focus:bg-red-100 focus:border-red-300 dark:focus:bg-red-900/20 dark:focus:border-red-600',
                                      'text-gray-400 hover:text-red-600 dark:hover:text-red-400',
                                      'focus:text-red-600 dark:focus:text-red-400',
                                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-inset',
                                      'cursor-pointer'
                                    )}
                                    aria-label={`Delete ${playthrough.name}`}
                                    tabIndex={0}
                                  >
                                    <div className='relative z-[1000]'>
                                      <CursorTooltip
                                        delay={200}
                                        content='Delete playthrough'
                                        placement='bottom-start'
                                      >
                                        <Trash2 className='w-4 h-4' />
                                      </CursorTooltip>
                                    </div>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </>
                )}

                {isLoading && (
                  <div className='px-4 py-4 text-sm text-gray-500 dark:text-gray-400 text-center'>
                    <div className='flex items-center justify-center gap-2'>
                      <div className='w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin' />
                      Loading playthroughs...
                    </div>
                  </div>
                )}

                {/* Create new playthrough section - Now inside the dropdown as well */}
                <div
                  className={clsx(
                    'border-t border-gray-200/50 dark:border-gray-600/50',
                    'hover:bg-green-50 dark:hover:bg-green-900/20',
                    'focus-within:outline-none focus-within:bg-green-50 focus-within:dark:bg-green-900/20'
                  )}
                >
                  <div className='relative'>
                    <button
                      onClick={e => {
                        e.preventDefault();
                        setShowCreateInput(true);
                      }}
                      className={clsx(
                        'group flex w-full items-center gap-3 px-4 py-3.5 text-sm',
                        'text-gray-700 dark:text-gray-300 transition-all duration-200',
                        'cursor-pointer',
                        'rounded-b-xl',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset',
                        'focus-visible:bg-green-50 dark:focus-visible:bg-green-900/20'
                      )}
                    >
                      <div className='flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30'>
                        <Plus className='w-4 h-4 text-green-600 dark:text-green-400' />
                      </div>
                      <span className='font-semibold'>
                        Create New Playthrough
                      </span>
                    </button>
                  </div>
                </div>
              </PopoverPanel>
            </>
          )}
        </Popover>
      </div>

      {/* Create Playthrough Modal */}
      <CreatePlaythroughModal
        isOpen={showCreateInput}
        onClose={() => setShowCreateInput(false)}
        onCreate={async (name: string, gameMode: GameMode) => {
          const newId = playthroughActions.createPlaythrough(name, gameMode);
          await playthroughActions.setActivePlaythrough(newId);
        }}
        currentGameMode={currentGameMode}
      />

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

      {/* Import error modal */}
      <ConfirmationDialog
        isOpen={showImportError}
        onClose={() => setShowImportError(false)}
        onConfirm={() => setShowImportError(false)}
        title='Import Error'
        message=''
        confirmText='OK'
        cancelText='Cancel'
        variant='danger'
      >
        <ImportErrorContent errorMessage={importErrorMessage} />
      </ConfirmationDialog>
    </>
  );
}
