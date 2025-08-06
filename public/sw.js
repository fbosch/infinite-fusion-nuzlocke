// Simplified Service Worker with Image Caching
// API cache gets cleared on each deployment, images remain persistent
const BUILD_ID =
  new URL(self.location).searchParams.get('buildId') || 'default';
const API_CACHE_NAME = `infinite-fusion-api-${BUILD_ID}`;
// Image caches remain static - no versioning needed since images don't change
const IMAGE_CACHE_NAME = `infinite-fusion-images-v1`;

// Essential URLs to cache immediately
const urlsToCache = ['/', SPRITESHEET_URL];

// Image domains that we want to cache
const imageDomains = [
  'raw.githubusercontent.com',
  'ifd-spaces.sfo2.cdn.digitaloceanspaces.com',
];

// Essential spritesheet to cache immediately (with version for cache busting)
const SPRITESHEET_URL = `/images/pokemon-spritesheet.png?v=${BUILD_ID}`;

// Queue for sprite variant prefetch requests
let spriteVariantQueue = [];
let isProcessingSpriteVariants = false;

// Add sprite variants to background queue
function queueSpriteVariants(spriteVariantsResponse) {
  if (!spriteVariantsResponse?.variants || !spriteVariantsResponse?.cacheKey) {
    return;
  }

  // Check if already queued
  const isAlreadyQueued = spriteVariantQueue.some(
    item => item.cacheKey === spriteVariantsResponse.cacheKey
  );

  if (!isAlreadyQueued) {
    spriteVariantQueue.push(spriteVariantsResponse);
    console.debug(
      `Service Worker: Queued sprite variants for ${spriteVariantsResponse.cacheKey} (queue length: ${spriteVariantQueue.length})`
    );

    // Start processing if not already running
    if (!isProcessingSpriteVariants) {
      processSpriteVariantQueue().catch(error => {
        console.warn(
          'Service Worker: Sprite variant queue processing failed:',
          error
        );
      });
    }
  }
}

// Process sprite variant queue in background
async function processSpriteVariantQueue() {
  if (isProcessingSpriteVariants || spriteVariantQueue.length === 0) {
    return;
  }

  isProcessingSpriteVariants = true;
  console.debug(
    `Service Worker: Starting sprite variant queue processing (${spriteVariantQueue.length} items)`
  );

  // Wait for initial page load and network to be idle
  await waitForPageLoad();
  await waitForNetworkIdle();

  const cache = await caches.open(IMAGE_CACHE_NAME);
  const networkInfo = getNetworkInfo();
  const batchSize = getBatchSize(networkInfo);

  while (spriteVariantQueue.length > 0) {
    // Check network conditions before each batch
    if (!shouldContinuePrefetch()) {
      console.debug(
        'Service Worker: Pausing sprite variant processing due to network conditions'
      );
      break;
    }

    // Wait for network to be idle
    await waitForNetworkIdle();

    // Take items from queue for this batch
    const batchItems = spriteVariantQueue.splice(
      0,
      Math.min(batchSize, spriteVariantQueue.length)
    );

    await Promise.allSettled(
      batchItems.map(async item => {
        await processSingleSpriteVariantItem(item, cache);
      })
    );

    // Add delay between batches
    if (spriteVariantQueue.length > 0) {
      await sleep(getDelayBetweenBatches(networkInfo));
    }
  }

  isProcessingSpriteVariants = false;
  console.debug('Service Worker: Sprite variant queue processing complete');
}

// Process a single sprite variant item
async function processSingleSpriteVariantItem(item, cache) {
  const { variants, cacheKey } = item;

  if (!variants || variants.length === 0) {
    return;
  }

  // Generate sprite URLs for all variants
  const spriteUrls = variants.map(
    variant =>
      `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/${cacheKey}${variant}.png`
  );

  let successCount = 0;

  await Promise.allSettled(
    spriteUrls.map(async url => {
      try {
        // Skip if already cached
        if (await cache.match(url)) {
          successCount++;
          return;
        }

        const response = await fetch(url, {
          mode: 'no-cors', // Required for DigitalOcean Spaces CORS policy
          priority: 'low', // Use low priority for background requests
        });

        if (response.ok) {
          await cache.put(url, response);
          successCount++;
        }
      } catch (error) {
        // Silently continue on individual failures
        console.debug(
          'Service Worker: Failed to prefetch sprite variant:',
          url,
          error
        );
      }
    })
  );

  console.debug(
    `Service Worker: Cached ${successCount}/${spriteUrls.length} sprite variants for ${cacheKey}`
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
      .open(API_CACHE_NAME)
      .then(cache => {
        console.debug('Service Worker: Caching essential files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.debug('Service Worker: Essential files and spritesheet cached');
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
      // Clean up old API caches only (keep image caches)
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Only delete old API caches, preserve image caches
            if (
              cacheName.startsWith('infinite-fusion-api-') &&
              cacheName !== API_CACHE_NAME
            ) {
              console.debug(
                'Service Worker: Deleting old API cache',
                cacheName
              );
              return caches.delete(cacheName);
            }
            // Keep all image caches and current API cache
          })
        );
      }),
      // Take control of all clients
      self.clients.claim(),
    ])
  );
});

// Message event - handle communication from client
self.addEventListener('message', event => {
  const { type, data } = event.data;

  switch (type) {
    case 'PREFETCH_SPRITE_VARIANTS':
      // Queue sprite variants for background processing
      queueSpriteVariants(data);
      break;

    default:
      console.debug('Service Worker: Unknown message type:', type);
  }
});

// Handle sprite variants API requests and trigger prefetching
async function handleSpriteVariantsRequest(request) {
  try {
    // Forward the request to the API
    const response = await fetch(request);

    // Check if the response is successful and contains JSON
    if (
      response.ok &&
      response.headers.get('content-type')?.includes('application/json')
    ) {
      // Clone the response so we can read it for prefetching
      const responseClone = response.clone();

      // Return the response immediately to the client
      // Then trigger prefetching in the background (after response is sent)
      setTimeout(async () => {
        try {
          const data = await responseClone.json();

          // Check if this is a successful sprite variants response
          if (data.variants && Array.isArray(data.variants) && data.cacheKey) {
            console.debug(
              `Service Worker: Queueing sprite variants for ${data.cacheKey} after API response`
            );

            // Queue sprite variants for background processing
            queueSpriteVariants(data);
          }
        } catch (jsonError) {
          // If JSON parsing fails, just continue without prefetching
          console.debug(
            'Service Worker: Failed to parse sprite variants response:',
            jsonError
          );
        }
      }, 0); // Execute on next tick after response is returned
    }

    return response;
  } catch (error) {
    console.error(
      'Service Worker: Error handling sprite variants request:',
      error
    );
    // Return a network error response
    return new Response('Network error', { status: 503 });
  }
}

// Fetch event - handle requests with simplified logic
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Intercept sprite variants API requests to trigger prefetching
  if (url.pathname === '/api/sprite/variants') {
    event.respondWith(handleSpriteVariantsRequest(request));
    return;
  }

  // Skip other API requests - let React Query handle them
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
          caches.open(API_CACHE_NAME).then(cache => {
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
    const cache = await caches.open(API_CACHE_NAME);
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
