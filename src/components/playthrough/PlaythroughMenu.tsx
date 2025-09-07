'use client';

import React from 'react';
import GameModeToggle from './GameModeToggle';
import PlaythroughSelector from './PlaythroughSelector';

export default function PlaythroughMenu() {
  return (
    <div className='flex flex-col'>
      <GameModeToggle />
      <PlaythroughSelector />
    </div>
  );
}
