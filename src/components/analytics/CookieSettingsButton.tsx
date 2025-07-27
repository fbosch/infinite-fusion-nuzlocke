'use client';

import { useState } from 'react';
import { Cookie } from 'lucide-react';
import { CookieSettings } from '@/components/analytics/CookieSettings';

export default function CookieSettingsButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className='bg-gray-100 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 transition-colors duration-200 text-sm font-semibold flex items-center gap-1.5 cursor-pointer'
        aria-label='Cookie preferences'
        title='Cookie preferences'
        type='button'
      >
        <Cookie className='h-4 w-4' />
        Cookie Settings
      </button>

      <CookieSettings isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
