import { NextRequest, NextResponse } from 'next/server';
import { SpriteVariantsResponse } from '@/types/sprites';

export const revalidate = 86400;

// Request deduplication cache for CDN optimization
const processingCache = new Map<string, Promise<NextResponse>>();

/**
 * Generate variant suffix for index (0='', 1='a', 2='b', etc.)
 */
function getVariantSuffix(index: number): string {
  if (index === 0) return '';

  let result = '';
  index = index - 1; // Convert to 0-based

  do {
    result = String.fromCharCode(97 + (index % 26)) + result;
    index = Math.floor(index / 26);
  } while (index > 0);

  return result;
}

/**
 * Generate sprite URL for a fusion or single Pokémon
 */
function generateSpriteUrl(id: string, variant = ''): string {
  return `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/${id}${variant}.png`;
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });

  // Set CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return response;
}

/**
 * Check if a sprite URL exists using fetch
 */
async function checkSpriteExists(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    // If HEAD fails, try GET (some servers don't support HEAD)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Range: 'bytes=0-1023', // Only fetch first 1KB to minimize data transfer
        },
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (getError) {
      console.warn('Failed to check sprite exists:', error, getError);
      return false;
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    // Ignore cache busting version parameter (v)
    const maxVariants = 50;

    // Check if we're already processing this request (CDN deduplication)
    const cacheKey = `sprite-variants-${id}`;
    if (processingCache.has(cacheKey)) {
      return processingCache.get(cacheKey)!;
    }

    // Validate input
    if (!id) {
      const errorResponse = NextResponse.json(
        { error: 'id parameter is required' },
        { status: 400 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    // Validate id format (should be like "25.125" or just "25")
    if (!/^\d+(\.\d+)?$/.test(id)) {
      const errorResponse = NextResponse.json(
        {
          error:
            'Invalid id format. Expected format: "headId" or "headId.bodyId"',
        },
        { status: 400 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    // Create processing promise and cache it
    const processingPromise = processSpriteVariants(id, maxVariants);
    processingCache.set(cacheKey, processingPromise);

    // Clean up cache after completion
    processingPromise.finally(() => {
      processingCache.delete(cacheKey);
    });

    // Wrap promise to handle rejections with proper error response and CORS headers
    return processingPromise.catch(error => {
      console.error('Error processing sprite variants:', error);

      const errorResponse = NextResponse.json(
        { error: 'Failed to process sprite variants' },
        { status: 500 }
      );

      // Set CORS headers on error response
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      errorResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');

      return errorResponse;
    });
  } catch (error) {
    console.error('Error in sprite variants API:', error);

    const errorResponse = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );

    // Set CORS headers on error response too
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    errorResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return errorResponse;
  }
}

/**
 * Process sprite variants with CDN optimization
 */
async function processSpriteVariants(
  id: string,
  maxVariants: number
): Promise<NextResponse> {
  const variants: string[] = [];

  // Check variants sequentially to maintain order and break early
  for (let i = 0; i < maxVariants; i++) {
    const variant = getVariantSuffix(i);
    const url = generateSpriteUrl(id, variant);

    if (await checkSpriteExists(url)) {
      variants.push(variant);
    } else {
      // No more variants available, break early
      break;
    }
  }

  const responseData: SpriteVariantsResponse = {
    variants,
    cacheKey: id,
    timestamp: Date.now(),
  };

  const response = NextResponse.json(responseData);

  // Set CORS headers to allow requests from any origin
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  // CDN-optimized cache headers
  response.headers.set(
    'Cache-Control',
    'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600' // CDN edge caching
  );

  // Additional CDN optimization headers
  response.headers.set('Vary', 'Accept-Encoding'); // Enable compression
  response.headers.set('X-Cache-Status', 'HIT'); // For debugging

  return response;
}
