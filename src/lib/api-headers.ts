/**
 * Utility functions for API cache headers with build ID integration
 */

const getBuildId = () => {
  return process.env.NEXT_PUBLIC_BUILD_ID || 
         (process.env.NODE_ENV === 'development' ? 'dev' : 'default');
};

/**
 * Create cache headers with ETag based on build ID
 */
export function createCacheHeaders(options: {
  maxAge?: number;
  staleWhileRevalidate?: number;
  includeETag?: boolean;
} = {}) {
  const {
    maxAge = 3600, // 1 hour default
    staleWhileRevalidate = 300, // 5 minutes default
    includeETag = true,
  } = options;

  const headers: Record<string, string> = {
    'Cache-Control': `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
  };

  if (includeETag) {
    headers['ETag'] = `"${getBuildId()}"`;
  }

  return headers;
}

/**
 * Create development-specific cache headers (shorter cache times)
 */
export function createDevCacheHeaders(maxAge: number = 30) {
  return {
    'Cache-Control': `public, max-age=${maxAge}`,
    'ETag': `"${getBuildId()}"`,
  };
}

/**
 * Create no-cache headers (for sensitive endpoints)
 */
export function createNoCacheHeaders() {
  return {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };
}