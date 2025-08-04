import { SpriteVariantsResponse, SpriteVariantsError } from '@/types/sprites';
import { formatArtistCredits } from '@/utils/formatCredits';

// Types for sprite credits API
export interface SpriteCreditsResponse {
  [spriteId: string]: string[];
}

export interface SpriteCreditsError {
  error: string;
}

/**
 * Generate sprite ID from head and body IDs
 */
export function getSpriteId(
  headId?: number | null,
  bodyId?: number | null
): string {
  return headId && bodyId
    ? `${headId}.${bodyId}`
    : (headId || bodyId || '').toString();
}

/**
 * Generate sprite URL for a fusion or single Pokémon
 */
export function generateSpriteUrl(
  headId?: number | null,
  bodyId?: number | null,
  variant = ''
): string {
  const id = headId && bodyId ? `${headId}.${bodyId}` : headId || bodyId || '';
  return `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/${id}${variant}.png`;
}

/**
 * Generate variant suffix for index (0='', 1='a', 2='b', etc.)
 */
export function getVariantSuffix(index: number): string {
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
 * Check if a sprite URL exists
 * Works in both main thread (using Image) and web workers (using fetch)
 */
export async function checkSpriteExists(url: string): Promise<boolean> {
  // Try Image approach first in main thread (more reliable for images)
  if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
    return new Promise<boolean>(resolve => {
      const img = new Image();
      img.decoding = 'async';

      const timeoutId = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        resolve(false);
      }, 3000);

      img.onload = () => {
        clearTimeout(timeoutId);
        resolve(true);
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        resolve(false);
      };

      img.src = url;
    });
  }

  // Fallback to fetch for web workers or when Image is not available
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
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (getError) {
      console.warn('Failed to check sprite exists:', error, getError);
      return false;
    }
  }
}

/**
 * Get available artwork variants for a Pokémon or fusion
 */
export async function getArtworkVariants(
  headId?: number | null,
  bodyId?: number | null
): Promise<string[]> {
  if (!headId && !bodyId) return [''];

  try {
    // Use edge function to get variants (avoids CORS issues)
    const id =
      headId && bodyId ? `${headId}.${bodyId}` : headId || bodyId || '';
    const params = new URLSearchParams();
    params.set('id', id.toString());
    
    // Add cache busting version parameter
    const buildId = process.env.NEXT_PUBLIC_BUILD_ID || 
                   (process.env.NODE_ENV === 'development' ? 'dev' : 'default');
    params.set('v', buildId);

    const response = await fetch(`/api/sprite/variants?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch variants: ${response.statusText}`);
    }

    const data: SpriteVariantsResponse | SpriteVariantsError =
      await response.json();

    // Check if response is an error
    if ('error' in data) {
      throw new Error(data.error);
    }

    return data.variants || [];
  } catch (error) {
    console.warn('Failed to get artwork variants from API:', error);

    // Return empty array to avoid CORS issues with direct CDN access
    // The API should handle all sprite checking server-side
    return [''];
  }
}

/**
 * Get sprite credits for a Pokémon sprite and its variants
 */
export async function getSpriteCredits(
  headId?: number | null,
  bodyId?: number | null
): Promise<SpriteCreditsResponse | null> {
  if (!headId && !bodyId) return null;

  try {
    // Generate the sprite ID (same format as other methods)
    const id =
      headId && bodyId ? `${headId}.${bodyId}` : headId || bodyId || '';

    // Add cache busting version parameter
    const buildId = process.env.NEXT_PUBLIC_BUILD_ID || 
                   (process.env.NODE_ENV === 'development' ? 'dev' : 'default');
    
    const response = await fetch(
      `/api/sprite/artists?id=${encodeURIComponent(id)}&v=${encodeURIComponent(buildId)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch sprite credits: ${response.statusText}`);
    }

    const data: SpriteCreditsResponse | SpriteCreditsError =
      await response.json();

    // Check if response is an error
    if ('error' in data) {
      throw new Error(
        typeof data.error === 'string' ? data.error : 'Unknown error'
      );
    }

    return data;
  } catch (error) {
    console.warn('Failed to get sprite credits from API:', error);
    return null;
  }
}

/**
 * Get sprite credits for a specific sprite variant
 */
export async function getVariantSpriteCredits(
  headId?: number | null,
  bodyId?: number | null,
  variant = ''
): Promise<string[] | null> {
  const allCredits = await getSpriteCredits(headId, bodyId);
  if (!allCredits) return null;

  // Generate the variant key
  const baseId =
    headId && bodyId ? `${headId}.${bodyId}` : headId || bodyId || '';
  const variantKey = variant ? `${baseId}${variant}` : baseId;

  return allCredits[variantKey] || null;
}

/**
 * Get formatted sprite credits for a specific sprite variant
 * Returns a human-readable string like "GameFreak, Artist1 and Artist2"
 */
export async function getFormattedVariantSpriteCredits(
  headId?: number | null,
  bodyId?: number | null,
  variant = ''
): Promise<string> {
  const credits = await getVariantSpriteCredits(headId, bodyId, variant);
  return formatArtistCredits(credits);
}

/**
 * Get formatted sprite credits from a credits response object
 * Useful when you already have the credits data and just need to format a specific variant
 */
export function getFormattedCreditsFromResponse(
  credits: SpriteCreditsResponse | null | undefined,
  headId?: number | null,
  bodyId?: number | null,
  variant = ''
): string {
  if (!credits) return formatArtistCredits(null);

  // Generate the variant key
  const baseId =
    headId && bodyId ? `${headId}.${bodyId}` : headId || bodyId || '';
  const variantKey = variant ? `${baseId}${variant}` : baseId;

  return formatArtistCredits(credits[variantKey]);
}
