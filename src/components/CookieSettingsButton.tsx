'use client';

import { useState } from 'react';
import { Cookie } from 'lucide-react';
import clsx from 'clsx';
import { CookieSettings } from '@/components/CookieSettings';

export default function CookieSettingsButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={clsx(
          'p-2 rounded-md transition-colors',
          'bg-gray-100 hover:bg-gray-200 text-gray-600',
          'border border-gray-200 hover:border-gray-300',
          'dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-400 dark:hover:text-gray-300',
          'dark:border-gray-600 dark:hover:border-gray-500',
          'cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1'
        )}
        aria-label='Cookie preferences'
        title='Cookie preferences'
        type='button'
      >
        <Cookie className='size-6' />
      </button>

      <CookieSettings isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
