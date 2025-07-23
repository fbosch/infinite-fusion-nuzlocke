/**
 * Check if a sprite URL exists by attempting to load it
 * Returns a promise that resolves to true if the image exists, false otherwise
 */
export async function checkSpriteExists(url: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image();

    img.onload = () => {
      resolve(true);
    };

    img.onerror = () => {
      resolve(false);
    };

    // Set a timeout to avoid hanging on slow networks
    const timeout = setTimeout(() => {
      resolve(false);
    }, 5000); // 5 second timeout

    img.onload = () => {
      clearTimeout(timeout);
      resolve(true);
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };

    img.src = url;
  });
}

/**
 * Generate sprite URL for a fusion with optional artwork variant
 */
export function generateFusionSpriteUrl(
  headId: number,
  bodyId: number,
  variant?: string
): string {
  const variantSuffix = variant ? variant : '';
  return `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/${headId}.${bodyId}${variantSuffix}.png`;
}

// Cache for artwork variants to avoid repeated checks
const variantCache = new Map<string, string[]>();

/**
 * Get available artwork variants for a fusion by checking which ones exist
 * Returns an array of available variants (empty string for default, 'a', 'b', etc.)
 */
export async function getAvailableArtworkVariants(
  headId: number,
  bodyId: number,
  maxVariants: number = 10
): Promise<string[]> {
  const cacheKey = `${headId}.${bodyId}`;

  // Return cached result if available
  if (variantCache.has(cacheKey)) {
    return variantCache.get(cacheKey)!;
  }

  const variants = ['']; // Always include default
  const variantLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

  // Check variants in parallel for better performance
  const checkPromises = variantLetters
    .slice(0, maxVariants - 1)
    .map(async letter => {
      const url = generateFusionSpriteUrl(headId, bodyId, letter);
      const exists = await checkSpriteExists(url);
      return exists ? letter : null;
    });

  const results = await Promise.all(checkPromises);

  // Add existing variants to the list
  results.forEach(result => {
    if (result) {
      variants.push(result);
    }
  });

  // Cache the result
  variantCache.set(cacheKey, variants);

  return variants;
}

/**
 * Clear the variant cache (useful for testing or if variants change)
 */
export function clearVariantCache(): void {
  variantCache.clear();
}
