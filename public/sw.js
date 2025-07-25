const CACHE_NAME = 'infinite-fusion-cache-v1';
const IMAGE_CACHE_NAME = 'infinite-fusion-images-v1';
const POKEMON_IMAGE_CACHE_NAME = 'pokemon-images-v1';

// URLs to cache immediately
const urlsToCache = ['/'];

// Image domains to cache
const imageDomains = [
  'raw.githubusercontent.com',
  'ifd-spaces.sfo2.cdn.digitaloceanspaces.com',
];

// Function to get Pokemon image URLs
async function getPokemonImageUrls() {
  try {
    const response = await fetch('/pokemon-ids.json');
    const pokemonIds = await response.json();
    
    return pokemonIds.map(nationalDexId => 
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${nationalDexId}.png`
    );
  } catch (error) {
    console.error('Service Worker: Failed to fetch Pokemon IDs', error);
    return [];
  }
}

// Function to prefetch Pokemon images in batches
async function prefetchPokemonImages() {
  const imageUrls = await getPokemonImageUrls();
  const cache = await caches.open(POKEMON_IMAGE_CACHE_NAME);
  
  console.log(`Service Worker: Starting to prefetch ${imageUrls.length} Pokemon images`);
  
  // Process images in batches to avoid overwhelming the network
  const batchSize = 10;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < imageUrls.length; i += batchSize) {
    const batch = imageUrls.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (url) => {
      try {
        // Check if already cached
        const cachedResponse = await cache.match(url);
        if (cachedResponse) {
          successCount++;
          return;
        }
        
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response.clone());
          successCount++;
        } else {
          errorCount++;
          console.warn(`Service Worker: Failed to fetch image ${url} - Status: ${response.status}`);
        }
      } catch (error) {
        errorCount++;
        console.warn(`Service Worker: Error fetching image ${url}:`, error);
      }
    });
    
    await Promise.allSettled(batchPromises);
    
    // Log progress every 50 images
    if ((i + batchSize) % 50 === 0 || i + batchSize >= imageUrls.length) {
      console.log(`Service Worker: Prefetched ${Math.min(i + batchSize, imageUrls.length)}/${imageUrls.length} Pokemon images (${successCount} success, ${errorCount} errors)`);
    }
  }
  
  console.log(`Service Worker: Pokemon image prefetching complete. ${successCount} successful, ${errorCount} errors`);
}

// Install event - cache essential resources and prefetch Pokemon images
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      // Cache essential files
      caches
        .open(CACHE_NAME)
        .then(cache => {
          console.log('Service Worker: Caching essential files');
          return cache.addAll(urlsToCache);
        })
        .catch(error => {
          console.error('Service Worker: Failed to cache essential files', error);
        }),
      // Prefetch Pokemon images
      prefetchPokemonImages()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (
            cacheName !== CACHE_NAME && 
            cacheName !== IMAGE_CACHE_NAME && 
            cacheName !== POKEMON_IMAGE_CACHE_NAME
          ) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

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

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  const url = new URL(request.url);
  
  // Check if this is a Pokemon sprite from GitHub
  const isPokemonSprite = url.hostname === 'raw.githubusercontent.com' && 
    url.pathname.includes('/sprites/pokemon/');
  
  // Use Pokemon image cache for Pokemon sprites, general image cache for others
  const cacheName = isPokemonSprite ? POKEMON_IMAGE_CACHE_NAME : IMAGE_CACHE_NAME;
  const cache = await caches.open(cacheName);

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
    getCacheSize().then(size => {
      event.ports[0].postMessage({
        type: 'CACHE_SIZE',
        size: size,
      });
    });
  }

  if (event.data && event.data.type === 'GET_POKEMON_CACHE_STATUS') {
    getPokemonCacheStatus().then(status => {
      event.ports[0].postMessage({
        type: 'POKEMON_CACHE_STATUS',
        status: status,
      });
    });
  }
});

// Calculate cache sizes
async function getCacheSize() {
  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      totalSize += requests.length;
    }
    
    return `${totalSize} items cached`;
  } catch (error) {
    return 'Unable to calculate cache size';
  }
}

// Get Pokemon cache status
async function getPokemonCacheStatus() {
  try {
    const cache = await caches.open(POKEMON_IMAGE_CACHE_NAME);
    const cachedRequests = await cache.keys();
    const imageUrls = await getPokemonImageUrls();
    
    return {
      total: imageUrls.length,
      cached: cachedRequests.length,
      percentage: Math.round((cachedRequests.length / imageUrls.length) * 100)
    };
  } catch (error) {
    return {
      total: 0,
      cached: 0,
      percentage: 0,
      error: 'Unable to get cache status'
    };
  }
}
