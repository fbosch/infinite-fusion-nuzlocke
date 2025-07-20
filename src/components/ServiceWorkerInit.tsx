'use client';

import { useEffect } from 'react';
import { ServiceWorkerManager } from '@/utils/serviceWorker';

export function ServiceWorkerInit() {
  useEffect(() => {
    // Initialize service worker manager
    const swManager = ServiceWorkerManager.getInstance();

    // Register service worker
    swManager.register().catch(error => {
      console.error('Service worker registration failed:', error);
    });
  }, []);

  return null; // This component doesn't render anything
}
