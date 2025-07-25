'use client';

import { useEffect } from 'react';
import { ServiceWorkerManager } from '@/utils/serviceWorker';

export function ServiceWorkerInit() {
  useEffect(() => {
    console.debug('ServiceWorkerInit: Component mounted, starting registration...');
    
    // Initialize service worker manager
    const swManager = ServiceWorkerManager.getInstance();

    // Register service worker
    swManager.register()
      .then(registration => {
        if (registration) {
          console.debug('ServiceWorkerInit: Registration successful:', registration);
          
          // Test the service worker after it takes control
          const testServiceWorker = () => {
            console.debug('ServiceWorkerInit: Testing service worker with a variants API call...');
            fetch('/api/sprites/variants?headId=1&bodyId=2')
              .then(response => response.json())
              .then(data => {
                console.debug('ServiceWorkerInit: Test API call response:', data);
              })
              .catch(error => {
                console.error('ServiceWorkerInit: Test API call failed:', error);
              });
          };
          
          // If service worker is already controlling, test immediately
          if (navigator.serviceWorker.controller) {
            console.debug('ServiceWorkerInit: Service worker already controlling, testing now');
            testServiceWorker();
          } else {
            console.debug('ServiceWorkerInit: Waiting for service worker to take control...');
            // Wait for service worker to take control
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              console.debug('ServiceWorkerInit: Service worker took control, running test');
              testServiceWorker();
            }, { once: true });
            
            // Fallback: test after 3 seconds anyway
            setTimeout(() => {
              if (!navigator.serviceWorker.controller) {
                console.debug('ServiceWorkerInit: Service worker still not controlling, testing anyway...');
                testServiceWorker();
              }
            }, 3000);
          }
        } else {
          console.debug('ServiceWorkerInit: Registration returned null (not supported or failed)');
        }
      })
      .catch(error => {
        console.error('ServiceWorkerInit: Registration failed:', error);
      });
  }, []);

  return null; // This component doesn't render anything
}
