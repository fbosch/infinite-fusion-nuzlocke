// Import mocks first (must be at top level for Vitest hoisting)
import './mocks';

// Mock preferredVariants module
import { vi } from 'vitest';
vi.mock('../../src/lib/preferredVariants', () => ({
  getPreferredVariant: vi.fn(),
  setPreferredVariant: vi.fn(),
  clearPreferredVariants: vi.fn(),
  reloadPreferredVariants: vi.fn(),
}));

// Import the mocked functions
import {
  getPreferredVariant,
  setPreferredVariant,
} from '../../src/lib/preferredVariants';

// Type the mocked functions properly
const mockedGetPreferredVariant = getPreferredVariant as vi.MockedFunction<
  typeof getPreferredVariant
>;
const mockedSetPreferredVariant = setPreferredVariant as vi.MockedFunction<
  typeof setPreferredVariant
>;

// Import shared setup and utilities
import {
  describe,
  it,
  expect,
  beforeEach,
  act,
  playthroughActions,
  createMockPokemon,
  setupPlaythroughTest,
} from './setup';

// Mock sprites module methods that are used in the tests
vi.mock('../../src/lib/sprites', () => ({
  generateSpriteUrl: vi.fn(
    (headId, bodyId, variant = '') =>
      `mock-sprite-url-${headId || 'unknown'}-${bodyId || 'unknown'}${variant ? `-${variant}` : ''}`
  ),
  getArtworkVariants: vi.fn().mockResolvedValue(['']),
  getSpriteId: vi.fn((headId, bodyId) => {
    return headId && bodyId
      ? `${headId}.${bodyId}`
      : (headId || bodyId || '').toString();
  }),
  checkSpriteExists: vi.fn().mockResolvedValue(true),
  getSpriteCredits: vi.fn().mockResolvedValue(null),
  getVariantSpriteCredits: vi.fn().mockResolvedValue(null),
  getFormattedVariantSpriteCredits: vi.fn().mockResolvedValue(''),
  getFormattedCreditsFromResponse: vi.fn(() => ''),
  getVariantSuffix: vi.fn(index =>
    index === 0 ? '' : String.fromCharCode(97 + index - 1)
  ),
}));

describe('Playthroughs Store - Preferred Variants (Global System)', () => {
  beforeEach(() => {
    setupPlaythroughTest();
    vi.clearAllMocks();
  });

  describe('setArtworkVariant (Global Variants)', () => {
    beforeEach(async () => {
      // Set up a test playthrough with an encounter
      const playthroughId = playthroughActions.createPlaythrough('Test Run');
      await playthroughActions.setActivePlaythrough(playthroughId);

      const pikachu = createMockPokemon('Pikachu', 25);
      await playthroughActions.updateEncounter('route-1', pikachu);
    });

    it('should set global preferred variant for single Pokemon', async () => {
      await act(async () => {
        playthroughActions.setArtworkVariant('route-1', 'new-variant');
      });

      // Should update global preferred variant cache
      expect(mockedSetPreferredVariant).toHaveBeenCalledWith(
        25,
        null,
        'new-variant'
      );

      // Should update encounter timestamp for reactivity
      const encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];
      expect(encounter?.updatedAt).toBeGreaterThan(0);
    });

    it('should set global preferred variant for fusion', async () => {
      const charmander = createMockPokemon('Charmander', 4);

      // Create a fusion encounter
      await act(async () => {
        await playthroughActions.updateEncounter(
          'route-2',
          charmander,
          'body',
          true
        );
        const pikachu = createMockPokemon('Pikachu', 25);
        await playthroughActions.updateEncounter(
          'route-2',
          pikachu,
          'head',
          true
        );
      });

      await act(async () => {
        playthroughActions.setArtworkVariant('route-2', 'fusion-variant');
      });

      // Should update global preferred variant cache for fusion
      expect(mockedSetPreferredVariant).toHaveBeenCalledWith(
        25,
        4,
        'fusion-variant'
      );
    });

    it('should handle errors when updating global preferred variant cache', async () => {
      mockedSetPreferredVariant.mockRejectedValue(new Error('Service error'));

      await act(async () => {
        playthroughActions.setArtworkVariant('route-1', 'new-variant');
      });

      // Should still update encounter timestamp
      const encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];
      expect(encounter?.updatedAt).toBeGreaterThan(0);
    });

    it('should clear global preferred variant when setting to undefined', async () => {
      await act(async () => {
        playthroughActions.setArtworkVariant('route-1', undefined);
      });

      expect(mockedSetPreferredVariant).toHaveBeenCalledWith(25, null, '');
    });
  });

  describe('cycleArtworkVariant (Global Variants)', () => {
    beforeEach(async () => {
      // Set up a test playthrough with an encounter
      const playthroughId = playthroughActions.createPlaythrough('Test Run');
      await playthroughActions.setActivePlaythrough(playthroughId);

      const pikachu = createMockPokemon('Pikachu', 25);
      await playthroughActions.updateEncounter('route-1', pikachu);
    });

    it('should cycle through available variants forward', async () => {
      // Mock current preferred variant and available variants
      mockedGetPreferredVariant.mockReturnValue('');
      const sprites = await import('../../src/lib/sprites');
      vi.mocked(sprites.getArtworkVariants).mockResolvedValue([
        '',
        'variant-1',
        'variant-2',
      ]);

      await act(async () => {
        await playthroughActions.cycleArtworkVariant('route-1', false);
      });

      // Should set next variant in global cache
      expect(mockedSetPreferredVariant).toHaveBeenCalledWith(
        25,
        null,
        'variant-1'
      );

      // Should update encounter timestamp for reactivity
      const encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];
      expect(encounter?.updatedAt).toBeGreaterThan(0);
    });

    it('should cycle through available variants backward', async () => {
      // Mock current preferred variant and available variants
      mockedGetPreferredVariant.mockReturnValue('');
      const sprites = await import('../../src/lib/sprites');
      vi.mocked(sprites.getArtworkVariants).mockResolvedValue([
        '',
        'variant-1',
        'variant-2',
      ]);

      await act(async () => {
        await playthroughActions.cycleArtworkVariant('route-1', true);
      });

      // Should set previous variant in global cache
      expect(mockedSetPreferredVariant).toHaveBeenCalledWith(
        25,
        null,
        'variant-2'
      );
    });

    it('should handle single variant gracefully', async () => {
      const sprites = await import('../../src/lib/sprites');
      vi.mocked(sprites.getArtworkVariants).mockResolvedValue(['']);

      await act(async () => {
        await playthroughActions.cycleArtworkVariant('route-1', false);
      });

      // Should not call setPreferredVariant for single variant
      expect(mockedSetPreferredVariant).not.toHaveBeenCalled();
    });

    it('should handle no variants gracefully', async () => {
      const sprites = await import('../../src/lib/sprites');
      vi.mocked(sprites.getArtworkVariants).mockResolvedValue([]);

      await act(async () => {
        await playthroughActions.cycleArtworkVariant('route-1', false);
      });

      expect(mockedSetPreferredVariant).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const sprites = await import('../../src/lib/sprites');
      vi.mocked(sprites.getArtworkVariants).mockRejectedValue(
        new Error('Service error')
      );

      await act(async () => {
        await playthroughActions.cycleArtworkVariant('route-1', false);
      });

      // Should still update encounter timestamp
      const encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];
      expect(encounter?.updatedAt).toBeGreaterThan(0);
    });
  });

  describe('prefetchAdjacentVariants', () => {
    it('should prefetch adjacent variants for better UX', async () => {
      // Mock Image constructor to track prefetch calls
      const mockImage = vi.fn().mockImplementation(() => ({
        setAttribute: vi.fn(),
        src: '',
        onload: vi.fn(),
        onerror: vi.fn(),
      }));
      global.Image = mockImage;

      // Mock generateSpriteUrl to return valid URLs
      const sprites = await import('../../src/lib/sprites');
      vi.mocked(sprites.generateSpriteUrl).mockReturnValue('mock-url');

      await act(async () => {
        await playthroughActions.prefetchAdjacentVariants(25, 4, 'variant-1', [
          '',
          'variant-1',
          'variant-2',
        ]);
      });

      // Wait for async prefetch to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have called Image constructor for prefetching
      expect(mockImage).toHaveBeenCalled();
    });

    it('should handle errors gracefully during prefetching', async () => {
      const mockImage = vi.fn().mockImplementation(() => ({
        setAttribute: vi.fn(),
        src: '',
        onload: vi.fn(),
        onerror: vi.fn(),
      }));
      global.Image = mockImage;

      // Mock generateSpriteUrl to throw error
      const sprites = await import('../../src/lib/sprites');
      vi.mocked(sprites.generateSpriteUrl).mockImplementation(() => {
        throw new Error('URL generation error');
      });

      await act(async () => {
        await playthroughActions.prefetchAdjacentVariants(25, 4, 'variant-1', [
          'variant-0',
          'variant-1',
          'variant-2',
        ]);
      });

      // Wait for async prefetch to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not have called Image constructor because generateSpriteUrl throws
      expect(mockImage).not.toHaveBeenCalled();
    });
  });

  describe('preloadArtworkVariants', () => {
    beforeEach(async () => {
      // Set up a test playthrough with multiple encounters
      const playthroughId = playthroughActions.createPlaythrough('Test Run');
      await playthroughActions.setActivePlaythrough(playthroughId);

      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      await playthroughActions.updateEncounter('route-1', pikachu);
      await playthroughActions.createFusion('route-2', pikachu, charmander);
    });

    it('should preload variants for all encounters in the playthrough', async () => {
      const sprites = await import('../../src/lib/sprites');
      vi.mocked(sprites.getArtworkVariants).mockResolvedValue([
        '',
        'variant-1',
      ]);

      await act(async () => {
        await playthroughActions.preloadArtworkVariants();
      });

      // Should have called getArtworkVariants for both encounters
      expect(vi.mocked(sprites.getArtworkVariants)).toHaveBeenCalledWith(25); // Single Pokémon
      expect(vi.mocked(sprites.getArtworkVariants)).toHaveBeenCalledWith(25, 4); // Fusion
    });

    it('should handle errors gracefully for individual encounters', async () => {
      const sprites = await import('../../src/lib/sprites');
      vi.mocked(sprites.getArtworkVariants)
        .mockResolvedValueOnce(['', 'variant-1']) // Single Pokémon
        .mockRejectedValueOnce(new Error('Fusion error')); // Fusion

      await act(async () => {
        await playthroughActions.preloadArtworkVariants();
      });

      // Should still have called for both encounters despite one failing
      expect(vi.mocked(sprites.getArtworkVariants)).toHaveBeenCalledTimes(2);
    });

    it('should handle playthroughs with no encounters', async () => {
      // Create a new playthrough with no encounters
      const playthroughId = playthroughActions.createPlaythrough('Empty Run');
      await playthroughActions.setActivePlaythrough(playthroughId);

      await act(async () => {
        await playthroughActions.preloadArtworkVariants();
      });

      const sprites = await import('../../src/lib/sprites');
      expect(vi.mocked(sprites.getArtworkVariants)).not.toHaveBeenCalled();
    });
  });

  describe('Global Variants Integration', () => {
    it('should work with global preferred variants when creating encounters', async () => {
      // The global system means encounters are created without variants
      // Variants are fetched on-demand from the global cache
      const pikachu = createMockPokemon('Pikachu', 25);

      await act(async () => {
        const playthroughId = playthroughActions.createPlaythrough('Test Run');
        await playthroughActions.setActivePlaythrough(playthroughId);
        await playthroughActions.updateEncounter('route-1', pikachu);
      });

      const encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];

      // Encounter should not have an artworkVariant field anymore
      expect(encounter).toBeDefined();
      expect(encounter?.head?.id).toBe(25);
      expect('artworkVariant' in encounter!).toBe(false);
    });

    it('should work with global preferred variants when creating fusions', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      await act(async () => {
        const playthroughId = playthroughActions.createPlaythrough('Test Run');
        await playthroughActions.setActivePlaythrough(playthroughId);
        await playthroughActions.createFusion('route-1', pikachu, charmander);
      });

      const encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];

      // Encounter should not have an artworkVariant field anymore
      expect(encounter).toBeDefined();
      expect(encounter?.head?.id).toBe(25);
      expect(encounter?.body?.id).toBe(4);
      expect(encounter?.isFusion).toBe(true);
      expect('artworkVariant' in encounter!).toBe(false);
    });
  });
});
