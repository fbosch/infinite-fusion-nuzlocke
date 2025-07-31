// Simplified Service Worker with Pokemon Image Prefetching
const CACHE_VERSION = 'v2';
const CACHE_NAME = `infinite-fusion-cache-${CACHE_VERSION}`;
const IMAGE_CACHE_NAME = `infinite-fusion-images-${CACHE_VERSION}`;
const POKEMON_IMAGE_CACHE_NAME = `pokemon-images-${CACHE_VERSION}`;

// Essential URLs to cache immediately
const urlsToCache = ['/'];

// Image domains that we want to cache
const imageDomains = [
  'raw.githubusercontent.com',
  'ifd-spaces.sfo2.cdn.digitaloceanspaces.com',
];

// Get Pokemon image URLs for prefetching
async function getPokemonImageUrls() {
  try {
    const response = await fetch('/pokemon-ids.json');
    const pokemonIds = await response.json();

    return pokemonIds.map(
      nationalDexId =>
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${nationalDexId}.png`
    );
  } catch (error) {
    console.error('Service Worker: Failed to fetch Pokemon IDs', error);
    return [];
  }
}

// Smart background image prefetching that respects network conditions
async function prefetchPokemonImages() {
  // Wait for initial page load to complete before starting prefetch
  await waitForPageLoad();

  const imageUrls = await getPokemonImageUrls();
  if (imageUrls.length === 0) return;

  const cache = await caches.open(POKEMON_IMAGE_CACHE_NAME);
  console.debug(
    `Service Worker: Starting background prefetch of ${imageUrls.length} Pokemon images`
  );

  let successCount = 0;
  const networkInfo = getNetworkInfo();
  const batchSize = getBatchSize(networkInfo);

  for (let i = 0; i < imageUrls.length; i += batchSize) {
    // Wait for network to be idle before each batch
    await waitForNetworkIdle();

    // Check if we should continue based on current network conditions
    if (!shouldContinuePrefetch()) {
      console.debug(
        'Service Worker: Pausing prefetch due to network conditions'
      );
      break;
    }

    const batch = imageUrls.slice(i, i + batchSize);

    await Promise.allSettled(
      batch.map(async url => {
        try {
          // Skip if already cached
          if (await cache.match(url)) {
            successCount++;
            return;
          }

          const response = await fetch(url, {
            priority: 'low', // Use low priority for background requests
          });

          if (response.ok) {
            await cache.put(url, response);
            successCount++;
          }
        } catch (error) {
          // Silently continue on individual failures
        }
      })
    );

    // Log progress every 50 images
    if ((i + batchSize) % 50 === 0 || i + batchSize >= imageUrls.length) {
      console.debug(
        `Service Worker: Background prefetched ${Math.min(i + batchSize, imageUrls.length)}/${imageUrls.length} images`
      );
    }

    // Add delay between batches to be gentle on the network
    await sleep(getDelayBetweenBatches(networkInfo));
  }

  console.debug(
    `Service Worker: Background prefetching complete (${successCount}/${imageUrls.length} cached)`
  );
}

// Wait for initial page load to complete
function waitForPageLoad() {
  return new Promise(resolve => {
    // Wait at least 2 seconds for initial critical resources
    setTimeout(resolve, 2000);
  });
}

// Wait for network to be idle
function waitForNetworkIdle() {
  return new Promise(resolve => {
    // Use requestIdleCallback if available, otherwise setTimeout
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(resolve, { timeout: 1000 });
    } else {
      setTimeout(resolve, 100);
    }
  });
}

// Get network information for adaptive behavior
function getNetworkInfo() {
  // Use Network Information API if available
  if ('connection' in navigator) {
    const connection = navigator.connection;
    return {
      effectiveType: connection.effectiveType || '4g',
      downlink: connection.downlink || 10,
      saveData: connection.saveData || false,
    };
  }

  // Fallback for browsers without Network Information API
  return {
    effectiveType: '4g',
    downlink: 10,
    saveData: false,
  };
}

// Determine batch size based on network conditions
function getBatchSize(networkInfo) {
  if (networkInfo.saveData) return 3; // Very conservative for data saver

  switch (networkInfo.effectiveType) {
    case 'slow-2g':
    case '2g':
      return 3;
    case '3g':
      return 8;
    case '4g':
    default:
      return 15;
  }
}

// Determine delay between batches based on network conditions
function getDelayBetweenBatches(networkInfo) {
  if (networkInfo.saveData) return 2000; // 2 second delay for data saver

  switch (networkInfo.effectiveType) {
    case 'slow-2g':
    case '2g':
      return 1500; // 1.5 second delay for slow connections
    case '3g':
      return 800; // 0.8 second delay for 3G
    case '4g':
    default:
      return 300; // 0.3 second delay for fast connections
  }
}

// Check if we should continue prefetching
function shouldContinuePrefetch() {
  const networkInfo = getNetworkInfo();

  // Stop if user enabled data saver
  if (networkInfo.saveData) {
    return false;
  }

  // Stop if connection became very slow
  if (networkInfo.effectiveType === 'slow-2g') {
    return false;
  }

  return true;
}

// Simple sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Install event - cache essential resources and start background prefetching
self.addEventListener('install', event => {
  console.debug('Service Worker: Installing...');
  event.waitUntil(
    // Cache essential files first
    caches
      .open(CACHE_NAME)
      .then(cache => {
        console.debug('Service Worker: Caching essential files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.debug(
          'Service Worker: Essential files cached, starting background image prefetch'
        );
        // Start Pokemon image prefetching in the background (non-blocking)
        prefetchPokemonImages().catch(error => {
          console.warn('Service Worker: Background prefetch failed:', error);
        });
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache essential files', error);
        return self.skipWaiting(); // Continue even if caching fails
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.debug('Service Worker: Activating...');
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (
              cacheName !== CACHE_NAME &&
              cacheName !== IMAGE_CACHE_NAME &&
              cacheName !== POKEMON_IMAGE_CACHE_NAME
            ) {
              console.debug('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim(),
    ])
  );
});

// Fetch event - handle requests with simplified logic
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip API requests - let React Query handle them
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Handle image requests with cache-first strategy
  if (
    request.destination === 'image' ||
    imageDomains.some(domain => url.hostname === domain)
  ) {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Handle navigation requests (pages)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // For other requests, try network first with cache fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache successful responses for static assets
        if (response.status === 200 && shouldCacheStaticAsset(request)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(request);
      })
  );
});

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  const url = new URL(request.url);

  // Use Pokemon cache for Pokemon sprites, general cache for others
  const isPokemonSprite =
    url.hostname === 'raw.githubusercontent.com' &&
    url.pathname.includes('/sprites/pokemon/');

  const cacheName = isPokemonSprite
    ? POKEMON_IMAGE_CACHE_NAME
    : IMAGE_CACHE_NAME;
  const cache = await caches.open(cacheName);

  try {
    // Try cache first for fast loading
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fetch from network if not in cache
    const response = await fetch(request);

    // Cache successful responses
    if (response.status === 200) {
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }

    return response;
  } catch (error) {
    console.warn('Service Worker: Failed to fetch image', request.url, error);

    // Return a minimal fallback response
    return new Response('', {
      status: 404,
      statusText: 'Not Found',
    });
  }
}

// Handle navigation requests with network-first strategy
async function handleNavigationRequest(request) {
  try {
    // Try network first for fresh content
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Fallback to cached index.html for offline support
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match('/');

    if (cachedResponse) {
      return cachedResponse;
    }

    // Ultimate fallback
    return new Response('Offline - Please check your connection', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

// Determine if a static asset should be cached
function shouldCacheStaticAsset(request) {
  const url = new URL(request.url);

  // Cache static assets like CSS, JS, fonts
  return (
    url.pathname.includes('/_next/static/') ||
    url.pathname.includes('/fonts/') ||
    url.pathname.includes('/images/') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp')
  );
}

console.debug('Service Worker: Script loaded');
