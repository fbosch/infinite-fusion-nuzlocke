'use client';

import React, { useState } from 'react';
import GameModeToggle from './GameModeToggle';
import PlaythroughSelector from './PlaythroughSelector';
import dynamic from 'next/dynamic';
import { Skull } from 'lucide-react';
import clsx from 'clsx';

const GraveyardSheet = dynamic(
  () => import('@/components/graveyard/GraveyardSheet'),
  { ssr: false }
);

export default function PlaythroughMenu() {
  const [graveyardOpen, setGraveyardOpen] = useState(false);
  return (
    <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 lg:gap-3'>
      <PlaythroughSelector className='w-full sm:w-auto' />
      <div className='flex items-center justify-center sm:justify-start'>
        <GameModeToggle />
      </div>
      <div className='flex items-center'>
        <button
          type='button'
          onClick={() => setGraveyardOpen(true)}
          className={clsx(
            'inline-flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1.5',
            'bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700',
            'text-sm text-gray-900 dark:text-gray-100 transition-colors focus:outline-none cursor-pointer',
            'focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2'
          )}
          aria-haspopup='dialog'
          aria-controls='graveyard-modal'
          aria-label='Open graveyard'
        >
          <Skull className='h-4 w-4' aria-hidden='true' />
          <span className='hidden sm:inline'>Graveyard</span>
        </button>
      </div>
      <GraveyardSheet
        isOpen={graveyardOpen}
        onClose={() => setGraveyardOpen(false)}
      />
    </div>
  );
}
