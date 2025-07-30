'use client';

import { useEffect } from 'react';

export function ServiceWorkerInit() {
  useEffect(() => {
    // Only register service worker if supported and in production
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      // Use simple registration to avoid webpack chunk dependencies
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(registration => {
          console.debug('ServiceWorker registered:', registration);
        })
        .catch(error => {
          console.error('ServiceWorker registration failed:', error);
        });
    }
  }, []);

  return null; // This component doesn't render anything
}
