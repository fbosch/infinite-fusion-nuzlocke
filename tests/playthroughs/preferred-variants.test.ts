// Import mocks first (must be at top level for Vitest hoisting)
import './mocks';

// Import shared setup and utilities
import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  renderHook,
  act,
  playthroughActions,
  usePreferredVariant,
  createMockPokemon,
  setupPlaythroughTest,
} from './setup';

describe('Playthroughs Store - Preferred Variants', () => {
  beforeEach(() => {
    setupPlaythroughTest();
  });

  describe('applyPreferredVariant', () => {
    it('should apply preferred variant for single Pokémon encounters', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);

      // Mock sprite service to return a preferred variant
      vi.mocked(
        (await import('../../src/services/spriteService')).default
      ).getPreferredVariant.mockResolvedValue('variant-1');

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
      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .getPreferredVariant
      ).toHaveBeenCalledWith(25, undefined);
    });

    it('should apply preferred variant for fusion encounters', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      // Mock sprite service to return a preferred variant
      vi.mocked(
        (await import('../../src/services/spriteService')).default
      ).getPreferredVariant.mockResolvedValue('fusion-variant');

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
      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .getPreferredVariant
      ).toHaveBeenCalledWith(25, 4);
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
      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .getPreferredVariant
      ).not.toHaveBeenCalled();
    });

    it('should apply variant if forced even when already set', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);

      // Mock sprite service to return a new preferred variant
      vi.mocked(
        (await import('../../src/services/spriteService')).default
      ).getPreferredVariant.mockResolvedValue('new-variant');

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
      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .getPreferredVariant
      ).toHaveBeenCalledWith(25, undefined);
    });

    it('should handle errors gracefully and preserve existing variant', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);

      // Mock sprite service to throw an error
      vi.mocked(
        (await import('../../src/services/spriteService')).default
      ).getPreferredVariant.mockRejectedValue(new Error('Service error'));

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
      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .getPreferredVariant
      ).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('setPreferredVariant', () => {
    it('should set preferred variant in sprite service', async () => {
      await act(async () => {
        await playthroughActions.setPreferredVariant(25, 4, 'test-variant');
      });

      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .setPreferredVariant
      ).toHaveBeenCalledWith(25, 4, 'test-variant');
    });

    it('should handle errors gracefully when setting preferred variant', async () => {
      // Mock sprite service to throw an error
      vi.mocked(
        (await import('../../src/services/spriteService')).default
      ).setPreferredVariant.mockRejectedValue(new Error('Service error'));

      await act(async () => {
        await playthroughActions.setPreferredVariant(25, 4, 'test-variant');
      });

      // Should not throw, just log warning
      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .setPreferredVariant
      ).toHaveBeenCalledWith(25, 4, 'test-variant');
    });

    it('should not call sprite service when variant is undefined', async () => {
      await act(async () => {
        await playthroughActions.setPreferredVariant(25, 4, undefined);
      });

      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .setPreferredVariant
      ).not.toHaveBeenCalled();
    });
  });

  describe('getPreferredVariant', () => {
    it('should get preferred variant from sprite service', async () => {
      // Mock sprite service to return a variant
      vi.mocked(
        (await import('../../src/services/spriteService')).default
      ).getPreferredVariant.mockResolvedValue('test-variant');

      const result = await playthroughActions.getPreferredVariant(25, 4);

      expect(result).toBe('test-variant');
      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .getPreferredVariant
      ).toHaveBeenCalledWith(25, 4);
    });

    it('should return undefined when sprite service throws error', async () => {
      // Mock sprite service to throw an error
      vi.mocked(
        (await import('../../src/services/spriteService')).default
      ).getPreferredVariant.mockRejectedValue(new Error('Service error'));

      const result = await playthroughActions.getPreferredVariant(25, 4);

      expect(result).toBeUndefined();
      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .getPreferredVariant
      ).toHaveBeenCalledWith(25, 4);
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

      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .setPreferredVariant
      ).toHaveBeenCalledWith(25, undefined, 'new-variant');
    });

    it('should handle errors when updating preferred variant cache', async () => {
      // Mock sprite service to throw an error
      vi.mocked(
        (await import('../../src/services/spriteService')).default
      ).setPreferredVariant.mockRejectedValue(new Error('Service error'));

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
      vi.mocked(
        (await import('../../src/services/spriteService')).default
      ).getArtworkVariants.mockResolvedValue(['', 'variant-1', 'variant-2']);

      await act(async () => {
        await playthroughActions.cycleArtworkVariant('route-1', false);
      });

      const encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];
      expect(encounter?.artworkVariant).toBe('variant-1');
      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .setPreferredVariant
      ).toHaveBeenCalledWith(25, undefined, 'variant-1');
    });

    it('should cycle through available variants backward', async () => {
      // Mock sprite service to return multiple variants
      vi.mocked(
        (await import('../../src/services/spriteService')).default
      ).getArtworkVariants.mockResolvedValue(['', 'variant-1', 'variant-2']);

      await act(async () => {
        await playthroughActions.cycleArtworkVariant('route-1', true);
      });

      const encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];
      expect(encounter?.artworkVariant).toBe('variant-2');
      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .setPreferredVariant
      ).toHaveBeenCalledWith(25, undefined, 'variant-2');
    });

    it('should handle single variant gracefully', async () => {
      // Mock sprite service to return only one variant
      vi.mocked(
        (await import('../../src/services/spriteService')).default
      ).getArtworkVariants.mockResolvedValue(['']);

      await act(async () => {
        await playthroughActions.cycleArtworkVariant('route-1', false);
      });

      const encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];
      expect(encounter?.artworkVariant).toBeUndefined();
      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .setPreferredVariant
      ).not.toHaveBeenCalled();
    });

    it('should handle no variants gracefully', async () => {
      // Mock sprite service to return no variants
      vi.mocked(
        (await import('../../src/services/spriteService')).default
      ).getArtworkVariants.mockResolvedValue([]);

      await act(async () => {
        await playthroughActions.cycleArtworkVariant('route-1', false);
      });

      const encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];
      expect(encounter?.artworkVariant).toBeUndefined();
      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .setPreferredVariant
      ).not.toHaveBeenCalled();
    });

    it('should handle errors and set variant to undefined', async () => {
      // Mock sprite service to throw an error
      vi.mocked(
        (await import('../../src/services/spriteService')).default
      ).getArtworkVariants.mockRejectedValue(new Error('Service error'));

      await act(async () => {
        await playthroughActions.cycleArtworkVariant('route-1', false);
      });

      const encounter =
        playthroughActions.getActivePlaythrough()?.encounters?.['route-1'];
      expect(encounter?.artworkVariant).toBeUndefined();
    });

    it('should prefetch adjacent variants when cycling', async () => {
      // Mock sprite service to return multiple variants
      vi.mocked(
        (await import('../../src/services/spriteService')).default
      ).getArtworkVariants.mockResolvedValue([
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
      vi.mocked(
        (await import('../../src/services/spriteService')).default
      ).generateSpriteUrl.mockReturnValue('mock-url');

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
      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .generateSpriteUrl
      ).toHaveBeenCalledWith(25, 4, 'variant-2');
      // '' is filtered out because it's falsy in the filter condition
      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .generateSpriteUrl
      ).not.toHaveBeenCalledWith(25, 4, '');
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
      vi.mocked(
        (await import('../../src/services/spriteService')).default
      ).generateSpriteUrl.mockImplementation(() => {
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
      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .generateSpriteUrl
      ).toHaveBeenCalledWith(25, 4, 'variant-2');
      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .generateSpriteUrl
      ).toHaveBeenCalledWith(25, 4, 'variant-0');
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
      vi.mocked(
        (await import('../../src/services/spriteService')).default
      ).getArtworkVariants.mockResolvedValue(['', 'variant-1']);

      await act(async () => {
        await playthroughActions.preloadArtworkVariants();
      });

      // Should have called getArtworkVariants for both encounters
      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .getArtworkVariants
      ).toHaveBeenCalledWith(25); // Single Pokémon
      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .getArtworkVariants
      ).toHaveBeenCalledWith(25, 4); // Fusion
    });

    it('should handle errors gracefully for individual encounters', async () => {
      // Mock sprite service to throw error for fusion but work for single
      vi.mocked((await import('../../src/services/spriteService')).default)
        .getArtworkVariants.mockResolvedValueOnce(['', 'variant-1']) // Single Pokémon
        .mockRejectedValueOnce(new Error('Fusion error')); // Fusion

      await act(async () => {
        await playthroughActions.preloadArtworkVariants();
      });

      // Should still have called for both encounters despite one failing
      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .getArtworkVariants
      ).toHaveBeenCalledTimes(2);
    });

    it('should handle playthroughs with no encounters', async () => {
      // Create a new playthrough with no encounters
      const playthroughId = playthroughActions.createPlaythrough('Empty Run');
      await playthroughActions.setActivePlaythrough(playthroughId);

      await act(async () => {
        await playthroughActions.preloadArtworkVariants();
      });

      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .getArtworkVariants
      ).not.toHaveBeenCalled();
    });
  });

  describe('usePreferredVariant hook', () => {
    it('should handle setting preferred variant', async () => {
      const { result } = renderHook(() => usePreferredVariant(25, 4));

      await act(async () => {
        await result.current.setPreferredVariant('new-variant');
      });

      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .setPreferredVariant
      ).toHaveBeenCalledWith(25, 4, 'new-variant');
    });

    it('should handle errors when setting preferred variant', async () => {
      // Mock sprite service to throw an error
      vi.mocked(
        (await import('../../src/services/spriteService')).default
      ).setPreferredVariant.mockRejectedValue(new Error('Service error'));

      const { result } = renderHook(() => usePreferredVariant(25, 4));

      await act(async () => {
        await result.current.setPreferredVariant('new-variant');
      });

      // Should have called the service despite the error
      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .setPreferredVariant
      ).toHaveBeenCalledWith(25, 4, 'new-variant');
    });

    it('should handle null IDs gracefully', async () => {
      const { result } = renderHook(() => usePreferredVariant(null, null));

      await act(async () => {
        await result.current.setPreferredVariant('test-variant');
      });

      expect(
        vi.mocked((await import('../../src/services/spriteService')).default)
          .setPreferredVariant
      ).toHaveBeenCalledWith(null, null, 'test-variant');
    });
  });

  describe('Integration with encounter updates', () => {
    it('should apply preferred variant when creating new encounters', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);

      // Mock sprite service to return a preferred variant
      vi.mocked(
        (await import('../../src/services/spriteService')).default
      ).getPreferredVariant.mockResolvedValue('auto-variant');

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
      vi.mocked(
        (await import('../../src/services/spriteService')).default
      ).getPreferredVariant.mockResolvedValue('fusion-variant');

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
      vi.mocked(
        (await import('../../src/services/spriteService')).default
      ).getPreferredVariant.mockImplementation((headId, bodyId) => {
        if (headId === 25 && !bodyId) return Promise.resolve('pikachu-solo');
        if (headId === 25 && bodyId === 4)
          return Promise.resolve('pikachu-charmander-fusion');
        return Promise.resolve('default-variant');
      });

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
          [number | null | undefined, number | null | undefined]
        > = [];
        const mockSpriteService = vi.mocked(
          (await import('../../src/services/spriteService')).default
        );
        mockSpriteService.getPreferredVariant.mockImplementation(
          (headId, bodyId) => {
            getVariantCalls.push([headId, bodyId]);
            return Promise.resolve('flipped-variant');
          }
        );

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
        expect(
          vi.mocked((await import('../../src/services/spriteService')).default)
            .getPreferredVariant
        ).toHaveBeenCalledWith(null, 25);
      });
    });
  });
});
