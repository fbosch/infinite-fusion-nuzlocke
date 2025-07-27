import { describe, it, expect, vi } from 'vitest';
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
import { PlaythroughSchema } from '../../src/stores/playthroughs';
import { PokemonOptionSchema } from '../../src/loaders/pokemon';

type PokemonOption = z.infer<typeof PokemonOptionSchema>;

const createMockPokemon = (name: string, id: number): PokemonOption => ({
  id,
  name,
  nationalDexId: id,
  originalLocation: undefined,
});

describe('Playthrough Migration Tests', () => {
  describe('remixMode to gameMode migration', () => {
    it('should migrate remixMode: true to gameMode: remix', () => {
      const legacyData = {
        id: 'test-migration-1',
        name: 'Legacy Remix Run',
        remixMode: true,
        gameMode: 'classic', // Default value
        encounters: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = PlaythroughSchema.parse(legacyData);

      expect(result.gameMode).toBe('remix');
      expect(result.name).toBe('Legacy Remix Run');
      expect(result.id).toBe('test-migration-1');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result as any).remixMode).toBeUndefined();
    });

    it('should migrate remixMode: false to gameMode: classic', () => {
      const legacyData = {
        id: 'test-migration-2',
        name: 'Legacy Classic Run',
        remixMode: false,
        gameMode: 'classic', // Default value
        encounters: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = PlaythroughSchema.parse(legacyData);

      expect(result.gameMode).toBe('classic');
      expect(result.name).toBe('Legacy Classic Run');
      expect(result.id).toBe('test-migration-2');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result as any).remixMode).toBeUndefined();
    });

    it('should not migrate when gameMode is explicitly set to non-default', () => {
      const modernData = {
        id: 'test-migration-3',
        name: 'Modern Randomized Run',
        remixMode: true, // Should be ignored
        gameMode: 'randomized' as const,
        encounters: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = PlaythroughSchema.parse(modernData);

      // Should preserve explicit gameMode and remove remixMode
      expect(result.gameMode).toBe('randomized');
      expect('remixMode' in result).toBe(false);
    });

    it('should preserve all other fields during migration', () => {
      const legacyDataWithEncounters = {
        id: 'test-migration-6',
        name: 'Legacy Run with Data',
        remixMode: true,
        gameMode: 'classic',
        encounters: {
          'route-1': {
            head: createMockPokemon('Pikachu', 25),
            body: null,
            isFusion: false,
            updatedAt: Date.now(),
          },
        },
        customLocations: [
          {
            id: 'custom-1',
            name: 'Custom Route',
            region: 'Kanto',
            description: 'Test location',
            order: 999,
            routeId: null,
          },
        ],
        createdAt: 1234567890,
        updatedAt: 1234567891,
      };

      const result = PlaythroughSchema.parse(legacyDataWithEncounters);

      expect(result.gameMode).toBe('remix');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result as any).remixMode).toBeUndefined();
      expect(result.encounters).toBeDefined();
      expect(result.encounters!['route-1']).toBeDefined();
      expect(result.encounters!['route-1'].head?.name).toBe('Pikachu');
      expect(result.customLocations).toBeDefined();
      expect(result.customLocations![0].name).toBe('Custom Route');
      expect(result.createdAt).toBe(1234567890);
      expect(result.updatedAt).toBe(1234567891);
    });
  });

  describe('Schema validation edge cases', () => {
    it('should handle data without remixMode field (modern format)', () => {
      const modernData = {
        id: 'test-missing',
        name: 'Test Run',
        gameMode: 'randomized' as const,
        encounters: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = PlaythroughSchema.parse(modernData);

      expect(result.gameMode).toBe('randomized');
      expect('remixMode' in result).toBe(false);
    });

    it('should validate gameMode enum values correctly', () => {
      const validData = {
        id: 'test-enum',
        name: 'Test Run',
        gameMode: 'classic' as const,
        encounters: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = PlaythroughSchema.parse(validData);
      expect(result.gameMode).toBe('classic');
    });

    it('should handle corrupted migration data gracefully', () => {
      const corruptedData = {
        id: 'test-corrupted',
        name: 'Test Run',
        remixMode: 'invalid', // Invalid type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        gameMode: 'invalid' as any, // Invalid enum value
        encounters: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(() => PlaythroughSchema.parse(corruptedData)).toThrow();
    });

    it('should successfully create new playthroughs with current schema', () => {
      const newPlaythrough = {
        id: 'test-new',
        name: 'New Test Run',
        gameMode: 'remix' as const,
        encounters: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = PlaythroughSchema.parse(newPlaythrough);
      expect(result.gameMode).toBe('remix');
      expect(result.name).toBe('New Test Run');
      expect('remixMode' in result).toBe(false);
    });
  });
});
