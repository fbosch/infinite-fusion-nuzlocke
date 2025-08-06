/**
 * Register service worker with build ID for cache versioning
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported');
    return null;
  }

  try {
    const buildId =
      process.env.NEXT_PUBLIC_BUILD_ID || process.env.NODE_ENV === 'development'
        ? 'dev'
        : 'default';

    const swUrl = `/sw.js?buildId=${encodeURIComponent(buildId)}`;

    console.debug('Registering service worker with build ID:', buildId);

    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: '/',
    });

    console.debug('Service worker registered successfully');
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}
