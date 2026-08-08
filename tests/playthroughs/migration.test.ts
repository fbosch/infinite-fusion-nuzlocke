// Import mocks first (must be at top level for Vitest hoisting)
import "./mocks";

import { normalizePersistedPlaythrough } from "@/stores/playthroughs/migrations";
// Import shared setup and utilities
import { createMockPokemon, describe, expect, it } from "./setup";

describe("Playthroughs Store - Migration Tests", () => {
  describe("remixMode to gameMode migration", () => {
    it("should migrate remixMode: true to gameMode: remix", () => {
      const legacyData = {
        createdAt: Date.now(),
        encounters: {},
        gameMode: "classic" as const, // Default value
        id: "test-migration-1",
        name: "Legacy Remix Run",
        remixMode: true,
        updatedAt: Date.now(),
      };

      const result = normalizePersistedPlaythrough(legacyData);

      expect(result.gameMode).toBe("remix");
      expect(result.name).toBe("Legacy Remix Run");
      expect(result.id).toBe("test-migration-1");
      expect(result).not.toHaveProperty("remixMode");
    });

    it("should migrate remixMode: false to gameMode: classic", () => {
      const legacyData = {
        createdAt: Date.now(),
        encounters: {},
        gameMode: "classic" as const, // Default value
        id: "test-migration-2",
        name: "Legacy Classic Run",
        remixMode: false,
        updatedAt: Date.now(),
      };

      const result = normalizePersistedPlaythrough(legacyData);

      expect(result.gameMode).toBe("classic");
      expect(result.name).toBe("Legacy Classic Run");
      expect(result.id).toBe("test-migration-2");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result as any).remixMode).toBeUndefined();
    });

    it("should not migrate when gameMode is explicitly set to non-default", () => {
      const modernData = {
        createdAt: Date.now(),
        encounters: {},
        gameMode: "randomized" as const,
        id: "test-migration-3",
        name: "Modern Randomized Run",
        remixMode: true, // Should be ignored
        updatedAt: Date.now(),
      };

      const result = normalizePersistedPlaythrough(modernData);

      // Should preserve explicit gameMode and remove remixMode
      expect(result.gameMode).toBe("randomized");
      expect("remixMode" in result).toBe(false);
    });

    it("should preserve all other fields during migration", () => {
      const legacyDataWithEncounters = {
        createdAt: 1_234_567_890,
        customLocations: [
          {
            id: "custom-1",
            insertAfterLocationId: "some-location-id",
            name: "Custom Route",
          },
        ],
        encounters: {
          "route-1": {
            body: null,
            head: createMockPokemon("Pikachu", 25),
            isFusion: false,
            updatedAt: Date.now(),
          },
        },
        gameMode: "classic" as const,
        id: "test-migration-6",
        name: "Legacy Run with Data",
        remixMode: true,
        updatedAt: 1_234_567_891,
      };

      const result = normalizePersistedPlaythrough(legacyDataWithEncounters);

      expect(result.gameMode).toBe("remix");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result as any).remixMode).toBeUndefined();
      expect(result.encounters).toBeDefined();
      expect(result.encounters?.["route-1"]).toBeDefined();
      expect(result.encounters["route-1"].head.name).toBe("Pikachu");
      expect(result.customLocations).toBeDefined();
      expect(result.customLocations?.[0].name).toBe("Custom Route");
      expect(result.createdAt).toBe(1_234_567_890);
      expect(result.updatedAt).toBe(1_234_567_891);
    });
  });

  describe("Schema validation edge cases", () => {
    it("should handle data without remixMode field (modern format)", () => {
      const modernData = {
        createdAt: Date.now(),
        encounters: {},
        gameMode: "randomized" as const,
        id: "test-missing",
        name: "Test Run",
        updatedAt: Date.now(),
      };

      const result = normalizePersistedPlaythrough(modernData);

      expect(result.gameMode).toBe("randomized");
      expect("remixMode" in result).toBe(false);
    });

    it("should validate gameMode enum values correctly", () => {
      const validData = {
        createdAt: Date.now(),
        encounters: {},
        gameMode: "classic" as const,
        id: "test-enum",
        name: "Test Run",
        updatedAt: Date.now(),
      };

      const result = normalizePersistedPlaythrough(validData);
      expect(result.gameMode).toBe("classic");
    });

    it("should handle corrupted migration data gracefully", () => {
      const corruptedData = {
        createdAt: Date.now(),
        encounters: {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        gameMode: "invalid" as any, // Invalid enum value
        id: "test-corrupted",
        name: "Test Run",
        remixMode: "invalid", // Invalid type
        updatedAt: Date.now(),
      };

      expect(() => normalizePersistedPlaythrough(corruptedData)).toThrow();
    });

    it("should successfully create new playthroughs with current schema", () => {
      const newPlaythrough = {
        createdAt: Date.now(),
        encounters: {},
        gameMode: "remix" as const,
        id: "test-new",
        name: "New Test Run",
        updatedAt: Date.now(),
      };

      const result = normalizePersistedPlaythrough(newPlaythrough);
      expect(result.gameMode).toBe("remix");
      expect(result.name).toBe("New Test Run");
      expect("remixMode" in result).toBe(false);
    });
  });
});
