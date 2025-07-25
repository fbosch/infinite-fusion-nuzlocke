// Service Worker registration utility
export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager | null = null;
  private swRegistration: ServiceWorkerRegistration | null = null;

  private constructor() {}

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  async register(): Promise<ServiceWorkerRegistration | null> {
    console.debug('ServiceWorkerManager: Starting registration process...');
    
    if (!('serviceWorker' in navigator)) {
      console.debug('ServiceWorkerManager: Service Worker not supported in this browser');
      return null;
    }

    console.debug('ServiceWorkerManager: Service Worker supported, attempting to register /sw.js');

    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.debug(
        'ServiceWorkerManager: Registration successful:',
        this.swRegistration
      );
      
      console.debug('ServiceWorkerManager: Current service worker state:', {
        installing: this.swRegistration.installing?.state,
        waiting: this.swRegistration.waiting?.state,
        active: this.swRegistration.active?.state,
      });

      // Handle updates
      this.swRegistration.addEventListener('updatefound', () => {
        console.debug('ServiceWorkerManager: Update found, new worker installing');
        const newWorker = this.swRegistration!.installing;
        if (newWorker) {
          console.debug('ServiceWorkerManager: New worker state:', newWorker.state);
          newWorker.addEventListener('statechange', () => {
            console.debug('ServiceWorkerManager: New worker state changed to:', newWorker.state);
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              console.debug('ServiceWorkerManager: New service worker available and ready');
            }
          });
        }
      });

      // Log current controller state
      if (navigator.serviceWorker.controller) {
        console.debug('ServiceWorkerManager: Active service worker controller found');
      } else {
        console.debug('ServiceWorkerManager: No active service worker controller - waiting for control');
      }

      // Listen for when the service worker takes control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.debug('ServiceWorkerManager: Service worker now controlling the page!');
        if (navigator.serviceWorker.controller) {
          console.debug('ServiceWorkerManager: Controller is now active, fetch events will be intercepted');
        }
      });

      // Force activation if the service worker is waiting
      if (this.swRegistration.waiting) {
        console.debug('ServiceWorkerManager: Service worker is waiting, sending skipWaiting message');
        this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      return this.swRegistration;
    } catch (error) {
      console.error('ServiceWorkerManager: Registration failed:', error);
      return null;
    }
  }

  async unregister(): Promise<boolean> {
    if (this.swRegistration) {
      try {
        await this.swRegistration.unregister();
        this.swRegistration = null;
        console.debug('Service Worker unregistered');
        return true;
      } catch (error) {
        console.error('Service Worker unregistration failed:', error);
        return false;
      }
    }
    return false;
  }

  async clearCache(): Promise<void> {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.debug('All caches cleared');
      } catch (error) {
        console.error('Failed to clear caches:', error);
      }
    }
  }

  getRegistration(): ServiceWorkerRegistration | null {
    return this.swRegistration;
  }
}
