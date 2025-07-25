import { SpriteVariantsResponse, SpriteVariantsError } from '@/types/sprites';

/**
 * Test function to verify the sprite variants API endpoint
 * Usage examples:
 * - testSpriteVariantsApi(1) // Test Bulbasaur variants
 * - testSpriteVariantsApi(1, 4) // Test Bulbasaur/Charmander fusion variants
 */
export async function testSpriteVariantsApi(
  headId?: number | null,
  bodyId?: number | null,
  maxVariants = 10
): Promise<SpriteVariantsResponse | null> {
  try {
    const params = new URLSearchParams({
      maxVariants: maxVariants.toString(),
    });

    if (headId) params.set('headId', headId.toString());
    if (bodyId) params.set('bodyId', bodyId.toString());

    const response = await fetch(`/api/sprites/variants?${params.toString()}`);

    if (!response.ok) {
      console.error(`API request failed: ${response.statusText}`);
      return null;
    }

    const data: SpriteVariantsResponse | SpriteVariantsError =
      await response.json();

    if ('error' in data) {
      console.error(`API returned error: ${data.error}`);
      return null;
    }

    console.log(
      `Found ${data.variants.length} variants for ${data.cacheKey}:`,
      data.variants
    );
    return data;
  } catch (error) {
    console.error('Failed to test sprite variants API:', error);
    return null;
  }
}

/**
 * Test the API with common Pokémon IDs
 */
export async function runSpriteApiTests(): Promise<void> {
  console.log('Testing sprite variants API...');

  // Test single Pokémon
  await testSpriteVariantsApi(1); // Bulbasaur
  await testSpriteVariantsApi(25); // Pikachu

  // Test fusion
  await testSpriteVariantsApi(1, 4); // Bulbasaur/Charmander
  await testSpriteVariantsApi(25, 150); // Pikachu/Mewtwo

  console.log('Sprite API tests completed');
}
