import { NextRequest, NextResponse } from 'next/server';
import { SpriteVariantsResponse } from '@/types/sprites';

export const runtime = 'edge';

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
function generateSpriteUrl(
  headId?: number | null,
  bodyId?: number | null,
  variant = ''
): string {
  const id = headId && bodyId ? `${headId}.${bodyId}` : headId || bodyId || '';
  return `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/${id}${variant}.png`;
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
    const headId = searchParams.get('headId');
    const bodyId = searchParams.get('bodyId');
    const maxVariants = 50;

    // Validate input
    if (!headId && !bodyId) {
      return NextResponse.json(
        { error: 'Either headId or bodyId must be provided' },
        { status: 400 }
      );
    }

    const headIdNum = headId ? parseInt(headId, 10) : null;
    const bodyIdNum = bodyId ? parseInt(bodyId, 10) : null;

    if ((headId && isNaN(headIdNum!)) || (bodyId && isNaN(bodyIdNum!))) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const variants: string[] = [];

    // Check variants sequentially to maintain order and break early
    for (let i = 0; i < maxVariants; i++) {
      const variant = getVariantSuffix(i);
      const url = generateSpriteUrl(headIdNum, bodyIdNum, variant);

      if (await checkSpriteExists(url)) {
        variants.push(variant);
      } else {
        // No more variants available, break early
        break;
      }
    }

    // Cache response for 24 hours
    const responseData: SpriteVariantsResponse = {
      variants,
      cacheKey:
        (headIdNum && bodyIdNum
          ? `${headIdNum}.${bodyIdNum}`
          : headIdNum || bodyIdNum
        )?.toString() || '',
      timestamp: Date.now(),
    };

    const response = NextResponse.json(responseData);

    // Set cache headers
    response.headers.set(
      'Cache-Control',
      'public, max-age=86400, stale-while-revalidate=3600'
    );

    return response;
  } catch (error) {
    console.error('Error in sprite variants API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
