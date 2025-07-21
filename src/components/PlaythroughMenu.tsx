'use client';

import React, { useState, useEffect } from 'react';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import {
  Settings,
  ToggleLeft,
  ToggleRight,
  Plus,
  Palette,
  Gamepad2,
} from 'lucide-react';
import clsx from 'clsx';
import {
  playthroughActions,
  useActivePlaythrough,
  useIsRemixMode,
  useIsLoading,
} from '@/stores/playthroughs';

export default function PlaythroughMenu() {
  const [mounted, setMounted] = useState(false);
  const activePlaythrough = useActivePlaythrough();
  const isRemixMode = useIsRemixMode();
  const isLoading = useIsLoading();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <div className='flex items-center space-x-3'>
        <div className='animate-pulse bg-gray-300 dark:bg-gray-600 rounded h-6 w-32'></div>
        <div className='animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-8 w-8'></div>
      </div>
    );
  }

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

      {/* Remix Mode Toggle - Always Visible */}
      <button
        onClick={playthroughActions.toggleRemixMode}
        disabled={!activePlaythrough}
        className={clsx(
          'flex items-center space-x-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium',
          'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1',
          isRemixMode
            ? [
                'bg-purple-100 text-purple-800 border-purple-300',
                'hover:bg-purple-200 hover:border-purple-400',
                'dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700',
                'dark:hover:bg-purple-900/50 dark:hover:border-purple-600',
              ]
            : [
                'bg-gray-100 text-gray-600 border-gray-300',
                'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300',
                'dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600',
                'dark:hover:bg-blue-900/20 dark:hover:text-blue-400 dark:hover:border-blue-400',
              ],
          !activePlaythrough && 'opacity-50 cursor-not-allowed',
          activePlaythrough && 'hover:cursor-pointer'
        )}
        aria-label={`${isRemixMode ? 'Disable' : 'Enable'} Remix Mode`}
        title={`${isRemixMode ? 'Disable' : 'Enable'} Remix Mode`}
      >
        <Palette className='h-4 w-4' />
        <span>Remix</span>
        {isRemixMode ? (
          <ToggleRight className='h-4 w-4' />
        ) : (
          <ToggleLeft className='h-4 w-4' />
        )}
      </button>

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
