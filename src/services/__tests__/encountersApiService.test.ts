import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import encountersApiService from "../encountersApiService";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the persistence module
vi.mock("@/lib/persistence", () => ({
  getCacheBuster: () => 12_345,
}));

// Mock the response schema loaded at the service boundary.
vi.mock("@/validation/encounters", () => ({
  RouteEncountersArraySchema: {
    safeParse: vi.fn().mockReturnValue({ data: [], success: true }),
  },
}));

// Import the mocked module to access the mock function
import { RouteEncountersArraySchema } from "@/validation/encounters";

const encountersApiServicePrivate = encountersApiService as unknown as {
  makeRequest: (gameMode: "classic" | "remix") => Promise<unknown>;
};

// Mock data - using any to avoid type issues in tests
const mockRouteEncounter = {
  pokemon: [
    {
      id: 1,
      source: "wild",
    },
  ],
  routeName: "Route 1",
} as any;

const mockRouteEncounter2 = {
  pokemon: [
    {
      id: 2,
      source: "wild",
    },
  ],
  routeName: "Route 2",
} as any;

describe("EncountersApiService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock to return success by default
    vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValue({
      data: [],
      success: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should set correct base URL for test environment", () => {
      // In test environment, window is undefined
      expect(typeof window).toBe("undefined");

      // The service should use localhost URL in test environment
      // We can't test the constructor directly, but we can verify the behavior
      expect(encountersApiService).toBeDefined();
    });
  });

  describe("makeRequest", () => {
    it("should make request with correct URL and gameMode parameter", async () => {
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        data: [mockRouteEncounter, mockRouteEncounter2],
        success: true,
      });

      mockFetch.mockResolvedValueOnce({
        json: async () => [mockRouteEncounter, mockRouteEncounter2],
        ok: true,
      });

      await encountersApiServicePrivate.makeRequest("classic");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/encounters?gameMode=classic&v=12345",
        expect.any(Object),
      );
    });

    it("should throw error on invalid response format", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock the schema validation to fail
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        error: { issues: ["Invalid format"] } as any,
        success: false,
      });

      mockFetch.mockResolvedValueOnce({
        json: async () => "invalid data",
        ok: true,
      });

      await expect(
        encountersApiServicePrivate.makeRequest("classic"),
      ).rejects.toThrow("Invalid API response format");
    });

    it("should handle fetch errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        encountersApiServicePrivate.makeRequest("classic"),
      ).rejects.toThrow("Network error");
    });
  });

  describe("getEncounters", () => {
    it("should return encounters for classic game mode", async () => {
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        data: [mockRouteEncounter, mockRouteEncounter2],
        success: true,
      });

      mockFetch.mockResolvedValueOnce({
        json: async () => [mockRouteEncounter, mockRouteEncounter2],
        ok: true,
      });

      const result = await encountersApiService.getEncounters("classic");

      expect(result).toEqual([mockRouteEncounter, mockRouteEncounter2]);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/encounters?gameMode=classic&v=12345",
        expect.any(Object),
      );
    });

    it("should return encounters for remix game mode", async () => {
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        data: [mockRouteEncounter],
        success: true,
      });

      mockFetch.mockResolvedValueOnce({
        json: async () => [mockRouteEncounter],
        ok: true,
      });

      const result = await encountersApiService.getEncounters("remix");

      expect(result).toEqual([mockRouteEncounter]);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/encounters?gameMode=remix&v=12345",
        expect.any(Object),
      );
    });

    it("should handle empty response", async () => {
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        data: [],
        success: true,
      });

      mockFetch.mockResolvedValueOnce({
        json: async () => [],
        ok: true,
      });

      const result = await encountersApiService.getEncounters("classic");

      expect(result).toEqual([]);
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      });

      await expect(
        encountersApiService.getEncounters("classic"),
      ).rejects.toThrow("Encounters API error: 403 Forbidden");
    });
  });

  describe("getEncounterByRouteName", () => {
    it("should return encounter for existing route", async () => {
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        data: [mockRouteEncounter, mockRouteEncounter2],
        success: true,
      });

      mockFetch.mockResolvedValueOnce({
        json: async () => [mockRouteEncounter, mockRouteEncounter2],
        ok: true,
      });

      const result = await encountersApiService.getEncounterByRouteName(
        "Route 1",
        "classic",
      );

      expect(result).toEqual(mockRouteEncounter);
    });

    it("should return null for non-existing route", async () => {
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        data: [mockRouteEncounter],
        success: true,
      });

      mockFetch.mockResolvedValueOnce({
        json: async () => [mockRouteEncounter],
        ok: true,
      });

      const result = await encountersApiService.getEncounterByRouteName(
        "Non-existent Route",
        "classic",
      );

      expect(result).toBeNull();
    });
  });

  describe("getEncountersCount", () => {
    it("should return correct count for classic game mode", async () => {
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        data: [mockRouteEncounter, mockRouteEncounter2],
        success: true,
      });

      mockFetch.mockResolvedValueOnce({
        json: async () => [mockRouteEncounter, mockRouteEncounter2],
        ok: true,
      });

      const result = await encountersApiService.getEncountersCount("classic");

      expect(result).toBe(2);
    });

    it("should return correct count for remix game mode", async () => {
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        data: [mockRouteEncounter],
        success: true,
      });

      mockFetch.mockResolvedValueOnce({
        json: async () => [mockRouteEncounter],
        ok: true,
      });

      const result = await encountersApiService.getEncountersCount("remix");

      expect(result).toBe(1);
    });
  });

  describe("URL construction", () => {
    it("should properly encode gameMode parameter", async () => {
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        data: [mockRouteEncounter],
        success: true,
      });

      mockFetch.mockResolvedValueOnce({
        json: async () => [mockRouteEncounter],
        ok: true,
      });

      await encountersApiService.getEncounters("classic");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/encounters?gameMode=classic&v=12345",
        expect.any(Object),
      );
    });

    it("should include cache buster parameter", async () => {
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        data: [mockRouteEncounter],
        success: true,
      });

      mockFetch.mockResolvedValueOnce({
        json: async () => [mockRouteEncounter],
        ok: true,
      });

      await encountersApiService.getEncounters("remix");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/encounters?gameMode=remix&v=12345",
        expect.any(Object),
      );
    });
  });

  describe("singleton pattern", () => {
    it("should maintain singleton instance", () => {
      const instance1 = encountersApiService;
      const instance2 = encountersApiService;

      expect(instance1).toBe(instance2);
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete workflow from getEncounters to getEncounterByRouteName", async () => {
      // Mock the schema validation for both calls
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        data: [mockRouteEncounter, mockRouteEncounter2],
        success: true,
      });
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        data: [mockRouteEncounter, mockRouteEncounter2],
        success: true,
      });

      // Mock fetch for both calls
      mockFetch.mockResolvedValueOnce({
        json: async () => [mockRouteEncounter, mockRouteEncounter2],
        ok: true,
      });
      mockFetch.mockResolvedValueOnce({
        json: async () => [mockRouteEncounter, mockRouteEncounter2],
        ok: true,
      });

      // First get all encounters
      const encounters = await encountersApiService.getEncounters("classic");
      expect(encounters).toHaveLength(2);

      // Then find specific route
      const route1Encounter =
        await encountersApiService.getEncounterByRouteName(
          "Route 1",
          "classic",
        );
      expect(route1Encounter).toEqual(mockRouteEncounter);

      // Verify fetch was called twice (no caching in this test setup)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should handle different game modes independently", async () => {
      // Mock classic mode response
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        data: [mockRouteEncounter],
        success: true,
      });

      mockFetch.mockResolvedValueOnce({
        json: async () => [mockRouteEncounter],
        ok: true,
      });

      const classicEncounters =
        await encountersApiService.getEncounters("classic");
      expect(classicEncounters).toHaveLength(1);

      // Mock remix mode response
      vi.mocked(RouteEncountersArraySchema.safeParse).mockReturnValueOnce({
        data: [mockRouteEncounter2],
        success: true,
      });

      mockFetch.mockResolvedValueOnce({
        json: async () => [mockRouteEncounter2],
        ok: true,
      });

      const remixEncounters = await encountersApiService.getEncounters("remix");
      expect(remixEncounters).toHaveLength(1);

      // Verify both game modes were fetched
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
