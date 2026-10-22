import { describe, expect, it, vi } from "vitest";
import {
  type CustomLocation,
  generateCustomLocationId,
  getCustomLocationDependents,
  isCustomLocation,
  type Location,
  mergeLocationsWithCustom,
  updateCustomLocationDependencies,
  wouldOrphanLocations,
} from "../locations";

const customLocationIdPattern =
  /^custom_\d+_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Mock data for testing
const mockDefaultLocations: Location[] = [
  {
    description: "Starting town",
    id: "pallet-town",
    name: "Pallet Town",
    region: "Kanto",
  },
  {
    description: "First route",
    id: "route-1",
    name: "Route 1",
    region: "Kanto",
  },
  {
    description: "Green city",
    id: "viridian-city",
    name: "Viridian City",
    region: "Kanto",
  },
];

describe("Custom Location Functionality", () => {
  describe("generateCustomLocationId", () => {
    it("should generate unique IDs", () => {
      const id1 = generateCustomLocationId();
      const id2 = generateCustomLocationId();

      // New format: custom_<timestamp>_<uuid>
      expect(id1).toMatch(customLocationIdPattern);
      expect(id2).toMatch(customLocationIdPattern);
      expect(id1).not.toBe(id2);
    });
  });

  describe("mergeLocationsWithCustom", () => {
    it("should merge locations with custom insertions", () => {
      const customLocations: CustomLocation[] = [
        {
          id: "custom-1",
          insertAfterLocationId: "route-1",
          name: "Custom Route A",
        },
        {
          id: "custom-2",
          insertAfterLocationId: "viridian-city",
          name: "Custom Route B",
        },
      ];

      const merged = mergeLocationsWithCustom(
        mockDefaultLocations,
        customLocations,
      );

      expect(merged).toHaveLength(5);
      // Custom Route A should be after Route 1 (index 2)
      expect(merged[2].name).toBe("Custom Route A");
      // Custom Route B should be after Viridian City (index 4)
      expect(merged[4].name).toBe("Custom Route B");
    });

    it("should work with empty custom locations", () => {
      const merged = mergeLocationsWithCustom(mockDefaultLocations, []);
      expect(merged).toHaveLength(3);
      expect(merged).toEqual(mockDefaultLocations);
    });

    it("should mark custom locations with isCustom flag", () => {
      const customLocations: CustomLocation[] = [
        {
          id: "custom-1",
          insertAfterLocationId: "route-1",
          name: "Custom Route A",
        },
      ];

      const merged = mergeLocationsWithCustom(
        mockDefaultLocations,
        customLocations,
      );

      const customLocation = merged.find((l) => l.id === "custom-1");
      expect(customLocation).toBeDefined();
      if (customLocation === undefined) {
        throw new Error(
          "Expected custom location to be present in merged locations",
        );
      }
      expect(isCustomLocation(customLocation)).toBe(true);
    });
  });

  describe("isCustomLocation", () => {
    it("should identify custom locations", () => {
      const [defaultLocation] = mockDefaultLocations;
      const customLocation = {
        description: "Custom location",
        id: "custom-1",
        isCustom: true as const,
        name: "Custom",
        region: "Custom",
      };

      expect(isCustomLocation(defaultLocation)).toBe(false);
      expect(isCustomLocation(customLocation)).toBe(true);
    });

    it("should return false for locations without isCustom flag", () => {
      const normalLocation = {
        description: "Test location",
        id: "test",
        name: "Test",
        region: "Kanto",
      };

      expect(isCustomLocation(normalLocation as any)).toBe(false);
    });
  });

  describe("Custom Location Dependencies", () => {
    it("should handle custom location placed after another custom location", () => {
      const customLocations: CustomLocation[] = [
        {
          id: "custom-1",
          insertAfterLocationId: "route-1",
          name: "Custom Route A",
        },
        {
          id: "custom-2",
          insertAfterLocationId: "custom-1",
          name: "Custom Route B",
        },
      ];

      const merged = mergeLocationsWithCustom(
        mockDefaultLocations,
        customLocations,
      );

      expect(merged).toHaveLength(5);

      // Find positions
      const route1Index = merged.findIndex((loc) => loc.id === "route-1");
      const customAIndex = merged.findIndex((loc) => loc.id === "custom-1");
      const customBIndex = merged.findIndex((loc) => loc.id === "custom-2");

      // Verify order: Route 1 < Custom A < Custom B
      expect(route1Index).toBeLessThan(customAIndex);
      expect(customAIndex).toBeLessThan(customBIndex);
      expect(customAIndex).toBe(route1Index + 1); // A directly after Route 1
      expect(customBIndex).toBe(customAIndex + 1); // B directly after A
    });

    it("should handle chain of custom location dependencies", () => {
      const customLocations: CustomLocation[] = [
        {
          id: "custom-1",
          insertAfterLocationId: "pallet-town",
          name: "Custom A",
        },
        { id: "custom-2", insertAfterLocationId: "custom-1", name: "Custom B" },
        { id: "custom-3", insertAfterLocationId: "custom-2", name: "Custom C" },
      ];

      const merged = mergeLocationsWithCustom(
        mockDefaultLocations,
        customLocations,
      );

      expect(merged).toHaveLength(6);

      // Find positions
      const palletIndex = merged.findIndex((loc) => loc.id === "pallet-town");
      const customAIndex = merged.findIndex((loc) => loc.id === "custom-1");
      const customBIndex = merged.findIndex((loc) => loc.id === "custom-2");
      const customCIndex = merged.findIndex((loc) => loc.id === "custom-3");

      // Verify chain order
      expect(palletIndex).toBeLessThan(customAIndex);
      expect(customAIndex).toBeLessThan(customBIndex);
      expect(customBIndex).toBeLessThan(customCIndex);

      // Verify they're consecutive
      expect(customAIndex).toBe(palletIndex + 1);
      expect(customBIndex).toBe(customAIndex + 1);
      expect(customCIndex).toBe(customBIndex + 1);
    });

    it("should handle circular dependencies gracefully", () => {
      const customLocations: CustomLocation[] = [
        { id: "custom-1", insertAfterLocationId: "custom-2", name: "Custom A" },
        { id: "custom-2", insertAfterLocationId: "custom-1", name: "Custom B" },
      ];

      // Capture console.warn calls
      const consoleSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);

      const merged = mergeLocationsWithCustom(
        mockDefaultLocations,
        customLocations,
      );

      // Should only have default locations (custom ones couldn't be placed)
      expect(merged).toHaveLength(3);
      expect(merged.every((loc) => !isCustomLocation(loc))).toBe(true);

      // Should have warned about the circular dependency
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Custom location dependency error"),
        expect.arrayContaining([
          expect.stringContaining("Custom A (after custom-2)"),
          expect.stringContaining("Custom B (after custom-1)"),
        ]),
      );

      consoleSpy.mockRestore();
    });

    it("should handle missing reference gracefully", () => {
      const customLocations: CustomLocation[] = [
        {
          id: "custom-1",
          insertAfterLocationId: "non-existent-id",
          name: "Custom A",
        },
        { id: "custom-2", insertAfterLocationId: "route-1", name: "Custom B" }, // This should work
      ];

      const consoleSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);

      const merged = mergeLocationsWithCustom(
        mockDefaultLocations,
        customLocations,
      );

      // Should have default locations + Custom B (Custom A couldn't be placed)
      expect(merged).toHaveLength(4);

      // Custom B should be placed
      const customBIndex = merged.findIndex((loc) => loc.id === "custom-2");
      expect(customBIndex).toBeGreaterThan(-1);

      // Should have warned about missing reference
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Custom location dependency error"),
        expect.arrayContaining([
          expect.stringContaining("Custom A (after non-existent-id)"),
        ]),
      );

      consoleSpy.mockRestore();
    });

    it("should handle mixed valid and invalid dependencies", () => {
      const customLocations: CustomLocation[] = [
        { id: "custom-1", insertAfterLocationId: "route-1", name: "Custom A" }, // Valid
        { id: "custom-2", insertAfterLocationId: "custom-1", name: "Custom B" }, // Valid (depends on A)
        {
          id: "custom-3",
          insertAfterLocationId: "non-existent",
          name: "Custom C",
        }, // Invalid
        { id: "custom-4", insertAfterLocationId: "custom-2", name: "Custom D" }, // Valid (depends on B)
      ];

      const consoleSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);

      const merged = mergeLocationsWithCustom(
        mockDefaultLocations,
        customLocations,
      );

      // Should have 3 default + 3 valid custom locations
      expect(merged).toHaveLength(6);

      // Verify valid ones are placed in correct order
      const route1Index = merged.findIndex((loc) => loc.id === "route-1");
      const customAIndex = merged.findIndex((loc) => loc.id === "custom-1");
      const customBIndex = merged.findIndex((loc) => loc.id === "custom-2");
      const customDIndex = merged.findIndex((loc) => loc.id === "custom-4");
      const customCIndex = merged.findIndex((loc) => loc.id === "custom-3");

      expect(route1Index).toBeLessThan(customAIndex);
      expect(customAIndex).toBeLessThan(customBIndex);
      expect(customBIndex).toBeLessThan(customDIndex);
      expect(customCIndex).toBe(-1); // C should not be found

      consoleSpy.mockRestore();
    });
  });

  describe("Custom Location Dependency Management", () => {
    describe("updateCustomLocationDependencies", () => {
      it("should update dependent locations when a custom location is removed", () => {
        const customLocations: CustomLocation[] = [
          {
            id: "custom-A",
            insertAfterLocationId: "route-1",
            name: "Custom A",
          },
          {
            id: "custom-B",
            insertAfterLocationId: "custom-A",
            name: "Custom B",
          },
          {
            id: "custom-C",
            insertAfterLocationId: "custom-B",
            name: "Custom C",
          },
        ];

        // Remove custom-A
        const updated = updateCustomLocationDependencies(
          "custom-A",
          customLocations,
        );

        expect(updated).toHaveLength(2);

        // custom-A should be removed
        expect(updated.find((loc) => loc.id === "custom-A")).toBeUndefined();

        // custom-B should now point to route-1 (where custom-A was pointing)
        const customB = updated.find((loc) => loc.id === "custom-B");
        expect(customB?.insertAfterLocationId).toBe("route-1");

        // custom-C should still point to custom-B
        const customC = updated.find((loc) => loc.id === "custom-C");
        expect(customC?.insertAfterLocationId).toBe("custom-B");
      });

      it("should handle removing a middle location in a chain", () => {
        const customLocations: CustomLocation[] = [
          {
            id: "custom-A",
            insertAfterLocationId: "route-1",
            name: "Custom A",
          },
          {
            id: "custom-B",
            insertAfterLocationId: "custom-A",
            name: "Custom B",
          },
          {
            id: "custom-C",
            insertAfterLocationId: "custom-B",
            name: "Custom C",
          },
          {
            id: "custom-D",
            insertAfterLocationId: "custom-C",
            name: "Custom D",
          },
        ];

        // Remove custom-B (middle of chain)
        const updated = updateCustomLocationDependencies(
          "custom-B",
          customLocations,
        );

        expect(updated).toHaveLength(3);

        // custom-B should be removed
        expect(updated.find((loc) => loc.id === "custom-B")).toBeUndefined();

        // custom-C should now point to custom-A (where custom-B was pointing)
        const customC = updated.find((loc) => loc.id === "custom-C");
        expect(customC?.insertAfterLocationId).toBe("custom-A");

        // custom-A and custom-D should be unchanged
        const customA = updated.find((loc) => loc.id === "custom-A");
        expect(customA?.insertAfterLocationId).toBe("route-1");

        const customD = updated.find((loc) => loc.id === "custom-D");
        expect(customD?.insertAfterLocationId).toBe("custom-C");
      });

      it("should handle multiple dependents on the same location", () => {
        const customLocations: CustomLocation[] = [
          {
            id: "custom-A",
            insertAfterLocationId: "route-1",
            name: "Custom A",
          },
          {
            id: "custom-B",
            insertAfterLocationId: "custom-A",
            name: "Custom B",
          },
          {
            id: "custom-C",
            insertAfterLocationId: "custom-A",
            name: "Custom C",
          },
          {
            id: "custom-D",
            insertAfterLocationId: "custom-A",
            name: "Custom D",
          },
        ];

        // Remove custom-A (multiple dependents)
        const updated = updateCustomLocationDependencies(
          "custom-A",
          customLocations,
        );

        expect(updated).toHaveLength(3);

        // All dependents should now point to route-1
        const customB = updated.find((loc) => loc.id === "custom-B");
        const customC = updated.find((loc) => loc.id === "custom-C");
        const customD = updated.find((loc) => loc.id === "custom-D");

        expect(customB?.insertAfterLocationId).toBe("route-1");
        expect(customC?.insertAfterLocationId).toBe("route-1");
        expect(customD?.insertAfterLocationId).toBe("route-1");
      });

      it("should return unchanged array if location does not exist", () => {
        const customLocations: CustomLocation[] = [
          {
            id: "custom-A",
            insertAfterLocationId: "route-1",
            name: "Custom A",
          },
        ];

        const updated = updateCustomLocationDependencies(
          "non-existent",
          customLocations,
        );

        expect(updated).toEqual(customLocations);
      });
    });

    describe("getCustomLocationDependents", () => {
      it("should find direct dependents", () => {
        const customLocations: CustomLocation[] = [
          {
            id: "custom-A",
            insertAfterLocationId: "route-1",
            name: "Custom A",
          },
          {
            id: "custom-B",
            insertAfterLocationId: "custom-A",
            name: "Custom B",
          },
          {
            id: "custom-C",
            insertAfterLocationId: "route-1",
            name: "Custom C",
          },
        ];

        const dependents = getCustomLocationDependents(
          "custom-A",
          customLocations,
        );

        expect(dependents).toHaveLength(1);
        expect(dependents[0].id).toBe("custom-B");
      });

      it("should find indirect dependents (chain)", () => {
        const customLocations: CustomLocation[] = [
          {
            id: "custom-A",
            insertAfterLocationId: "route-1",
            name: "Custom A",
          },
          {
            id: "custom-B",
            insertAfterLocationId: "custom-A",
            name: "Custom B",
          },
          {
            id: "custom-C",
            insertAfterLocationId: "custom-B",
            name: "Custom C",
          },
          {
            id: "custom-D",
            insertAfterLocationId: "custom-C",
            name: "Custom D",
          },
        ];

        const dependents = getCustomLocationDependents(
          "custom-A",
          customLocations,
        );

        expect(dependents).toHaveLength(3);
        expect(dependents.map((d) => d.id)).toEqual([
          "custom-B",
          "custom-C",
          "custom-D",
        ]);
      });

      it("should find multiple direct dependents", () => {
        const customLocations: CustomLocation[] = [
          {
            id: "custom-A",
            insertAfterLocationId: "route-1",
            name: "Custom A",
          },
          {
            id: "custom-B",
            insertAfterLocationId: "custom-A",
            name: "Custom B",
          },
          {
            id: "custom-C",
            insertAfterLocationId: "custom-A",
            name: "Custom C",
          },
          {
            id: "custom-D",
            insertAfterLocationId: "custom-A",
            name: "Custom D",
          },
        ];

        const dependents = getCustomLocationDependents(
          "custom-A",
          customLocations,
        );

        expect(dependents).toHaveLength(3);
        expect(
          dependents
            .map((d) => d.id)
            .sort((left, right) => left.localeCompare(right)),
        ).toEqual(["custom-B", "custom-C", "custom-D"]);
      });

      it("should handle complex dependency trees", () => {
        const customLocations: CustomLocation[] = [
          {
            id: "custom-A",
            insertAfterLocationId: "route-1",
            name: "Custom A",
          },
          {
            id: "custom-B",
            insertAfterLocationId: "custom-A",
            name: "Custom B",
          },
          {
            id: "custom-C",
            insertAfterLocationId: "custom-A",
            name: "Custom C",
          },
          {
            id: "custom-D",
            insertAfterLocationId: "custom-B",
            name: "Custom D",
          },
          {
            id: "custom-E",
            insertAfterLocationId: "custom-C",
            name: "Custom E",
          },
        ];

        const dependents = getCustomLocationDependents(
          "custom-A",
          customLocations,
        );

        expect(dependents).toHaveLength(4);
        expect(
          dependents
            .map((d) => d.id)
            .sort((left, right) => left.localeCompare(right)),
        ).toEqual(["custom-B", "custom-C", "custom-D", "custom-E"]);
      });

      it("should return empty array if no dependents", () => {
        const customLocations: CustomLocation[] = [
          {
            id: "custom-A",
            insertAfterLocationId: "route-1",
            name: "Custom A",
          },
          {
            id: "custom-B",
            insertAfterLocationId: "route-1",
            name: "Custom B",
          },
        ];

        const dependents = getCustomLocationDependents(
          "custom-A",
          customLocations,
        );

        expect(dependents).toHaveLength(0);
      });

      it("should handle circular dependencies without infinite loops", () => {
        const customLocations: CustomLocation[] = [
          {
            id: "custom-A",
            insertAfterLocationId: "custom-B",
            name: "Custom A",
          },
          {
            id: "custom-B",
            insertAfterLocationId: "custom-A",
            name: "Custom B",
          },
        ];

        const dependents = getCustomLocationDependents(
          "custom-A",
          customLocations,
        );

        // In a circular dependency A→B→A, when asking "what depends on A?",
        // the answer should be just B (not A again)
        expect(dependents).toHaveLength(1);
        expect(dependents[0].id).toBe("custom-B");
      });
    });

    describe("wouldOrphanLocations", () => {
      it("should detect when removing a location would orphan others", () => {
        const customLocations: CustomLocation[] = [
          {
            id: "custom-A",
            insertAfterLocationId: "route-1",
            name: "Custom A",
          },
          {
            id: "custom-B",
            insertAfterLocationId: "custom-A",
            name: "Custom B",
          },
        ];

        const result = wouldOrphanLocations("custom-A", customLocations);

        expect(result.wouldOrphan).toBe(true);
        expect(result.dependents).toHaveLength(1);
        expect(result.dependents[0].id).toBe("custom-B");
      });

      it("should detect when removal is safe", () => {
        const customLocations: CustomLocation[] = [
          {
            id: "custom-A",
            insertAfterLocationId: "route-1",
            name: "Custom A",
          },
          {
            id: "custom-B",
            insertAfterLocationId: "route-1",
            name: "Custom B",
          },
        ];

        const result = wouldOrphanLocations("custom-A", customLocations);

        expect(result.wouldOrphan).toBe(false);
        expect(result.dependents).toHaveLength(0);
      });

      it("should detect complex dependency chains", () => {
        const customLocations: CustomLocation[] = [
          {
            id: "custom-A",
            insertAfterLocationId: "route-1",
            name: "Custom A",
          },
          {
            id: "custom-B",
            insertAfterLocationId: "custom-A",
            name: "Custom B",
          },
          {
            id: "custom-C",
            insertAfterLocationId: "custom-B",
            name: "Custom C",
          },
        ];

        const result = wouldOrphanLocations("custom-A", customLocations);

        expect(result.wouldOrphan).toBe(true);
        expect(result.dependents).toHaveLength(2);
        expect(result.dependents.map((d) => d.id)).toEqual([
          "custom-B",
          "custom-C",
        ]);
      });
    });
  });
});
