import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { z } from 'zod';

// Mock IndexedDB operations first
vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
  createStore: vi.fn(() => ({
    // Mock store object that can be passed as second parameter
    name: 'mock-store',
    storeName: 'mock-object-store',
  })),
}));

// Mock sprite service to avoid Worker issues in tests
vi.mock('../../src/services/spriteService', () => ({
  default: {
    generateSpriteUrl: vi.fn(
      (headId, bodyId, variant = '') =>
        `mock-sprite-url-${headId || 'unknown'}-${bodyId || 'unknown'}${variant ? `-${variant}` : ''}`
    ),
    getArtworkVariants: vi.fn().mockResolvedValue(['']),
    getPreferredVariant: vi.fn().mockResolvedValue(undefined),
    setPreferredVariant: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock search service to avoid Worker issues in tests
vi.mock('../../src/services/searchService', () => ({
  default: {
    search: vi.fn().mockResolvedValue([]),
  },
}));

// Now import the modules
import {
  playthroughActions,
  playthroughsStore,
  usePreferredVariant,
} from '../../src/stores/playthroughs';
import { PokemonOptionSchema } from '../../src/loaders/pokemon';

type PokemonOption = z.infer<typeof PokemonOptionSchema>;

const createMockPokemon = (name: string, id: number): PokemonOption => ({
  id,
  name,
  nationalDexId: id,
  originalLocation: undefined,
});

describe('Preferred Variant Handling', () => {
  let mockSpriteService: ReturnType<
    typeof vi.mocked<typeof import('../../src/services/spriteService').default>
  >;

  beforeEach(async () => {
    // Reset store state
    playthroughsStore.playthroughs = [];
    playthroughsStore.activePlaythroughId = undefined;

    // Get the mocked sprite service
    mockSpriteService = vi.mocked(
      (await import('../../src/services/spriteService')).default
    );

    // Reset mock calls
    vi.clearAllMocks();
  });

  describe('applyPreferredVariant', () => {
    it('should apply preferred variant for single Pokémon encounters', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);

      // Mock sprite service to return a preferred variant
      mockSpriteService.getPreferredVariant.mockResolvedValue('variant-1');

      const encounter = {
        head: pikachu,
        body: null,
        isFusion: false,
        artworkVariant: undefined,
        updatedAt: Date.now(),
      };

      await act(async () => {
        await playthroughActions.applyPreferredVariant(encounter, true);
      });

      expect(encounter.artworkVariant).toBe('variant-1');
      expect(mockSpriteService.getPreferredVariant).toHaveBeenCalledWith(
        25,
        undefined
      );
    });

    it('should apply preferred variant for fusion encounters', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Mock sprite service to return a preferred variant
      mockSpriteService.getPreferredVariant.mockResolvedValue('fusion-variant');

      const encounter = {
        head: pikachu,
        body: charmander,
        isFusion: true,
        artworkVariant: undefined,
        updatedAt: Date.now(),
      };

      await act(async () => {
        await playthroughActions.applyPreferredVariant(encounter, true);
      });

      expect(encounter.artworkVariant).toBe('fusion-variant');
      expect(mockSpriteService.getPreferredVariant).toHaveBeenCalledWith(25, 4);
    });

    it('should not apply variant if already set and not forced', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);

      const encounter = {
        head: pikachu,
        body: null,
        isFusion: false,
        artworkVariant: 'existing-variant',
        updatedAt: Date.now(),
      };

      await act(async () => {
        await playthroughActions.applyPreferredVariant(encounter, false);
      });

      expect(encounter.artworkVariant).toBe('existing-variant');
      expect(mockSpriteService.getPreferredVariant).not.toHaveBeenCalled();
    });

    it('should apply variant if forced even when already set', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);

      // Mock sprite service to return a new preferred variant
      mockSpriteService.getPreferredVariant.mockResolvedValue('new-variant');

      const encounter = {
        head: pikachu,
        body: null,
        isFusion: false,
        artworkVariant: 'existing-variant',
        updatedAt: Date.now(),
      };

      await act(async () => {
        await playthroughActions.applyPreferredVariant(encounter, true);
      });

      expect(encounter.artworkVariant).toBe('new-variant');
      expect(mockSpriteService.getPreferredVariant).toHaveBeenCalledWith(
        25,
        undefined
      );
    });

    it('should handle errors gracefully and preserve existing variant', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);

      // Mock sprite service to throw an error
      mockSpriteService.getPreferredVariant.mockRejectedValue(
        new Error('Service error')
      );

      const encounter = {
        head: pikachu,
        body: null,
        isFusion: false,
        artworkVariant: 'existing-variant',
        updatedAt: Date.now(),
      };

      await act(async () => {
        await playthroughActions.applyPreferredVariant(encounter, true);
      });

      // Should preserve existing variant on error instead of clearing it
      expect(encounter.artworkVariant).toBe('existing-variant');
    });

    it('should call getPreferredVariant even for encounters without Pokémon', async () => {
      const encounter = {
        head: null,
        body: null,
        isFusion: false,
        artworkVariant: undefined,
        updatedAt: Date.now(),
      };

      await act(async () => {
        await playthroughActions.applyPreferredVariant(encounter, true);
      });

      expect(encounter.artworkVariant).toBeUndefined();
      // Should call getPreferredVariant with undefined values
      expect(mockSpriteService.getPreferredVariant).toHaveBeenCalledWith(
        undefined,
        undefined
      );
    });
  });

  describe('setPreferredVariant', () => {
    it('should set preferred variant in sprite service', async () => {
      await act(async () => {
        await playthroughActions.setPreferredVariant(25, 4, 'test-variant');
      });

      expect(mockSpriteService.setPreferredVariant).toHaveBeenCalledWith(
        25,
        4,
        'test-variant'
      );
    });

    it('should handle errors gracefully when setting preferred variant', async () => {
      // Mock sprite service to throw an error
      mockSpriteService.setPreferredVariant.mockRejectedValue(
        new Error('Service error')
      );

      await act(async () => {
        await playthroughActions.setPreferredVariant(25, 4, 'test-variant');
      });

      // Should not throw, just log warning
      expect(mockSpriteService.setPreferredVariant).toHaveBeenCalledWith(
        25,
        4,
        'test-variant'
      );
    });

    it('should not call sprite service when variant is undefined', async () => {
      await act(async () => {
        await playthroughActions.setPreferredVariant(25, 4, undefined);
      });

      expect(mockSpriteService.setPreferredVariant).not.toHaveBeenCalled();
    });
  });

  describe('getPreferredVariant', () => {
    it('should get preferred variant from sprite service', async () => {
      // Mock sprite service to return a variant
      mockSpriteService.getPreferredVariant.mockResolvedValue('test-variant');

      const result = await playthroughActions.getPreferredVariant(25, 4);

      expect(result).toBe('test-variant');
      expect(mockSpriteService.getPreferredVariant).toHaveBeenCalledWith(25, 4);
    });

    it('should return undefined when sprite service throws error', async () => {
      // Mock sprite service to throw an error
      mockSpriteService.getPreferredVariant.mockRejectedValue(
        new Error('Service error')
      );

      const result = await playthroughActions.getPreferredVariant(25, 4);

      expect(result).toBeUndefined();
      expect(mockSpriteService.getPreferredVariant).toHaveBeenCalledWith(25, 4);
    });
  });

  describe('setArtworkVariant', () => {
    beforeEach(async () => {
      // Set up a test playthrough with an encounter
      const playthroughId = playthroughActions.createPlaythrough('Test Run');
      await playthroughActions.setActivePlaythrough(playthroughId);

      const pikachu = createMockPokemon('Pikachu', 25);
      await playthroughActions.updateEncounter('route-1', pikachu);
    });

    it('should set artwork variant for an encounter', async () => {
      await act(async () => {
        playthroughActions.setArtworkVariant('route-1', 'new-variant');
      });

      const encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];
      expect(encounter?.artworkVariant).toBe('new-variant');
      expect(encounter?.updatedAt).toBeGreaterThan(0);
    });

    it('should update preferred variant cache when setting artwork variant', async () => {
      await act(async () => {
        playthroughActions.setArtworkVariant('route-1', 'new-variant');
      });

      expect(mockSpriteService.setPreferredVariant).toHaveBeenCalledWith(
        25,
        undefined,
        'new-variant'
      );
    });

    it('should handle errors when updating preferred variant cache', async () => {
      // Mock sprite service to throw an error
      mockSpriteService.setPreferredVariant.mockRejectedValue(
        new Error('Service error')
      );

      await act(async () => {
        playthroughActions.setArtworkVariant('route-1', 'new-variant');
      });

      // Should still set the variant on the encounter
      const encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];
      expect(encounter?.artworkVariant).toBe('new-variant');
    });

    it('should clear artwork variant when setting to undefined', async () => {
      // First set a variant
      await act(async () => {
        playthroughActions.setArtworkVariant('route-1', 'test-variant');
      });

      // Then clear it
      await act(async () => {
        playthroughActions.setArtworkVariant('route-1', undefined);
      });

      const encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];
      expect(encounter?.artworkVariant).toBeUndefined();
    });
  });

  describe('cycleArtworkVariant', () => {
    beforeEach(async () => {
      // Set up a test playthrough with an encounter
      const playthroughId = playthroughActions.createPlaythrough('Test Run');
      await playthroughActions.setActivePlaythrough(playthroughId);

      const pikachu = createMockPokemon('Pikachu', 25);
      await playthroughActions.updateEncounter('route-1', pikachu);
    });

    it('should cycle through available variants forward', async () => {
      // Mock sprite service to return multiple variants
      mockSpriteService.getArtworkVariants.mockResolvedValue([
        '',
        'variant-1',
        'variant-2',
      ]);

      await act(async () => {
        await playthroughActions.cycleArtworkVariant('route-1', false);
      });

      const encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];
      expect(encounter?.artworkVariant).toBe('variant-1');
      expect(mockSpriteService.setPreferredVariant).toHaveBeenCalledWith(
        25,
        undefined,
        'variant-1'
      );
    });

    it('should cycle through available variants backward', async () => {
      // Mock sprite service to return multiple variants
      mockSpriteService.getArtworkVariants.mockResolvedValue([
        '',
        'variant-1',
        'variant-2',
      ]);

      await act(async () => {
        await playthroughActions.cycleArtworkVariant('route-1', true);
      });

      const encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];
      expect(encounter?.artworkVariant).toBe('variant-2');
      expect(mockSpriteService.setPreferredVariant).toHaveBeenCalledWith(
        25,
        undefined,
        'variant-2'
      );
    });

    it('should handle single variant gracefully', async () => {
      // Mock sprite service to return only one variant
      mockSpriteService.getArtworkVariants.mockResolvedValue(['']);

      await act(async () => {
        await playthroughActions.cycleArtworkVariant('route-1', false);
      });

      const encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];
      expect(encounter?.artworkVariant).toBeUndefined();
      expect(mockSpriteService.setPreferredVariant).not.toHaveBeenCalled();
    });

    it('should handle no variants gracefully', async () => {
      // Mock sprite service to return no variants
      mockSpriteService.getArtworkVariants.mockResolvedValue([]);

      await act(async () => {
        await playthroughActions.cycleArtworkVariant('route-1', false);
      });

      const encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];
      expect(encounter?.artworkVariant).toBeUndefined();
      expect(mockSpriteService.setPreferredVariant).not.toHaveBeenCalled();
    });

    it('should handle errors and set variant to undefined', async () => {
      // Mock sprite service to throw an error
      mockSpriteService.getArtworkVariants.mockRejectedValue(
        new Error('Service error')
      );

      await act(async () => {
        await playthroughActions.cycleArtworkVariant('route-1', false);
      });

      const encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];
      expect(encounter?.artworkVariant).toBeUndefined();
    });

    it('should prefetch adjacent variants when cycling', async () => {
      // Mock sprite service to return multiple variants
      mockSpriteService.getArtworkVariants.mockResolvedValue([
        '',
        'variant-1',
        'variant-2',
        'variant-3',
      ]);

      // Mock Image constructor to track prefetch calls
      const mockImage = vi.fn().mockImplementation(() => ({
        setAttribute: vi.fn(),
        src: '',
        onload: vi.fn(),
        onerror: vi.fn(),
      }));
      global.Image = mockImage;

      await act(async () => {
        await playthroughActions.cycleArtworkVariant('route-1', false);
      });

      // Should have called Image constructor for prefetching
      // Note: The prefetch happens asynchronously, so we need to wait a bit
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockImage).toHaveBeenCalled();
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
      mockSpriteService.generateSpriteUrl.mockReturnValue('mock-url');

      await act(async () => {
        await playthroughActions.prefetchAdjacentVariants(25, 4, 'variant-1', [
          '',
          'variant-1',
          'variant-2',
        ]);
      });

      // Wait longer for the async prefetch to complete (uses requestAnimationFrame)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have called Image constructor for prefetching adjacent variants
      // For current 'variant-1' at index 1, next is 'variant-2' at index 2, prev is '' at index 0
      // But '' gets filtered out by the filter condition (variant && variant !== currentVariant)
      // So only 'variant-2' should be prefetched
      expect(mockImage).toHaveBeenCalled();
      expect(mockSpriteService.generateSpriteUrl).toHaveBeenCalledWith(
        25,
        4,
        'variant-2'
      );
      // '' is filtered out because it's falsy in the filter condition
      expect(mockSpriteService.generateSpriteUrl).not.toHaveBeenCalledWith(
        25,
        4,
        ''
      );
    });

    it('should not prefetch when only one variant available', async () => {
      const mockImage = vi.fn();
      global.Image = mockImage;

      await act(async () => {
        await playthroughActions.prefetchAdjacentVariants(25, 4, 'variant-1', [
          'variant-1',
        ]);
      });

      expect(mockImage).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully during prefetching', async () => {
      // Mock Image constructor to track prefetch calls
      const mockImage = vi.fn().mockImplementation(() => ({
        setAttribute: vi.fn(),
        src: '',
        onload: vi.fn(),
        onerror: vi.fn(),
      }));
      global.Image = mockImage;

      // Mock generateSpriteUrl to throw error for all variants
      mockSpriteService.generateSpriteUrl.mockImplementation(() => {
        throw new Error('URL generation error');
      });

      await act(async () => {
        await playthroughActions.prefetchAdjacentVariants(25, 4, 'variant-1', [
          'variant-0',
          'variant-1',
          'variant-2',
        ]);
      });

      // Wait longer for the async prefetch to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not have called Image constructor because generateSpriteUrl throws
      // The error is caught and logged, but Image constructor is never called
      expect(mockImage).not.toHaveBeenCalled();
      expect(mockSpriteService.generateSpriteUrl).toHaveBeenCalledWith(
        25,
        4,
        'variant-2'
      );
      expect(mockSpriteService.generateSpriteUrl).toHaveBeenCalledWith(
        25,
        4,
        'variant-0'
      );
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
      // Mock sprite service to return variants
      mockSpriteService.getArtworkVariants.mockResolvedValue(['', 'variant-1']);

      await act(async () => {
        await playthroughActions.preloadArtworkVariants();
      });

      // Should have called getArtworkVariants for both encounters
      expect(mockSpriteService.getArtworkVariants).toHaveBeenCalledWith(25); // Single Pokémon
      expect(mockSpriteService.getArtworkVariants).toHaveBeenCalledWith(25, 4); // Fusion
    });

    it('should handle errors gracefully for individual encounters', async () => {
      // Mock sprite service to throw error for fusion but work for single
      mockSpriteService.getArtworkVariants
        .mockResolvedValueOnce(['', 'variant-1']) // Single Pokémon
        .mockRejectedValueOnce(new Error('Fusion error')); // Fusion

      await act(async () => {
        await playthroughActions.preloadArtworkVariants();
      });

      // Should still have called for both encounters despite one failing
      expect(mockSpriteService.getArtworkVariants).toHaveBeenCalledTimes(2);
    });

    it('should handle playthroughs with no encounters', async () => {
      // Create a new playthrough with no encounters
      const playthroughId = playthroughActions.createPlaythrough('Empty Run');
      await playthroughActions.setActivePlaythrough(playthroughId);

      await act(async () => {
        await playthroughActions.preloadArtworkVariants();
      });

      expect(mockSpriteService.getArtworkVariants).not.toHaveBeenCalled();
    });
  });

  describe('usePreferredVariant hook', () => {
    it('should handle setting preferred variant', async () => {
      const { result } = renderHook(() => usePreferredVariant(25, 4));

      await act(async () => {
        await result.current.setPreferredVariant('new-variant');
      });

      expect(mockSpriteService.setPreferredVariant).toHaveBeenCalledWith(
        25,
        4,
        'new-variant'
      );
    });

    it('should handle errors when setting preferred variant', async () => {
      // Mock sprite service to throw an error
      mockSpriteService.setPreferredVariant.mockRejectedValue(
        new Error('Service error')
      );

      const { result } = renderHook(() => usePreferredVariant(25, 4));

      await act(async () => {
        await result.current.setPreferredVariant('new-variant');
      });

      // Should have called the service despite the error
      expect(mockSpriteService.setPreferredVariant).toHaveBeenCalledWith(
        25,
        4,
        'new-variant'
      );
    });

    it('should handle null IDs gracefully', async () => {
      const { result } = renderHook(() => usePreferredVariant(null, null));

      await act(async () => {
        await result.current.setPreferredVariant('test-variant');
      });

      expect(mockSpriteService.setPreferredVariant).toHaveBeenCalledWith(
        null,
        null,
        'test-variant'
      );
    });
  });

  describe('Integration with encounter updates', () => {
    it('should apply preferred variant when creating new encounters', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);

      // Mock sprite service to return a preferred variant
      mockSpriteService.getPreferredVariant.mockResolvedValue('auto-variant');

      await act(async () => {
        const playthroughId = playthroughActions.createPlaythrough('Test Run');
        await playthroughActions.setActivePlaythrough(playthroughId);
        await playthroughActions.updateEncounter('route-1', pikachu);
      });

      const encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];
      expect(encounter?.artworkVariant).toBe('auto-variant');
    });

    it('should apply preferred variant when creating fusions', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Mock sprite service to return a preferred variant
      mockSpriteService.getPreferredVariant.mockResolvedValue('fusion-variant');

      await act(async () => {
        const playthroughId = playthroughActions.createPlaythrough('Test Run');
        await playthroughActions.setActivePlaythrough(playthroughId);
        await playthroughActions.createFusion('route-1', pikachu, charmander);
      });

      const encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];
      expect(encounter?.artworkVariant).toBe('fusion-variant');
    });

    it('should reapply preferred variant when encounter composition changes', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Mock different variants for different compositions
      mockSpriteService.getPreferredVariant.mockImplementation(
        (headId, bodyId) => {
          if (headId === 25 && !bodyId) return Promise.resolve('pikachu-solo');
          if (headId === 25 && bodyId === 4)
            return Promise.resolve('pikachu-charmander-fusion');
          return Promise.resolve('default-variant');
        }
      );

      await act(async () => {
        const playthroughId = playthroughActions.createPlaythrough('Test Run');
        await playthroughActions.setActivePlaythrough(playthroughId);

        // Add single Pokémon first
        await playthroughActions.updateEncounter('route-1', pikachu);
      });

      let encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];
      expect(encounter?.artworkVariant).toBe('pikachu-solo');

      await act(async () => {
        // Convert to fusion by adding body Pokémon
        await playthroughActions.updateEncounter(
          'route-1',
          charmander,
          'body',
          true
        );
      });

      encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];
      expect(encounter?.artworkVariant).toBe('pikachu-charmander-fusion');
    });

    // Tests for the specific bugs we fixed
    describe('Bug Fixes', () => {
      it('should preserve isFusion flag when dragging into existing fusion encounter', async () => {
        const pikachu = createMockPokemon('Pikachu', 25);

        await act(async () => {
          const playthroughId =
            playthroughActions.createPlaythrough('Test Run');
          await playthroughActions.setActivePlaythrough(playthroughId);

          // Create empty fusion encounter
          await playthroughActions.toggleEncounterFusion('route-1');
        });

        let encounters = playthroughActions.getEncounters();
        expect(encounters).toBeDefined();
        expect(encounters!['route-1']!.isFusion).toBe(true);
        expect(encounters!['route-1']!.head).toBeNull();

        await act(async () => {
          // Drag pokemon into head slot of existing fusion encounter
          await playthroughActions.moveEncounterAtomic(
            'route-2',
            'head',
            'route-1',
            'head',
            pikachu
          );
        });

        encounters = playthroughActions.getEncounters();
        expect(encounters).toBeDefined();
        // Should preserve fusion state
        expect(encounters!['route-1']!.isFusion).toBe(true);
        expect(encounters!['route-1']!.head?.id).toBe(25);
      });

      it('should preserve artwork variant when moving pokemon within same encounter', async () => {
        const pikachu = createMockPokemon('Pikachu', 25);

        await act(async () => {
          const playthroughId =
            playthroughActions.createPlaythrough('Test Run');
          await playthroughActions.setActivePlaythrough(playthroughId);

          // Create fusion encounter with pokemon in body slot
          await playthroughActions.updateEncounter(
            'route-1',
            pikachu,
            'body',
            true
          );
          // Set specific artwork variant
          playthroughActions.setArtworkVariant('route-1', 'preserved-variant');
        });

        await act(async () => {
          // Move pokemon from body to head within same encounter
          await playthroughActions.moveEncounterAtomic(
            'route-1',
            'body',
            'route-1',
            'head',
            pikachu
          );
        });

        const encounters = playthroughActions.getEncounters();
        expect(encounters).toBeDefined();
        // Should preserve the variant since it's the same pokemon in same encounter
        expect(encounters!['route-1']!.artworkVariant).toBe(
          'preserved-variant'
        );
        expect(encounters!['route-1']!.head?.id).toBe(25);
        expect(encounters!['route-1']!.body).toBeNull();
      });

      it('should use atomic flip operation to prevent duplicate variant lookups', async () => {
        const pikachu = createMockPokemon('Pikachu', 25);
        const charmander = createMockPokemon('Charmander', 4);

        await act(async () => {
          const playthroughId =
            playthroughActions.createPlaythrough('Test Run');
          await playthroughActions.setActivePlaythrough(playthroughId);

          // Create fusion with both head and body
          await playthroughActions.updateEncounter(
            'route-1',
            pikachu,
            'head',
            true
          );
          await playthroughActions.updateEncounter(
            'route-1',
            charmander,
            'body',
            true
          );
        });

        // Track variant calls to ensure atomicity
        const getVariantCalls: Array<
          Parameters<typeof mockSpriteService.getPreferredVariant>
        > = [];
        mockSpriteService.getPreferredVariant.mockImplementation((...args) => {
          getVariantCalls.push(args);
          return Promise.resolve('flipped-variant');
        });

        await act(async () => {
          // Use atomic flip operation
          await playthroughActions.flipEncounterFusion('route-1');
        });

        const encounters = playthroughActions.getEncounters();

        // Should have flipped positions
        expect(encounters).toBeDefined();
        expect(encounters!['route-1']!.head?.id).toBe(4); // Charmander now in head
        expect(encounters!['route-1']!.body?.id).toBe(25); // Pikachu now in body

        // Should only have one call to getPreferredVariant for the new composition
        expect(getVariantCalls).toHaveLength(1);
        expect(getVariantCalls[0]).toEqual([4, 25]); // Charmander head, Pikachu body
      });

      it('should handle body-only fusion encounters correctly', async () => {
        const pikachu = createMockPokemon('Pikachu', 25);

        await act(async () => {
          const playthroughId =
            playthroughActions.createPlaythrough('Test Run');
          await playthroughActions.setActivePlaythrough(playthroughId);

          // Create fusion with only body pokemon (empty head)
          await playthroughActions.updateEncounter(
            'route-1',
            pikachu,
            'body',
            true
          );
        });

        const encounters = playthroughActions.getEncounters();

        expect(encounters).toBeDefined();
        expect(encounters!['route-1']!.head).toBeNull();
        expect(encounters!['route-1']!.body?.id).toBe(25);
        expect(encounters!['route-1']!.isFusion).toBe(true);

        // Should call getPreferredVariant with null head and pikachu body
        expect(mockSpriteService.getPreferredVariant).toHaveBeenCalledWith(
          null,
          25
        );
      });
    });
  });
});
