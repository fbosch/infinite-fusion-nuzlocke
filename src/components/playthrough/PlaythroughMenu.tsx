'use client';

import React from 'react';
import GameModeToggle from './GameModeToggle';
import PlaythroughSelector from './PlaythroughSelector';

export default function PlaythroughMenu() {
  return (
    <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3'>
      <PlaythroughSelector className='w-full sm:w-auto' />
      <div className='flex items-center justify-center sm:justify-start'>
        <GameModeToggle />
      </div>
    </div>
  );
}
