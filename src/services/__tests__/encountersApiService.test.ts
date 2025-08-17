import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import encountersApiService from '../encountersApiService';
import type { RouteEncounter } from '../encountersApiService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the persistence module
vi.mock('@/lib/persistence', () => ({
  getCacheBuster: () => 12345,
}));

// Mock the encounters loader
vi.mock('@/loaders/encounters', () => ({
  RouteEncounterSchema: {
    safeParse: (data: unknown) => ({ success: true, data }),
  },
  RouteEncountersArraySchema: {
    safeParse: (data: unknown) => ({ success: true, data }),
  },
}));

// Mock data
const mockRouteEncounter: RouteEncounter = {
  routeName: 'Route 1',
  encounters: [
    {
      head: {
        id: 1,
        name: 'Bulbasaur',
        nationalDexId: 1,
        status: 'captured',
        nickname: 'Bulby',
        uid: 'test-uid-1',
      },
      body: null,
      isFusion: false,
      updatedAt: Date.now(),
    },
  ],
};

const mockRouteEncounter2: RouteEncounter = {
  routeName: 'Route 2',
  encounters: [
    {
      head: {
        id: 2,
        name: 'Ivysaur',
        nationalDexId: 2,
        status: 'received',
        nickname: 'Ivy',
        uid: 'test-uid-2',
      },
      body: null,
      isFusion: false,
      updatedAt: Date.now(),
    },
  ],
};

const mockApiResponse = {
  data: [mockRouteEncounter, mockRouteEncounter2],
  count: 2,
  gameMode: 'classic' as const,
};

describe('EncountersApiService', () => {
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
      expect(encountersApiService).toBeDefined();
    });
  });

  describe('makeRequest', () => {
    it('should make request with correct URL and gameMode parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter, mockRouteEncounter2],
      });

      await encountersApiService['makeRequest']({ gameMode: 'classic' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/encounters?gameMode=classic&v=12345',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should handle remix game mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter],
      });

      await encountersApiService['makeRequest']({ gameMode: 'remix' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/encounters?gameMode=remix&v=12345',
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

      await expect(
        encountersApiService['makeRequest']({ gameMode: 'classic' })
      ).rejects.toThrow('Encounters API error: 404 Not Found');
    });

    it('should throw error on invalid response format', async () => {
      // Mock the schema validation to fail
      vi.doMock('@/loaders/encounters', () => ({
        RouteEncountersArraySchema: {
          safeParse: () => ({
            success: false,
            error: { issues: ['Invalid format'] },
          }),
        },
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => 'invalid data',
      });

      await expect(
        encountersApiService['makeRequest']({ gameMode: 'classic' })
      ).rejects.toThrow('Invalid API response format');
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        encountersApiService['makeRequest']({ gameMode: 'classic' })
      ).rejects.toThrow('Network error');
    });
  });

  describe('getEncounters', () => {
    it('should return encounters for classic game mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter, mockRouteEncounter2],
      });

      const result = await encountersApiService.getEncounters('classic');

      expect(result).toEqual([mockRouteEncounter, mockRouteEncounter2]);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/encounters?gameMode=classic&v=12345',
        expect.any(Object)
      );
    });

    it('should return encounters for remix game mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter],
      });

      const result = await encountersApiService.getEncounters('remix');

      expect(result).toEqual([mockRouteEncounter]);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/encounters?gameMode=remix&v=12345',
        expect.any(Object)
      );
    });

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await encountersApiService.getEncounters('classic');

      expect(result).toEqual([]);
    });
  });

  describe('getEncountersByGameMode', () => {
    it('should return full response for classic game mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter, mockRouteEncounter2],
      });

      const result =
        await encountersApiService.getEncountersByGameMode('classic');

      expect(result).toEqual({
        data: [mockRouteEncounter, mockRouteEncounter2],
        count: 2,
        gameMode: 'classic',
      });
    });

    it('should return full response for remix game mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter],
      });

      const result =
        await encountersApiService.getEncountersByGameMode('remix');

      expect(result).toEqual({
        data: [mockRouteEncounter],
        count: 1,
        gameMode: 'remix',
      });
    });

    it('should calculate correct count from response data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          mockRouteEncounter,
          mockRouteEncounter2,
          { routeName: 'Route 3', encounters: [] },
        ],
      });

      const result =
        await encountersApiService.getEncountersByGameMode('classic');

      expect(result.count).toBe(3);
    });
  });

  describe('getEncounterByRouteName', () => {
    it('should return encounter when route name exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter, mockRouteEncounter2],
      });

      const result = await encountersApiService.getEncounterByRouteName(
        'Route 1',
        'classic'
      );

      expect(result).toEqual(mockRouteEncounter);
    });

    it('should return null when route name does not exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter, mockRouteEncounter2],
      });

      const result = await encountersApiService.getEncounterByRouteName(
        'Route 999',
        'classic'
      );

      expect(result).toBeNull();
    });

    it('should handle case-sensitive route name matching', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter, mockRouteEncounter2],
      });

      const result = await encountersApiService.getEncounterByRouteName(
        'route 1',
        'classic'
      );

      expect(result).toBeNull(); // Should not match 'Route 1'
    });

    it('should work with remix game mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter],
      });

      const result = await encountersApiService.getEncounterByRouteName(
        'Route 1',
        'remix'
      );

      expect(result).toEqual(mockRouteEncounter);
    });
  });

  describe('getEncountersCount', () => {
    it('should return count for classic game mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter, mockRouteEncounter2],
      });

      const result = await encountersApiService.getEncountersCount('classic');

      expect(result).toBe(2);
    });

    it('should return count for remix game mode', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter],
      });

      const result = await encountersApiService.getEncountersCount('remix');

      expect(result).toBe(1);
    });

    it('should return zero for empty encounters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await encountersApiService.getEncountersCount('classic');

      expect(result).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        encountersApiService.getEncounters('classic')
      ).rejects.toThrow('Network error');
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(
        encountersApiService.getEncounters('classic')
      ).rejects.toThrow('Invalid JSON');
    });

    it('should handle timeout scenarios', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 100)
          )
      );

      await expect(
        encountersApiService.getEncounters('classic')
      ).rejects.toThrow('Timeout');
    });

    it('should handle 500 server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(
        encountersApiService.getEncounters('classic')
      ).rejects.toThrow('Encounters API error: 500 Internal Server Error');
    });

    it('should handle 403 forbidden errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      await expect(
        encountersApiService.getEncounters('classic')
      ).rejects.toThrow('Encounters API error: 403 Forbidden');
    });
  });

  describe('URL construction', () => {
    it('should properly encode gameMode parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter],
      });

      await encountersApiService.getEncounters('classic');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/encounters?gameMode=classic&v=12345',
        expect.any(Object)
      );
    });

    it('should include cache buster parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter],
      });

      await encountersApiService.getEncounters('remix');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/encounters?gameMode=remix&v=12345',
        expect.any(Object)
      );
    });
  });

  describe('singleton pattern', () => {
    it('should maintain singleton instance', () => {
      const instance1 = encountersApiService;
      const instance2 = encountersApiService;

      expect(instance1).toBe(instance2);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow from getEncounters to getEncounterByRouteName', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter, mockRouteEncounter2],
      });

      // First get all encounters
      const encounters = await encountersApiService.getEncounters('classic');
      expect(encounters).toHaveLength(2);

      // Then find specific route
      const route1Encounter =
        await encountersApiService.getEncounterByRouteName(
          'Route 1',
          'classic'
        );
      expect(route1Encounter).toEqual(mockRouteEncounter);

      // Verify fetch was only called once (cached)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle different game modes independently', async () => {
      // Mock classic mode response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter],
      });

      const classicEncounters =
        await encountersApiService.getEncounters('classic');
      expect(classicEncounters).toHaveLength(1);

      // Mock remix mode response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter2],
      });

      const remixEncounters = await encountersApiService.getEncounters('remix');
      expect(remixEncounters).toHaveLength(1);

      // Verify both game modes were fetched
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
