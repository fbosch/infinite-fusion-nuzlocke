'use client';

import React from 'react';
import RemixToggle from './RemixToggle';

export default function PlaythroughMenu() {
  return (
    <div className='flex items-center space-x-3'>
      <div className='flex items-center'>
        <RemixToggle />
      </div>
    </div>
  );
}
