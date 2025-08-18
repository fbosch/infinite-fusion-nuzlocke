'use client';

import React, { useState, useCallback } from 'react';
import { HelpCircle, X } from 'lucide-react';
import clsx from 'clsx';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import { CursorTooltip } from '@/components/CursorTooltip';
import type { GameMode } from '@/stores/playthroughs';

interface CreatePlaythroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, gameMode: GameMode) => Promise<void>;
  currentGameMode: GameMode;
}

export default function CreatePlaythroughModal({
  isOpen,
  onClose,
  onCreate,
  currentGameMode,
}: CreatePlaythroughModalProps) {
  const [newPlaythroughName, setNewPlaythroughName] = useState('');
  const [selectedGameMode, setSelectedGameMode] =
    useState<GameMode>(currentGameMode);

  // Create a new playthrough
  const handleCreatePlaythrough = useCallback(async () => {
    const name = newPlaythroughName.trim();
    if (!name) return;

    try {
      await onCreate(name, selectedGameMode);
      setNewPlaythroughName('');
      setSelectedGameMode(currentGameMode);
      onClose();
    } catch (error) {
      console.error('Failed to create playthrough:', error);
    }
  }, [
    newPlaythroughName,
    selectedGameMode,
    currentGameMode,
    onCreate,
    onClose,
  ]);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedGameMode(currentGameMode);
      setNewPlaythroughName('');
    }
  }, [isOpen, currentGameMode]);

  return (
    <Dialog open={isOpen} onClose={onClose} className='relative z-50 group'>
      <DialogBackdrop
        transition
        className='fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[2px] data-closed:opacity-0 data-enter:opacity-100'
        aria-hidden='true'
      />

      <div className='fixed inset-0 flex w-screen items-center justify-center p-4'>
        <DialogPanel
          transition
          className={clsx(
            'max-w-md w-full space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6',
            'transition duration-150 ease-out data-closed:opacity-0 data-closed:scale-98'
          )}
        >
          <div className='flex items-center justify-between'>
            <DialogTitle className='text-xl font-semibold text-gray-900 dark:text-white'>
              Create New Playthrough
            </DialogTitle>
            <button
              type='button'
              onClick={onClose}
              className={clsx(
                'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2',
                'p-1 rounded-md transition-colors cursor-pointer'
              )}
              aria-label='Close modal'
            >
              <X className='h-5 w-5' />
            </button>
          </div>

          <div className='space-y-4 pt-2'>
            <div>
              <label
                htmlFor='playthrough-name'
                className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
              >
                Playthrough Name
              </label>
              <input
                id='playthrough-name'
                type='text'
                value={newPlaythroughName}
                onChange={e => setNewPlaythroughName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreatePlaythrough();
                  }
                }}
                placeholder='Enter a memorable name'
                className={clsx(
                  'w-full px-3 py-2.5 text-sm',
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
            </div>

            <div>
              <label
                htmlFor='game-mode'
                className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
              >
                <div className='flex items-center gap-2'>
                  <span>Game Mode</span>
                  <CursorTooltip
                    content='You can change the game mode at any time.'
                    placement='bottom'
                  >
                    <div className='w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help'>
                      <HelpCircle className='w-4 h-4' />
                    </div>
                  </CursorTooltip>
                </div>
              </label>
              <div className='grid grid-cols-3 gap-2'>
                {(['classic', 'remix', 'randomized'] as const).map(mode => (
                  <button
                    key={mode}
                    type='button'
                    onClick={() => setSelectedGameMode(mode)}
                    className={clsx(
                      'px-3 py-2.5 text-sm font-medium rounded-lg border transition-all duration-200',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                      selectedGameMode === mode
                        ? mode === 'classic'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : mode === 'remix'
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                            : 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                    )}
                  >
                    {mode === 'classic' && 'Classic'}
                    {mode === 'remix' && 'Remix'}
                    {mode === 'randomized' && 'Randomized'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className='flex items-center gap-3 pt-4'>
            <button
              onClick={() => {
                setNewPlaythroughName('');
                setSelectedGameMode(currentGameMode);
                onClose();
              }}
              className={clsx(
                'flex-1 px-4 py-2.5 text-sm font-medium',
                'border border-gray-300 dark:border-gray-600 rounded-lg',
                'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300',
                'hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2'
              )}
            >
              Cancel
            </button>
            <button
              onClick={handleCreatePlaythrough}
              disabled={!newPlaythroughName.trim()}
              className={clsx(
                'flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg',
                'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800',
                'transition-all duration-200 shadow-sm hover:shadow-md',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-green-600 disabled:hover:to-green-800',
                'cursor-pointer'
              )}
            >
              Create Playthrough
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
