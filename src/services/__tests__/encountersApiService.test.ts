import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import encountersApiService from '../encountersApiService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the persistence module
vi.mock('@/lib/persistence', () => ({
  getCacheBuster: () => 12345,
}));

// Mock the encounters loader
vi.mock('@/loaders/encounters', () => ({
  RouteEncountersArraySchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: [] }),
  },
}));

// Import the mocked module to access the mock function
import { RouteEncountersArraySchema } from '@/loaders/encounters';

// Mock data - using any to avoid type issues in tests
const mockRouteEncounter = {
  routeName: 'Route 1',
  pokemon: [
    {
      id: 1,
      source: 'wild',
    },
  ],
} as any;

const mockRouteEncounter2 = {
  routeName: 'Route 2',
  pokemon: [
    {
      id: 2,
      source: 'wild',
    },
  ],
} as any;

describe('EncountersApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock to return success by default
    vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValue({
      success: true,
      data: [],
    });
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
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        success: true,
        data: [mockRouteEncounter, mockRouteEncounter2],
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter, mockRouteEncounter2],
      });

      await encountersApiService['makeRequest']({ gameMode: 'classic' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/encounters?gameMode=classic&v=12345',
        expect.any(Object)
      );
    });

    it('should throw error on invalid response format', async () => {
      // Mock the schema validation to fail
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        success: false,
        error: { issues: ['Invalid format'] } as any,
      });

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
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        success: true,
        data: [mockRouteEncounter, mockRouteEncounter2],
      });

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
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        success: true,
        data: [mockRouteEncounter],
      });

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
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        success: true,
        data: [],
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await encountersApiService.getEncounters('classic');

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
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

  describe('getEncountersByGameMode', () => {
    it('should return full response for classic game mode', async () => {
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        success: true,
        data: [mockRouteEncounter, mockRouteEncounter2],
      });

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
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        success: true,
        data: [mockRouteEncounter],
      });

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
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        success: true,
        data: [mockRouteEncounter, mockRouteEncounter2],
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter, mockRouteEncounter2],
      });

      const result =
        await encountersApiService.getEncountersByGameMode('classic');

      expect(result.count).toBe(2);
    });
  });

  describe('getEncounterByRouteName', () => {
    it('should return encounter for existing route', async () => {
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        success: true,
        data: [mockRouteEncounter, mockRouteEncounter2],
      });

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

    it('should return null for non-existing route', async () => {
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        success: true,
        data: [mockRouteEncounter],
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter],
      });

      const result = await encountersApiService.getEncounterByRouteName(
        'Non-existent Route',
        'classic'
      );

      expect(result).toBeNull();
    });
  });

  describe('getEncountersCount', () => {
    it('should return correct count for classic game mode', async () => {
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        success: true,
        data: [mockRouteEncounter, mockRouteEncounter2],
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter, mockRouteEncounter2],
      });

      const result = await encountersApiService.getEncountersCount('classic');

      expect(result).toBe(2);
    });

    it('should return correct count for remix game mode', async () => {
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        success: true,
        data: [mockRouteEncounter],
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter],
      });

      const result = await encountersApiService.getEncountersCount('remix');

      expect(result).toBe(1);
    });
  });

  describe('URL construction', () => {
    it('should properly encode gameMode parameter', async () => {
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        success: true,
        data: [mockRouteEncounter],
      });

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
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        success: true,
        data: [mockRouteEncounter],
      });

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
      // Mock the schema validation for both calls
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        success: true,
        data: [mockRouteEncounter, mockRouteEncounter2],
      });
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        success: true,
        data: [mockRouteEncounter, mockRouteEncounter2],
      });

      // Mock fetch for both calls
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter, mockRouteEncounter2],
      });
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

      // Verify fetch was called twice (no caching in this test setup)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle different game modes independently', async () => {
      // Mock classic mode response
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        success: true,
        data: [mockRouteEncounter],
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockRouteEncounter],
      });

      const classicEncounters =
        await encountersApiService.getEncounters('classic');
      expect(classicEncounters).toHaveLength(1);

      // Mock remix mode response
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        success: true,
        data: [mockRouteEncounter2],
      });

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
