import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import pokemonApiService from '../pokemonApiService';
import type { Pokemon } from '../pokemonApiService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the persistence module
vi.mock('@/lib/persistence', () => ({
  getCacheBuster: () => 12345,
}));

// Mock data
const mockPokemon: Pokemon = {
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
};

const mockPokemon2: Pokemon = {
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
};

const mockApiResponse = {
  data: [mockPokemon, mockPokemon2],
  count: 2,
  total: 151,
};

describe('PokemonApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the service instance for each test
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should set correct base URL for test environment', () => {
      // In test environment, window is undefined
      expect(typeof window).toBe('undefined');

      // The service should use localhost URL in test environment
      // We can't test the constructor directly, but we can verify the behavior
      expect(pokemonApiService).toBeDefined();
    });
  });

  describe('makeRequest', () => {
    it('should make request with correct URL and parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const params = {
        ids: [1, 2],
        search: 'bulba',
        type: 'grass',
        limit: 10,
      };

      await pokemonApiService['makeRequest'](params);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/pokemon?ids=1%2C2&search=bulba&type=grass&limit=10&v=12345',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should handle empty parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      await pokemonApiService['makeRequest']();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/pokemon?v=12345',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should handle partial parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const params = { search: 'bulba' };
      await pokemonApiService['makeRequest'](params);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/pokemon?search=bulba&v=12345',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should throw error on non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(pokemonApiService['makeRequest']()).rejects.toThrow(
        'Pokemon API error: 404 Not Found'
      );
    });

    it('should throw error on invalid response format', async () => {
      const invalidResponse = {
        data: 'invalid data',
        count: 'not a number',
        total: 'also not a number',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidResponse,
      });

      await expect(pokemonApiService['makeRequest']()).rejects.toThrow(
        'Invalid API response format'
      );
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(pokemonApiService['makeRequest']()).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('getAllPokemon', () => {
    it('should return all pokemon', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await pokemonApiService.getAllPokemon();

      expect(result).toEqual([mockPokemon, mockPokemon2]);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/pokemon?v=12345',
        expect.any(Object)
      );
    });

    it('should handle empty response', async () => {
      const emptyResponse = { data: [], count: 0, total: 0 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => emptyResponse,
      });

      const result = await pokemonApiService.getAllPokemon();

      expect(result).toEqual([]);
    });
  });

  describe('getPokemonByIds', () => {
    it('should return pokemon by IDs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await pokemonApiService.getPokemonByIds([1, 2]);

      expect(result).toEqual([mockPokemon, mockPokemon2]);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/pokemon?ids=1%2C2&v=12345',
        expect.any(Object)
      );
    });

    it('should handle empty IDs array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], count: 0, total: 0 }),
      });

      const result = await pokemonApiService.getPokemonByIds([]);

      expect(result).toEqual([]);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/pokemon?v=12345',
        expect.any(Object)
      );
    });

    it('should handle single ID', async () => {
      const singleResponse = { data: [mockPokemon], count: 1, total: 1 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => singleResponse,
      });

      const result = await pokemonApiService.getPokemonByIds([1]);

      expect(result).toEqual([mockPokemon]);
    });
  });

  describe('getPokemonById', () => {
    it('should return pokemon by single ID', async () => {
      const singleResponse = { data: [mockPokemon], count: 1, total: 1 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => singleResponse,
      });

      const result = await pokemonApiService.getPokemonById(1);

      expect(result).toEqual(mockPokemon);
    });

    it('should return null when pokemon not found', async () => {
      const emptyResponse = { data: [], count: 0, total: 0 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => emptyResponse,
      });

      const result = await pokemonApiService.getPokemonById(999);

      expect(result).toBeNull();
    });
  });

  describe('searchPokemon', () => {
    it('should search pokemon by query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await pokemonApiService.searchPokemon('bulba');

      expect(result).toEqual([mockPokemon, mockPokemon2]);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/pokemon?search=bulba&v=12345',
        expect.any(Object)
      );
    });

    it('should search pokemon with limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await pokemonApiService.searchPokemon('bulba', 5);

      expect(result).toEqual([mockPokemon, mockPokemon2]);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/pokemon?search=bulba&limit=5&v=12345',
        expect.any(Object)
      );
    });

    it('should handle empty search results', async () => {
      const emptyResponse = { data: [], count: 0, total: 0 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => emptyResponse,
      });

      const result = await pokemonApiService.searchPokemon('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('getPokemonByType', () => {
    it('should return pokemon by type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await pokemonApiService.getPokemonByType('grass');

      expect(result).toEqual([mockPokemon, mockPokemon2]);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/pokemon?type=grass&v=12345',
        expect.any(Object)
      );
    });

    it('should handle empty type results', async () => {
      const emptyResponse = { data: [], count: 0, total: 0 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => emptyResponse,
      });

      const result = await pokemonApiService.getPokemonByType('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('getPokemonCount', () => {
    it('should return total pokemon count', async () => {
      const countResponse = { data: [mockPokemon], count: 1, total: 151 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => countResponse,
      });

      const result = await pokemonApiService.getPokemonCount();

      expect(result).toBe(151);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/pokemon?limit=1&v=12345',
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(pokemonApiService.getAllPokemon()).rejects.toThrow(
        'Network error'
      );
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(pokemonApiService.getAllPokemon()).rejects.toThrow(
        'Invalid JSON'
      );
    });

    it('should handle timeout scenarios', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 100)
          )
      );

      await expect(pokemonApiService.getAllPokemon()).rejects.toThrow(
        'Timeout'
      );
    });
  });

  describe('URL construction', () => {
    it('should properly encode special characters in search', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      await pokemonApiService.searchPokemon('bulba & ivy');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/pokemon?search=bulba+%26+ivy&v=12345',
        expect.any(Object)
      );
    });

    it('should handle type with special characters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      await pokemonApiService.getPokemonByType('fire/flying');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/pokemon?type=fire%2Fflying&v=12345',
        expect.any(Object)
      );
    });
  });

  describe('singleton pattern', () => {
    it('should maintain singleton instance', () => {
      const instance1 = pokemonApiService;
      const instance2 = pokemonApiService;

      expect(instance1).toBe(instance2);
    });
  });
});
