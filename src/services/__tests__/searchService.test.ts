import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import searchService from '../searchService';
import type { Pokemon } from '@/loaders/pokemon';

// Mock the dependencies
vi.mock('@/lib/searchCore', () => ({
  SearchCore: vi.fn().mockImplementation(
    () =>
      ({
        isReady: vi.fn().mockReturnValue(true),
        initialize: vi.fn().mockResolvedValue(undefined),
        search: vi.fn().mockResolvedValue([]),
      }) as any
  ),
}));

vi.mock('@/lib/data', () => ({
  pokemonData: {
    getAllPokemon: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('comlink', () => ({
  wrap: vi.fn(),
}));

// Mock Worker
global.Worker = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
}));

// Mock data
const mockPokemon: Pokemon[] = [
  {
    id: 1,
    name: 'Bulbasaur',
    nationalDexId: 1,
    types: [{ name: 'grass' }, { name: 'poison' }],
    species: {
      is_legendary: false,
      is_mythical: false,
      generation: '1',
      evolution_chain: {
        url: 'https://pokeapi.co/api/v2/evolution-chain/1/',
      },
    },
  },
  {
    id: 2,
    name: 'Ivysaur',
    nationalDexId: 2,
    types: [{ name: 'grass' }, { name: 'poison' }],
    species: {
      is_legendary: false,
      is_mythical: false,
      generation: '1',
      evolution_chain: {
        url: 'https://pokeapi.co/api/v2/evolution-chain/1/',
      },
    },
  },
  {
    id: 3,
    name: 'Venusaur',
    nationalDexId: 3,
    types: [{ name: 'grass' }, { name: 'poison' }],
    species: {
      is_legendary: false,
      is_mythical: false,
      generation: '1',
      evolution_chain: {
        url: 'https://pokeapi.co/api/v2/evolution-chain/1/',
      },
    },
  },
];

describe('SearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('search functionality', () => {
    it('should perform search successfully', async () => {
      const { SearchCore } = await import('@/lib/searchCore');
      const mockInstance = {
        isReady: vi.fn().mockReturnValue(true),
        initialize: vi.fn().mockResolvedValue(undefined),
        search: vi.fn().mockResolvedValue([mockPokemon[0]]),
      } as any;

      vi.mocked(SearchCore).mockImplementation(() => mockInstance);

      const results = await searchService.search('bulba');

      expect(results).toEqual([mockPokemon[0]]);
      expect(mockInstance.search).toHaveBeenCalledWith('bulba');
    });

    it('should return empty array on search failure', async () => {
      const { SearchCore } = await import('@/lib/searchCore');
      const mockInstance = {
        isReady: vi.fn().mockReturnValue(true),
        initialize: vi.fn().mockResolvedValue(undefined),
        search: vi.fn().mockImplementation(() => {
          throw new Error('Search failed');
        }),
      } as any;

      vi.mocked(SearchCore).mockImplementation(() => mockInstance);

      const results = await searchService.search('bulba');

      expect(results).toEqual([]);
    });

    it('should handle empty query', async () => {
      const { SearchCore } = await import('@/lib/searchCore');
      const mockInstance = {
        isReady: vi.fn().mockReturnValue(true),
        initialize: vi.fn().mockResolvedValue(undefined),
        search: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(SearchCore).mockImplementation(() => mockInstance);

      const results = await searchService.search('');

      expect(results).toEqual([]);
      expect(mockInstance.search).toHaveBeenCalledWith('');
    });

    it('should handle special characters in query', async () => {
      const { SearchCore } = await import('@/lib/searchCore');
      const mockInstance = {
        isReady: vi.fn().mockReturnValue(true),
        initialize: vi.fn().mockResolvedValue(undefined),
        search: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(SearchCore).mockImplementation(() => mockInstance);

      const results = await searchService.search('bulba & ivy');

      expect(results).toEqual([]);
      expect(mockInstance.search).toHaveBeenCalledWith('bulba & ivy');
    });
  });

  describe('error handling', () => {
    it('should handle search method errors gracefully', async () => {
      const { SearchCore } = await import('@/lib/searchCore');
      const mockInstance = {
        isReady: vi.fn().mockReturnValue(true),
        initialize: vi.fn().mockResolvedValue(undefined),
        search: vi.fn().mockImplementation(() => {
          throw new Error('Method error');
        }),
      };

      vi.mocked(SearchCore).mockImplementation(() => mockInstance);

      const results = await searchService.search('bulba');

      expect(results).toEqual([]);
    });

    it('should handle async search errors gracefully', async () => {
      const { SearchCore } = await import('@/lib/searchCore');
      const mockInstance = {
        isReady: vi.fn().mockReturnValue(true),
        initialize: vi.fn().mockResolvedValue(undefined),
        search: vi.fn().mockImplementation(() => {
          throw new Error('Async error');
        }),
      } as any;

      vi.mocked(SearchCore).mockImplementation(() => mockInstance);

      const results = await searchService.search('bulba');

      expect(results).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined query gracefully', async () => {
      const { SearchCore } = await import('@/lib/searchCore');
      const mockInstance = {
        isReady: vi.fn().mockReturnValue(true),
        initialize: vi.fn().mockResolvedValue(undefined),
        search: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(SearchCore).mockImplementation(() => mockInstance);

      // @ts-expect-error - Testing edge case
      const results = await searchService.search(null);
      expect(results).toEqual([]);

      // @ts-expect-error - Testing edge case
      const results2 = await searchService.search(undefined);
      expect(results2).toEqual([]);
    });

    it('should handle very long queries', async () => {
      const { SearchCore } = await import('@/lib/searchCore');
      const mockInstance = {
        isReady: vi.fn().mockReturnValue(true),
        initialize: vi.fn().mockResolvedValue(undefined),
        search: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(SearchCore).mockImplementation(() => mockInstance);

      const longQuery = 'a'.repeat(1000);
      const results = await searchService.search(longQuery);

      expect(results).toEqual([]);
      expect(mockInstance.search).toHaveBeenCalledWith(longQuery);
    });

    it('should handle unicode characters in query', async () => {
      const { SearchCore } = await import('@/lib/searchCore');
      const mockInstance = {
        isReady: vi.fn().mockReturnValue(true),
        initialize: vi.fn().mockResolvedValue(undefined),
        search: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(SearchCore).mockImplementation(() => mockInstance);

      const unicodeQuery = 'Pokémon 🎮 ポケモン';
      const results = await searchService.search(unicodeQuery);

      expect(results).toEqual([]);
      expect(mockInstance.search).toHaveBeenCalledWith(unicodeQuery);
    });
  });

  describe('singleton pattern', () => {
    it('should maintain singleton instance', () => {
      const instance1 = searchService;
      const instance2 = searchService;

      expect(instance1).toBe(instance2);
    });
  });
});
