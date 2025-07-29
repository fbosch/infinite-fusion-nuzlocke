'use client';

import { useBreakpoint, useBreakpointAtLeast } from '@/hooks/useBreakpoint';

export default function BreakpointExample() {
  const currentBreakpoint = useBreakpoint();
  const isAtLeastMd = useBreakpointAtLeast('md');

  return (
    <div className='p-4 space-y-4'>
      <h2 className='text-lg font-semibold'>Breakpoint Hook Example</h2>

      <div className='space-y-2'>
        <div className='flex items-center space-x-2'>
          <span className='font-medium'>Current breakpoint:</span>
          <span className='px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm'>
            {currentBreakpoint}
          </span>
        </div>

        <div className='flex items-center space-x-2'>
          <span className='font-medium'>At least md:</span>
          <span
            className={`px-2 py-1 rounded text-sm ${
              isAtLeastMd
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {isAtLeastMd ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      <div className='text-sm text-gray-600'>
        <p>Resize your browser window to see the breakpoint values change.</p>
        <p>This hook uses matchMedia API for efficient updates.</p>
      </div>
    </div>
  );
}
