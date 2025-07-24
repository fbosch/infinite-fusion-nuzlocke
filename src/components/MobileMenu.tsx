'use client';

import React from 'react';
import { Menu, X } from 'lucide-react';
import { Menu as HeadlessMenu, MenuButton, MenuItems } from '@headlessui/react';
import clsx from 'clsx';
import PlaythroughMenu from './PlaythroughMenu';
import CookieSettingsButton from './CookieSettingsButton';

export default function MobileMenu() {
  return (
    <HeadlessMenu as='div' className='relative'>
      {({ open }) => (
        <>
          <MenuButton
            className={clsx(
              'flex items-center justify-center p-2 rounded-md transition-colors',
              'bg-gray-100 hover:bg-gray-200 text-gray-600',
              'border border-gray-200 hover:border-gray-300',
              'dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-400 dark:hover:text-gray-300',
              'dark:border-gray-600 dark:hover:border-gray-500',
              'cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1',
              open && 'bg-gray-200 dark:bg-gray-600'
            )}
            aria-label={open ? 'Close menu' : 'Open menu'}
            title={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X className='h-5 w-5' /> : <Menu className='h-5 w-5' />}
          </MenuButton>

          <MenuItems
            className={clsx(
              'absolute right-0 z-50 mt-2 origin-top-right rounded-md',
              'bg-white dark:bg-gray-800 shadow-lg ring-1 ring-gray-200 dark:ring-gray-600 ring-opacity-5',
              'border border-gray-200 dark:border-gray-600',
              'focus:outline-none',
              'min-w-[280px] max-w-[320px] w-screen max-w-sm'
            )}
          >
            <div className='p-4 space-y-4'>
              {/* Playthrough section */}
              <div className='space-y-2'>
                <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300'>
                  Playthrough
                </h3>
                <div className='space-y-3'>
                  <PlaythroughMenu />
                </div>
              </div>

              {/* Settings section */}
              <div className='border-t border-gray-200 dark:border-gray-600 pt-4 space-y-2'>
                <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300'>
                  Settings
                </h3>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-gray-600 dark:text-gray-400'>
                    Cookie Preferences
                  </span>
                  <CookieSettingsButton />
                </div>
              </div>
            </div>
          </MenuItems>
        </>
      )}
    </HeadlessMenu>
  );
}
