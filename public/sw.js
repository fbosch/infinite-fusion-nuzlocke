const CACHE_NAME = 'infinite-fusion-cache-v2';
const IMAGE_CACHE_NAME = 'infinite-fusion-images-v2';

// URLs to cache immediately
const urlsToCache = ['/'];

// Image domains to cache
const imageDomains = [
  'raw.githubusercontent.com',
  'ifd-spaces.sfo2.cdn.digitaloceanspaces.com',
];

// Install event - cache essential resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching essential files');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache essential files', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Generate sprite URL from headId, bodyId, and variant
function generateSpriteUrl(headId, bodyId, variant = '') {
  const id = headId && bodyId ? `${headId}.${bodyId}` : headId || bodyId || '';
  return `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/${id}${variant}.png`;
}

// Preload variant images in the background
async function preloadVariantImages(cacheKey, variants) {
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    console.log(`Service Worker: Preloading ${variants.length} variants for ${cacheKey}`);
    
    // Parse the cache key to get headId and bodyId
    let headId = null;
    let bodyId = null;
    
    if (cacheKey.includes('.')) {
      const [head, body] = cacheKey.split('.');
      headId = parseInt(head, 10);
      bodyId = parseInt(body, 10);
    } else {
      const id = parseInt(cacheKey, 10);
      if (!isNaN(id)) {
        headId = id;
      }
    }
    
    // Generate URLs for all variants and preload them
    const preloadPromises = variants.map(async variant => {
      const imageUrl = generateSpriteUrl(headId, bodyId, variant);
      
      try {
        // Check if already cached
        const cached = await cache.match(imageUrl);
        if (cached) {
          return; // Already cached, skip
        }
        
        // Fetch and cache the image
        const response = await fetch(imageUrl);
        if (response.ok) {
          await cache.put(imageUrl, response.clone());
          console.log(`Service Worker: Preloaded variant ${variant} for ${cacheKey}`);
        }
      } catch (error) {
        console.warn(`Service Worker: Failed to preload variant ${variant} for ${cacheKey}:`, error);
      }
    });
    
    // Don't wait for all preloads to complete - do it in background
    Promise.all(preloadPromises).catch(error => {
      console.warn('Service Worker: Some variant preloads failed:', error);
    });
    
  } catch (error) {
    console.error('Service Worker: Failed to preload variant images:', error);
  }
}

// Fetch event - handle requests
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle variants API route - intercept and preload images
  if (url.pathname === '/api/sprites/variants') {
    event.respondWith(handleVariantsApiRequest(request));
    return;
  }

  // Handle image requests
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Handle navigation requests (pages)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // For other requests, try network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then(response => {
        // Only cache successful responses
        if (response.status === 200 && shouldCache(request)) {
          const responseClone = response.clone();
          caches.open(IMAGE_CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(error => {
        console.error(
          'Service Worker: Network request failed',
          request.url,
          error
        );
        // Fallback to cache
        return caches.match(request);
      })
  );
});

// Handle variants API requests and preload images
async function handleVariantsApiRequest(request) {
  try {
    // Fetch the response from the network
    const response = await fetch(request);
    
    if (!response.ok) {
      return response;
    }
    
    // Clone the response to read the body
    const responseClone = response.clone();
    
    try {
      const data = await responseClone.json();
      
      // Check if this is a successful variants response
      if (data && data.variants && Array.isArray(data.variants) && data.cacheKey) {
        // Preload variant images in the background (don't await)
        preloadVariantImages(data.cacheKey, data.variants);
      }
    } catch (parseError) {
      console.warn('Service Worker: Failed to parse variants API response:', parseError);
    }
    
    return response;
  } catch (error) {
    console.error('Service Worker: Failed to fetch variants API:', error);
    // Try to return cached response if available
    return caches.match(request) || new Response('', { status: 500 });
  }
}

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE_NAME);

  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // If not in cache, fetch from network
  try {
    const response = await fetch(request);

    // Only cache successful responses for GET requests
    if (response.status === 200 && request.method === 'GET') {
      const responseClone = response.clone();
      cache.put(request, responseClone);
      return response;
    } else {
      // Don't cache failed responses or non-GET requests, just return them
      return response;
    }
  } catch (error) {
    console.error('Service Worker: Failed to fetch image', request.url, error);

    // Return a 404 response to prevent infinite retry loops
    // The browser will handle this gracefully and show the image error
    return new Response('', {
      status: 404,
      statusText: 'Not Found',
    });
  }
}

// Handle navigation requests with network-first strategy
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return null if no cached version available
    return null;
  }
}

// Check if request should be cached
function shouldCache(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);

  // Cache images from specific domains
  if (request.destination === 'image') {
    return imageDomains.some(domain => url.hostname.includes(domain));
  }

  // Cache other resources from same origin
  return url.origin === self.location.origin;
}

// Message event - handle messages from main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    event.ports[0].postMessage({
      type: 'CACHE_SIZE',
      size: 'Calculating...', // You can implement actual cache size calculation here
    });
  }
});
