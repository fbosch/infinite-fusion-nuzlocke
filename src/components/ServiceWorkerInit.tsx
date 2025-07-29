'use client';

import { useEffect } from 'react';
import { ServiceWorkerManager } from '@/utils/serviceWorker';

export function ServiceWorkerInit() {
  useEffect(() => {
    console.debug(
      'ServiceWorkerInit: Component mounted, starting registration...'
    );

    // Initialize service worker manager
    const swManager = ServiceWorkerManager.getInstance();

    // Register service worker
    swManager
      .register()
      .then(registration => {
        if (registration) {
          console.debug(
            'ServiceWorkerInit: Registration successful:',
            registration
          );
        } else {
          console.debug(
            'ServiceWorkerInit: Registration returned null (not supported or failed)'
          );
        }
      })
      .catch(error => {
        console.error('ServiceWorkerInit: Registration failed:', error);
      });
  }, []);

  return null; // This component doesn't render anything
}
