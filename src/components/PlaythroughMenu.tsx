'use client';

import React from 'react';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import { Settings, Plus, Gamepad2 } from 'lucide-react';
import clsx from 'clsx';
import {
  playthroughActions,
  useActivePlaythrough,
  useIsRemixMode,
} from '@/stores/playthroughs';

export default function PlaythroughMenu() {
  const activePlaythrough = useActivePlaythrough();
  const isRemixMode = useIsRemixMode();

  const handleCreatePlaythrough = () => {
    const playthroughName = prompt('Enter playthrough name:', 'New Nuzlocke');
    if (playthroughName?.trim()) {
      const newId = playthroughActions.createPlaythrough(
        playthroughName.trim(),
        false
      );
      playthroughActions.setActivePlaythrough(newId);
    }
  };

  return (
    <div className='flex items-center space-x-3'>
      {/* Current Playthrough Display */}
      <div className='flex items-center space-x-2'>
        <Gamepad2 className='h-4 w-4 text-gray-600 dark:text-gray-400' />
        <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
          {activePlaythrough?.name || 'No Playthrough'}
        </span>
      </div>

      {/* Remix Mode Toggle - Segmented Control Style */}
      <div className='flex items-center'>
        <div
          className={clsx(
            'relative flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1',
            'border border-gray-200 dark:border-gray-600',
            !activePlaythrough && 'opacity-50'
          )}
        >
          {/* Background slider */}
          {activePlaythrough && (
            <div
              className={clsx(
                'absolute top-1 bottom-1 left-1 w-16 bg-white dark:bg-gray-800 rounded-md shadow-sm transition-transform duration-200 ease-out',
                'border border-gray-200 dark:border-gray-500',
                isRemixMode ? 'translate-x-16' : 'translate-x-0'
              )}
            />
          )}

          {/* Classic option */}
          <button
            onClick={() => !isRemixMode || playthroughActions.toggleRemixMode()}
            disabled={!activePlaythrough}
            className={clsx(
              'relative z-10 w-16 py-1.5 text-sm font-medium transition-colors duration-200 text-center',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-gray-700',
              !isRemixMode
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
              activePlaythrough && 'cursor-pointer'
            )}
            aria-pressed={!isRemixMode}
          >
            Classic
          </button>

          {/* Remix option */}
          <button
            onClick={() => isRemixMode || playthroughActions.toggleRemixMode()}
            disabled={!activePlaythrough}
            className={clsx(
              'relative z-10 w-16 py-1.5 text-sm font-medium transition-colors duration-200 text-center',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-gray-700',
              isRemixMode
                ? 'text-purple-700 dark:text-purple-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
              activePlaythrough && 'cursor-pointer'
            )}
            aria-pressed={isRemixMode}
          >
            Remix
          </button>
        </div>
      </div>

      {/* Playthrough Menu */}
      <Menu as='div' className='relative'>
        <MenuButton
          className={clsx(
            'p-2 rounded-md transition-colors',
            'bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600',
            'border border-gray-300 hover:border-blue-300',
            'dark:bg-gray-700 dark:hover:bg-blue-900/20 dark:text-gray-400 dark:hover:text-blue-400',
            'dark:border-gray-600 dark:hover:border-blue-400',
            'hover:cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1'
          )}
          aria-label='Playthrough settings'
          title='Playthrough settings'
        >
          <Settings className='w-4 h-4' />
        </MenuButton>

        <MenuItems
          className={clsx(
            'absolute right-0 z-20 mt-2 w-56 origin-top-right rounded-md py-1 shadow-lg ring-1 ring-opacity-5 focus:outline-none',
            'bg-white dark:bg-gray-800',
            'ring-gray-300 dark:ring-gray-600'
          )}
        >
          {/* Create New Playthrough */}
          <MenuItem>
            <button
              onClick={handleCreatePlaythrough}
              className={clsx(
                'group flex w-full items-center px-4 py-2 text-sm hover:cursor-pointer',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-500',
                'text-gray-900 dark:text-gray-100'
              )}
            >
              <Plus className='h-4 w-4 mr-3 text-gray-500 dark:text-gray-400' />
              <span>New Playthrough</span>
            </button>
          </MenuItem>
        </MenuItems>
      </Menu>
    </div>
  );
}
