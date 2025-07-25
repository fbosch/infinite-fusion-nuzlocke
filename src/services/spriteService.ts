/**
 * Check if a sprite URL exists by attempting to load it
 * Returns a promise that resolves to true if the image exists, false otherwise
 */
import { get, set, del, clear, entries, createStore } from 'idb-keyval';

// Create a custom store for sprite variant cache
const spritesStore = createStore('sprites', 'variant-cache');

export async function checkSpriteExists(url: string): Promise<boolean> {
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
    return false;
  }
}

/**
 * Generate sprite URL for a fusion with optional artwork variant
 */
export function generateFusionSpriteUrl(
  headId: number | undefined,
  bodyId: number | undefined,
  variant?: string
): string {
  const variantSuffix = variant ? variant : '';
  const id =
    headId && bodyId
      ? `${headId}.${bodyId}`
      : ((headId ?? bodyId)?.toString() ?? '');
  return `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/${id}${variantSuffix}.png`;
}

/**
 * Generate sprite URL for a single Pokémon with optional artwork variant
 */
export function generatePokemonSpriteUrl(
  pokemonId: number,
  variant?: string
): string {
  const variantSuffix = variant ? variant : '';
  return `https://ifd-spaces.sfo2.cdn.digitaloceanspaces.com/custom/${pokemonId}${variantSuffix}.png`;
}

// Enhanced cache with metadata about checking status
interface VariantCacheEntry {
  variants: string[];
  lastChecked: number;
  isComplete: boolean; // Whether we've checked all possible variants
  checkingPromise?: Promise<string[]>; // Track ongoing checks to avoid duplicates
}

// Persistent cache using IndexedDB
class PersistentVariantCache {
  private static readonly CACHE_KEY_PREFIX = 'pokemon-fusion-variant-cache-';
  private static readonly CACHE_VERSION = 1;
  private static readonly METADATA_KEY = 'cache-metadata';
  private cache = new Map<string, VariantCacheEntry>();
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.loadFromStorage();
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      // Check metadata for version compatibility
      const metadata = await get(
        PersistentVariantCache.METADATA_KEY,
        spritesStore
      );

      if (
        metadata &&
        metadata.version !== PersistentVariantCache.CACHE_VERSION
      ) {
        console.log('Cache version mismatch, clearing cache');
        await this.clearAll();
        return;
      }

      // Load all cache entries
      const allEntries = await entries(spritesStore);
      let loadedCount = 0;

      for (const [key, entry] of allEntries) {
        if (
          typeof key === 'string' &&
          key.startsWith(PersistentVariantCache.CACHE_KEY_PREFIX)
        ) {
          const cacheKey = key.replace(
            PersistentVariantCache.CACHE_KEY_PREFIX,
            ''
          );
          this.cache.set(cacheKey, {
            variants: entry.variants,
            lastChecked: entry.lastChecked,
            isComplete: entry.isComplete,
          });
          loadedCount++;
        }
      }

      console.log(
        `Loaded ${loadedCount} variant cache entries from IndexedDB sprites store`
      );
    } catch (error) {
      console.warn('Failed to load variant cache from IndexedDB:', error);
      await this.clearAll();
    }
  }

  private async saveToStorage(
    key: string,
    entry: VariantCacheEntry
  ): Promise<void> {
    try {
      // Save the specific entry
      const storageKey = PersistentVariantCache.CACHE_KEY_PREFIX + key;
      await set(
        storageKey,
        {
          variants: entry.variants,
          lastChecked: entry.lastChecked,
          isComplete: entry.isComplete,
          // Exclude checkingPromise from serialization
        },
        spritesStore
      );

      // Update metadata
      await set(
        PersistentVariantCache.METADATA_KEY,
        {
          version: PersistentVariantCache.CACHE_VERSION,
          lastSaved: Date.now(),
        },
        spritesStore
      );
    } catch (error) {
      console.warn('Failed to save variant cache to IndexedDB:', error);
      // Handle quota exceeded or other storage errors gracefully
    }
  }

  async get(key: string): Promise<VariantCacheEntry | undefined> {
    await this.ensureInitialized();
    return this.cache.get(key);
  }

  async set(key: string, entry: VariantCacheEntry): Promise<void> {
    await this.ensureInitialized();
    this.cache.set(key, entry);
    // Save to IndexedDB after updating cache
    await this.saveToStorage(key, entry);
  }

  async has(key: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.cache.has(key);
  }

  async delete(key: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = this.cache.delete(key);
    if (result) {
      try {
        const storageKey = PersistentVariantCache.CACHE_KEY_PREFIX + key;
        await del(storageKey, spritesStore);
      } catch (error) {
        console.warn('Failed to delete from IndexedDB:', error);
      }
    }
    return result;
  }

  async clear(): Promise<void> {
    await this.ensureInitialized();
    this.cache.clear();

    try {
      // Clear all cache entries from IndexedDB
      const allEntries = await entries(spritesStore);
      const deletePromises = [];

      for (const [key] of allEntries) {
        if (
          typeof key === 'string' &&
          key.startsWith(PersistentVariantCache.CACHE_KEY_PREFIX)
        ) {
          deletePromises.push(del(key, spritesStore));
        }
      }

      await Promise.all(deletePromises);
      await del(PersistentVariantCache.METADATA_KEY, spritesStore);
    } catch (error) {
      console.warn('Failed to clear IndexedDB:', error);
    }
  }

  async clearAll(): Promise<void> {
    this.cache.clear();

    try {
      await clear();
    } catch (error) {
      console.warn('Failed to clear IndexedDB:', error);
    }
  }

  async entries(): Promise<Array<[string, VariantCacheEntry]>> {
    await this.ensureInitialized();
    return Array.from(this.cache.entries());
  }

  async size(): Promise<number> {
    await this.ensureInitialized();
    return this.cache.size;
  }

  // Clean up expired entries and save
  async clearExpired(expiryTime: number): Promise<number> {
    await this.ensureInitialized();
    const now = Date.now();
    let cleared = 0;

    const keysToDelete = [];
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastChecked > expiryTime) {
        keysToDelete.push(key);
      }
    }

    // Delete expired entries
    for (const key of keysToDelete) {
      await this.delete(key);
      cleared++;
    }

    if (cleared > 0) {
      console.log(`Cleared ${cleared} expired cache entries`);
    }

    return cleared;
  }
}

const variantCache = new PersistentVariantCache();
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generate variant suffix for a given index
 * Supports pattern: '', 'a', 'b', ..., 'z', 'aa', 'ab', 'ac', ..., 'az', 'ba', 'bb', etc.
 */
function generateVariantSuffix(index: number): string {
  if (index === 0) return ''; // Default variant

  // Convert to 0-based index for letter generation
  index = index - 1;

  let result = '';

  // Generate base-26 representation
  do {
    result = String.fromCharCode(97 + (index % 26)) + result; // 97 is 'a'
    index = Math.floor(index / 26);
  } while (index > 0);

  return result;
}

/**
 * Sequential variant checking for fusions - returns early after first variant found
 * but continues checking in background to discover all variants
 */
async function checkFusionVariantsSequentially(
  headId: number | undefined,
  bodyId: number | undefined,
  maxVariants: number = 100
): Promise<string[]> {
  const variants = ['']; // Always include default
  const cacheKey =
    headId && bodyId
      ? `${headId}.${bodyId}`
      : ((headId ?? bodyId)?.toString() ?? '');

  // Check only the first variant quickly
  const firstVariantSuffix = generateVariantSuffix(1);
  const firstUrl = generateFusionSpriteUrl(headId, bodyId, firstVariantSuffix);

  try {
    const firstExists = await checkSpriteExists(firstUrl);

    if (firstExists) {
      variants.push(firstVariantSuffix);
      console.log(
        `Found first variant '${firstVariantSuffix}' for fusion ${headId}.${bodyId}, starting background check...`
      );
    } else {
      console.log(`No variants found for fusion ${headId}.${bodyId}`);
    }
  } catch (error) {
    console.warn(
      `Error checking first variant for ${headId}.${bodyId}:`,
      error
    );
  }

  // Always start background check to discover all variants
  checkAllVariantsInBackground(headId, bodyId, maxVariants, cacheKey);

  console.log(
    `Returning initial result for ${headId}.${bodyId}: found ${variants.length} total variants`
  );
  return variants;
}

/**
 * Check all variants in background and update cache
 */
async function checkAllVariantsInBackground(
  headId: number | undefined,
  bodyId: number | undefined,
  maxVariants: number,
  cacheKey: string
): Promise<void> {
  const allVariants = ['']; // Always include default

  for (let i = 1; i < maxVariants; i++) {
    const variantSuffix = generateVariantSuffix(i);
    const url = generateFusionSpriteUrl(headId, bodyId, variantSuffix);

    try {
      const exists = await checkSpriteExists(url);

      if (exists) {
        allVariants.push(variantSuffix);
        console.log(
          `Found variant '${variantSuffix}' for fusion ${headId}.${bodyId} (background)`
        );
      } else {
        console.log(
          `Background check complete for ${headId}.${bodyId}: found ${allVariants.length} total variants`
        );
        break;
      }
    } catch (error) {
      console.warn(`Error in background check for ${headId}.${bodyId}:`, error);
      break;
    }
  }

  // Update cache with complete results
  const completeEntry: VariantCacheEntry = {
    variants: allVariants,
    lastChecked: Date.now(),
    isComplete: true,
  };
  await variantCache.set(cacheKey, completeEntry);
}

/**
 * Sequential variant checking for single Pokémon - stops immediately on first missing variant
 * This minimizes HTTP requests by stopping as soon as we hit a 404
 */
async function checkPokemonVariantsSequentially(
  pokemonId: number,
  maxVariants: number = 100
): Promise<string[]> {
  const variants = ['']; // Always include default

  // Check variants one by one, stopping immediately when one doesn't exist
  for (let i = 1; i < maxVariants; i++) {
    const variantSuffix = generateVariantSuffix(i);
    const url = generatePokemonSpriteUrl(pokemonId, variantSuffix);

    try {
      const exists = await checkSpriteExists(url);

      if (exists) {
        variants.push(variantSuffix);
        console.log(
          `Found variant '${variantSuffix}' for Pokémon ${pokemonId}`
        );
      } else {
        // Stop immediately on first missing variant
        console.log(
          `Variant '${variantSuffix}' not found for Pokémon ${pokemonId}, stopping check`
        );
        break;
      }
    } catch (error) {
      console.warn(
        `Error checking variant ${variantSuffix} for Pokémon ${pokemonId}:`,
        error
      );
      // Stop on error as well
      break;
    }
  }

  console.log(
    `Sequential check complete for Pokémon ${pokemonId}: found ${variants.length} total variants`
  );
  return variants;
}

/**
 * Get available artwork variants for a fusion with optimized sequential checking
 * Returns early after first variant found, continues checking in background
 */
export async function getAvailableArtworkVariants(
  headId: number | undefined,
  bodyId: number | undefined,
  maxVariants: number = 10
): Promise<string[]> {
  const cacheKey =
    headId && bodyId
      ? `${headId}.${bodyId}`
      : ((headId ?? bodyId)?.toString() ?? '');
  const now = Date.now();

  // Check if we have a valid cached result
  const cached = await variantCache.get(cacheKey);
  if (cached && now - cached.lastChecked < CACHE_EXPIRY) {
    return cached.variants;
  }

  // If there's already an ongoing check for this fusion, wait for it
  if (cached?.checkingPromise) {
    return await cached.checkingPromise;
  }

  // Start the check and cache the promise to avoid duplicate requests
  const checkingPromise = (async () => {
    try {
      console.log(
        `Checking artwork variants for fusion ${headId}.${bodyId}...`
      );

      // Use sequential checking with early return and background completion
      const variants = await checkFusionVariantsSequentially(
        headId,
        bodyId,
        maxVariants
      );

      console.log(
        `Initial result for fusion ${headId}.${bodyId}: [${variants.join(', ')}]`
      );

      // Cache the initial result (background process will update with complete results)
      const cacheEntry: VariantCacheEntry = {
        variants,
        lastChecked: now,
        isComplete: variants.length === 1, // Only complete if just default variant
      };
      await variantCache.set(cacheKey, cacheEntry);

      return variants;
    } catch (error) {
      console.error(`Failed to check variants for ${headId}.${bodyId}:`, error);

      // Cache a minimal result to avoid repeated failures
      const fallbackEntry: VariantCacheEntry = {
        variants: [''], // Just the default
        lastChecked: now,
        isComplete: false,
      };
      await variantCache.set(cacheKey, fallbackEntry);

      return [''];
    }
  })();

  // Store the promise in cache to prevent duplicate requests
  if (cached) {
    cached.checkingPromise = checkingPromise;
  } else {
    await variantCache.set(cacheKey, {
      variants: [''],
      lastChecked: 0,
      isComplete: false,
      checkingPromise,
    });
  }

  return await checkingPromise;
}

/**
 * Get available artwork variants for a single Pokémon with optimized sequential checking
 * Uses sequential checking to minimize HTTP requests by stopping on first 404
 */
export async function getAvailablePokemonArtworkVariants(
  pokemonId: number,
  maxVariants: number = 100
): Promise<string[]> {
  const cacheKey = pokemonId.toString();
  const now = Date.now();

  // Check if we have a valid cached result
  const cached = await variantCache.get(cacheKey);
  if (cached && now - cached.lastChecked < CACHE_EXPIRY) {
    return cached.variants;
  }

  // If there's already an ongoing check for this Pokémon, wait for it
  if (cached?.checkingPromise) {
    return await cached.checkingPromise;
  }

  // Start the check and cache the promise to avoid duplicate requests
  const checkingPromise = (async () => {
    try {
      console.log(`Checking artwork variants for Pokémon ${pokemonId}...`);

      // Use sequential checking to minimize HTTP requests
      const variants = await checkPokemonVariantsSequentially(
        pokemonId,
        maxVariants
      );

      console.log(
        `Found ${variants.length} variants for Pokémon ${pokemonId}: [${variants.join(', ')}]`
      );

      // Cache the result
      const cacheEntry: VariantCacheEntry = {
        variants,
        lastChecked: now,
        isComplete: true,
      };
      await variantCache.set(cacheKey, cacheEntry);

      return variants;
    } catch (error) {
      console.error(
        `Failed to check variants for Pokémon ${pokemonId}:`,
        error
      );

      // Cache a minimal result to avoid repeated failures
      const fallbackEntry: VariantCacheEntry = {
        variants: [''], // Just the default
        lastChecked: now,
        isComplete: false,
      };
      await variantCache.set(cacheKey, fallbackEntry);

      return [''];
    }
  })();

  // Store the promise in cache to prevent duplicate requests
  if (cached) {
    cached.checkingPromise = checkingPromise;
  } else {
    await variantCache.set(cacheKey, {
      variants: [''],
      lastChecked: 0,
      isComplete: false,
      checkingPromise,
    });
  }

  return await checkingPromise;
}

/**
 * Preload variants for multiple fusions in the background
 * Useful for preloading variants for visible encounters
 */
export async function preloadArtworkVariants(
  fusions: Array<{ headId: number; bodyId: number }>,
  maxConcurrent: number = 2
): Promise<void> {
  console.log(`Preloading artwork variants for ${fusions.length} fusions...`);

  // Process fusions in small batches to avoid overwhelming the server
  for (let i = 0; i < fusions.length; i += maxConcurrent) {
    const batch = fusions.slice(i, i + maxConcurrent);

    const preloadPromises = batch.map(({ headId, bodyId }) =>
      getAvailableArtworkVariants(headId, bodyId).catch(error => {
        console.warn(
          `Failed to preload variants for ${headId}.${bodyId}:`,
          error
        );
      })
    );

    await Promise.all(preloadPromises);

    // Add a small delay between batches to be respectful to the server
    if (i + maxConcurrent < fusions.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(
    `Completed preloading artwork variants for ${fusions.length} fusions`
  );
}

/**
 * Get cache statistics for debugging
 */
export async function getVariantCacheStats(): Promise<{
  size: number;
  entries: Array<{
    key: string;
    variants: number;
    lastChecked: Date;
    isComplete: boolean;
  }>;
}> {
  const entries = (await variantCache.entries()).map(([key, entry]) => ({
    key,
    variants: entry.variants.length,
    lastChecked: new Date(entry.lastChecked),
    isComplete: entry.isComplete,
  }));

  return {
    size: await variantCache.size(),
    entries,
  };
}

/**
 * Clear expired cache entries
 */
export async function clearExpiredCache(): Promise<number> {
  return await variantCache.clearExpired(CACHE_EXPIRY);
}

/**
 * Clear the variant cache (useful for testing or if variants change)
 */
export async function clearVariantCache(): Promise<void> {
  await variantCache.clearAll();
  console.log('Cleared all variant cache entries');
}

/**
 * Get cached variants without making HTTP requests
 * Returns null if not cached or expired
 */
export async function getCachedArtworkVariants(
  headId: number,
  bodyId: number
): Promise<string[] | null> {
  const cacheKey = `${headId}.${bodyId}`;
  const cached = await variantCache.get(cacheKey);

  if (!cached) return null;

  const now = Date.now();
  if (now - cached.lastChecked > CACHE_EXPIRY) {
    return null;
  }

  return cached.variants;
}

/**
 * Get cached variants for single Pokémon without making HTTP requests
 * Returns null if not cached or expired
 */
export async function getCachedPokemonArtworkVariants(
  pokemonId: number
): Promise<string[] | null> {
  const cached = await variantCache.get(pokemonId.toString());
  if (!cached) return null;
  return cached.variants;
}
