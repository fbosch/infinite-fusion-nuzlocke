'use client';

import React from 'react';
import RemixToggle from './RemixToggle';
import PlaythroughSelector from './PlaythroughSelector';

export default function PlaythroughMenu() {
  return (
    <div className='flex items-center space-x-3'>
      <PlaythroughSelector />
      <div className='flex items-center'>
        <RemixToggle />
      </div>
    </div>
  );
}
