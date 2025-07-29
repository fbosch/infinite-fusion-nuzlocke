'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

interface GlobalErrorProps {
  error: Error;
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  console.error('Global error:', error);

  return (
    <html lang='en'>
      <body>
        <div className='min-h-screen flex items-center justify-center p-4'>
          <div className='text-center'>
            <AlertTriangle className='h-12 w-12 text-red-500 mx-auto mb-4' />
            <h1 className='text-xl  mb-2'>Something went wrong</h1>
            <p className='text-gray-600 mb-4'>
              Please try refreshing the page.
            </p>
            <button
              onClick={reset}
              className='inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
            >
              <RefreshCw className='h-4 w-4' />
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
