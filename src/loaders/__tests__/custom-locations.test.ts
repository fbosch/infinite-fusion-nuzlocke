import { describe, it, expect, vi } from 'vitest';
import {
  generateCustomLocationId,
  mergeLocationsWithCustom,
  isCustomLocation,
  updateCustomLocationDependencies,
  getCustomLocationDependents,
  wouldOrphanLocations,
  type CustomLocation,
  type Location,
} from '../locations';

// Mock data for testing
const mockDefaultLocations: Location[] = [
  {
    id: 'pallet-town',
    name: 'Pallet Town',
    region: 'Kanto',
    description: 'Starting town',
  },
  {
    id: 'route-1',
    name: 'Route 1',
    region: 'Kanto',
    description: 'First route',
  },
  {
    id: 'viridian-city',
    name: 'Viridian City',
    region: 'Kanto',
    description: 'Green city',
  },
];

describe('Custom Location Functionality', () => {
  describe('generateCustomLocationId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateCustomLocationId();
      const id2 = generateCustomLocationId();

      // New format: custom_<timestamp>_<uuid>
      expect(id1).toMatch(
        /^custom_\d+_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
      expect(id2).toMatch(
        /^custom_\d+_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
      expect(id1).not.toBe(id2);
    });
  });

  describe('mergeLocationsWithCustom', () => {
    it('should merge locations with custom insertions', () => {
      const customLocations: CustomLocation[] = [
        {
          id: 'custom-1',
          name: 'Custom Route A',
          insertAfterLocationId: 'route-1',
        },
        {
          id: 'custom-2',
          name: 'Custom Route B',
          insertAfterLocationId: 'viridian-city',
        },
      ];

      const merged = mergeLocationsWithCustom(
        mockDefaultLocations,
        customLocations
      );

      expect(merged).toHaveLength(5);
      // Custom Route A should be after Route 1 (index 2)
      expect(merged[2].name).toBe('Custom Route A');
      // Custom Route B should be after Viridian City (index 4)
      expect(merged[4].name).toBe('Custom Route B');
    });

    it('should work with empty custom locations', () => {
      const merged = mergeLocationsWithCustom(mockDefaultLocations, []);
      expect(merged).toHaveLength(3);
      expect(merged).toEqual(mockDefaultLocations);
    });

    it('should mark custom locations with isCustom flag', () => {
      const customLocations: CustomLocation[] = [
        {
          id: 'custom-1',
          name: 'Custom Route A',
          insertAfterLocationId: 'route-1',
        },
      ];

      const merged = mergeLocationsWithCustom(
        mockDefaultLocations,
        customLocations
      );

      const customLocation = merged.find(l => l.id === 'custom-1');
      expect(customLocation).toBeDefined();
      expect(isCustomLocation(customLocation!)).toBe(true);
    });
  });

  describe('isCustomLocation', () => {
    it('should identify custom locations', () => {
      const defaultLocation = mockDefaultLocations[0];
      const customLocation = {
        id: 'custom-1',
        name: 'Custom',
        region: 'Custom',
        description: 'Custom location',
        isCustom: true as const,
      };

      expect(isCustomLocation(defaultLocation)).toBe(false);
      expect(isCustomLocation(customLocation)).toBe(true);
    });

    it('should return false for locations without isCustom flag', () => {
      const normalLocation = {
        id: 'test',
        name: 'Test',
        region: 'Kanto',
        description: 'Test location',
      };

      expect(isCustomLocation(normalLocation as any)).toBe(false);
    });
  });

  describe('Custom Location Dependencies', () => {
    it('should handle custom location placed after another custom location', () => {
      const customLocations: CustomLocation[] = [
        {
          id: 'custom-1',
          name: 'Custom Route A',
          insertAfterLocationId: 'route-1',
        },
        {
          id: 'custom-2',
          name: 'Custom Route B',
          insertAfterLocationId: 'custom-1',
        },
      ];

      const merged = mergeLocationsWithCustom(
        mockDefaultLocations,
        customLocations
      );

      expect(merged).toHaveLength(5);

      // Find positions
      const route1Index = merged.findIndex(loc => loc.id === 'route-1');
      const customAIndex = merged.findIndex(loc => loc.id === 'custom-1');
      const customBIndex = merged.findIndex(loc => loc.id === 'custom-2');

      // Verify order: Route 1 < Custom A < Custom B
      expect(route1Index).toBeLessThan(customAIndex);
      expect(customAIndex).toBeLessThan(customBIndex);
      expect(customAIndex).toBe(route1Index + 1); // A directly after Route 1
      expect(customBIndex).toBe(customAIndex + 1); // B directly after A
    });

    it('should handle chain of custom location dependencies', () => {
      const customLocations: CustomLocation[] = [
        {
          id: 'custom-1',
          name: 'Custom A',
          insertAfterLocationId: 'pallet-town',
        },
        { id: 'custom-2', name: 'Custom B', insertAfterLocationId: 'custom-1' },
        { id: 'custom-3', name: 'Custom C', insertAfterLocationId: 'custom-2' },
      ];

      const merged = mergeLocationsWithCustom(
        mockDefaultLocations,
        customLocations
      );

      expect(merged).toHaveLength(6);

      // Find positions
      const palletIndex = merged.findIndex(loc => loc.id === 'pallet-town');
      const customAIndex = merged.findIndex(loc => loc.id === 'custom-1');
      const customBIndex = merged.findIndex(loc => loc.id === 'custom-2');
      const customCIndex = merged.findIndex(loc => loc.id === 'custom-3');

      // Verify chain order
      expect(palletIndex).toBeLessThan(customAIndex);
      expect(customAIndex).toBeLessThan(customBIndex);
      expect(customBIndex).toBeLessThan(customCIndex);

      // Verify they're consecutive
      expect(customAIndex).toBe(palletIndex + 1);
      expect(customBIndex).toBe(customAIndex + 1);
      expect(customCIndex).toBe(customBIndex + 1);
    });

    it('should handle circular dependencies gracefully', () => {
      const customLocations: CustomLocation[] = [
        { id: 'custom-1', name: 'Custom A', insertAfterLocationId: 'custom-2' },
        { id: 'custom-2', name: 'Custom B', insertAfterLocationId: 'custom-1' },
      ];

      // Capture console.warn calls
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const merged = mergeLocationsWithCustom(
        mockDefaultLocations,
        customLocations
      );

      // Should only have default locations (custom ones couldn't be placed)
      expect(merged).toHaveLength(3);
      expect(merged.every(loc => !isCustomLocation(loc))).toBe(true);

      // Should have warned about the circular dependency
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Custom location dependency error'),
        expect.arrayContaining([
          expect.stringContaining('Custom A (after custom-2)'),
          expect.stringContaining('Custom B (after custom-1)'),
        ])
      );

      consoleSpy.mockRestore();
    });

    it('should handle missing reference gracefully', () => {
      const customLocations: CustomLocation[] = [
        {
          id: 'custom-1',
          name: 'Custom A',
          insertAfterLocationId: 'non-existent-id',
        },
        { id: 'custom-2', name: 'Custom B', insertAfterLocationId: 'route-1' }, // This should work
      ];

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const merged = mergeLocationsWithCustom(
        mockDefaultLocations,
        customLocations
      );

      // Should have default locations + Custom B (Custom A couldn't be placed)
      expect(merged).toHaveLength(4);

      // Custom B should be placed
      const customBIndex = merged.findIndex(loc => loc.id === 'custom-2');
      expect(customBIndex).toBeGreaterThan(-1);

      // Should have warned about missing reference
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Custom location dependency error'),
        expect.arrayContaining([
          expect.stringContaining('Custom A (after non-existent-id)'),
        ])
      );

      consoleSpy.mockRestore();
    });

    it('should handle mixed valid and invalid dependencies', () => {
      const customLocations: CustomLocation[] = [
        { id: 'custom-1', name: 'Custom A', insertAfterLocationId: 'route-1' }, // Valid
        { id: 'custom-2', name: 'Custom B', insertAfterLocationId: 'custom-1' }, // Valid (depends on A)
        {
          id: 'custom-3',
          name: 'Custom C',
          insertAfterLocationId: 'non-existent',
        }, // Invalid
        { id: 'custom-4', name: 'Custom D', insertAfterLocationId: 'custom-2' }, // Valid (depends on B)
      ];

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const merged = mergeLocationsWithCustom(
        mockDefaultLocations,
        customLocations
      );

      // Should have 3 default + 3 valid custom locations
      expect(merged).toHaveLength(6);

      // Verify valid ones are placed in correct order
      const route1Index = merged.findIndex(loc => loc.id === 'route-1');
      const customAIndex = merged.findIndex(loc => loc.id === 'custom-1');
      const customBIndex = merged.findIndex(loc => loc.id === 'custom-2');
      const customDIndex = merged.findIndex(loc => loc.id === 'custom-4');
      const customCIndex = merged.findIndex(loc => loc.id === 'custom-3');

      expect(route1Index).toBeLessThan(customAIndex);
      expect(customAIndex).toBeLessThan(customBIndex);
      expect(customBIndex).toBeLessThan(customDIndex);
      expect(customCIndex).toBe(-1); // C should not be found

      consoleSpy.mockRestore();
    });
  });

  describe('Custom Location Dependency Management', () => {
    describe('updateCustomLocationDependencies', () => {
      it('should update dependent locations when a custom location is removed', () => {
        const customLocations: CustomLocation[] = [
          {
            id: 'custom-A',
            name: 'Custom A',
            insertAfterLocationId: 'route-1',
          },
          {
            id: 'custom-B',
            name: 'Custom B',
            insertAfterLocationId: 'custom-A',
          },
          {
            id: 'custom-C',
            name: 'Custom C',
            insertAfterLocationId: 'custom-B',
          },
        ];

        // Remove custom-A
        const updated = updateCustomLocationDependencies(
          'custom-A',
          customLocations
        );

        expect(updated).toHaveLength(2);

        // custom-A should be removed
        expect(updated.find(loc => loc.id === 'custom-A')).toBeUndefined();

        // custom-B should now point to route-1 (where custom-A was pointing)
        const customB = updated.find(loc => loc.id === 'custom-B');
        expect(customB?.insertAfterLocationId).toBe('route-1');

        // custom-C should still point to custom-B
        const customC = updated.find(loc => loc.id === 'custom-C');
        expect(customC?.insertAfterLocationId).toBe('custom-B');
      });

      it('should handle removing a middle location in a chain', () => {
        const customLocations: CustomLocation[] = [
          {
            id: 'custom-A',
            name: 'Custom A',
            insertAfterLocationId: 'route-1',
          },
          {
            id: 'custom-B',
            name: 'Custom B',
            insertAfterLocationId: 'custom-A',
          },
          {
            id: 'custom-C',
            name: 'Custom C',
            insertAfterLocationId: 'custom-B',
          },
          {
            id: 'custom-D',
            name: 'Custom D',
            insertAfterLocationId: 'custom-C',
          },
        ];

        // Remove custom-B (middle of chain)
        const updated = updateCustomLocationDependencies(
          'custom-B',
          customLocations
        );

        expect(updated).toHaveLength(3);

        // custom-B should be removed
        expect(updated.find(loc => loc.id === 'custom-B')).toBeUndefined();

        // custom-C should now point to custom-A (where custom-B was pointing)
        const customC = updated.find(loc => loc.id === 'custom-C');
        expect(customC?.insertAfterLocationId).toBe('custom-A');

        // custom-A and custom-D should be unchanged
        const customA = updated.find(loc => loc.id === 'custom-A');
        expect(customA?.insertAfterLocationId).toBe('route-1');

        const customD = updated.find(loc => loc.id === 'custom-D');
        expect(customD?.insertAfterLocationId).toBe('custom-C');
      });

      it('should handle multiple dependents on the same location', () => {
        const customLocations: CustomLocation[] = [
          {
            id: 'custom-A',
            name: 'Custom A',
            insertAfterLocationId: 'route-1',
          },
          {
            id: 'custom-B',
            name: 'Custom B',
            insertAfterLocationId: 'custom-A',
          },
          {
            id: 'custom-C',
            name: 'Custom C',
            insertAfterLocationId: 'custom-A',
          },
          {
            id: 'custom-D',
            name: 'Custom D',
            insertAfterLocationId: 'custom-A',
          },
        ];

        // Remove custom-A (multiple dependents)
        const updated = updateCustomLocationDependencies(
          'custom-A',
          customLocations
        );

        expect(updated).toHaveLength(3);

        // All dependents should now point to route-1
        const customB = updated.find(loc => loc.id === 'custom-B');
        const customC = updated.find(loc => loc.id === 'custom-C');
        const customD = updated.find(loc => loc.id === 'custom-D');

        expect(customB?.insertAfterLocationId).toBe('route-1');
        expect(customC?.insertAfterLocationId).toBe('route-1');
        expect(customD?.insertAfterLocationId).toBe('route-1');
      });

      it('should return unchanged array if location does not exist', () => {
        const customLocations: CustomLocation[] = [
          {
            id: 'custom-A',
            name: 'Custom A',
            insertAfterLocationId: 'route-1',
          },
        ];

        const updated = updateCustomLocationDependencies(
          'non-existent',
          customLocations
        );

        expect(updated).toEqual(customLocations);
      });
    });

    describe('getCustomLocationDependents', () => {
      it('should find direct dependents', () => {
        const customLocations: CustomLocation[] = [
          {
            id: 'custom-A',
            name: 'Custom A',
            insertAfterLocationId: 'route-1',
          },
          {
            id: 'custom-B',
            name: 'Custom B',
            insertAfterLocationId: 'custom-A',
          },
          {
            id: 'custom-C',
            name: 'Custom C',
            insertAfterLocationId: 'route-1',
          },
        ];

        const dependents = getCustomLocationDependents(
          'custom-A',
          customLocations
        );

        expect(dependents).toHaveLength(1);
        expect(dependents[0].id).toBe('custom-B');
      });

      it('should find indirect dependents (chain)', () => {
        const customLocations: CustomLocation[] = [
          {
            id: 'custom-A',
            name: 'Custom A',
            insertAfterLocationId: 'route-1',
          },
          {
            id: 'custom-B',
            name: 'Custom B',
            insertAfterLocationId: 'custom-A',
          },
          {
            id: 'custom-C',
            name: 'Custom C',
            insertAfterLocationId: 'custom-B',
          },
          {
            id: 'custom-D',
            name: 'Custom D',
            insertAfterLocationId: 'custom-C',
          },
        ];

        const dependents = getCustomLocationDependents(
          'custom-A',
          customLocations
        );

        expect(dependents).toHaveLength(3);
        expect(dependents.map(d => d.id)).toEqual([
          'custom-B',
          'custom-C',
          'custom-D',
        ]);
      });

      it('should find multiple direct dependents', () => {
        const customLocations: CustomLocation[] = [
          {
            id: 'custom-A',
            name: 'Custom A',
            insertAfterLocationId: 'route-1',
          },
          {
            id: 'custom-B',
            name: 'Custom B',
            insertAfterLocationId: 'custom-A',
          },
          {
            id: 'custom-C',
            name: 'Custom C',
            insertAfterLocationId: 'custom-A',
          },
          {
            id: 'custom-D',
            name: 'Custom D',
            insertAfterLocationId: 'custom-A',
          },
        ];

        const dependents = getCustomLocationDependents(
          'custom-A',
          customLocations
        );

        expect(dependents).toHaveLength(3);
        expect(dependents.map(d => d.id).sort()).toEqual([
          'custom-B',
          'custom-C',
          'custom-D',
        ]);
      });

      it('should handle complex dependency trees', () => {
        const customLocations: CustomLocation[] = [
          {
            id: 'custom-A',
            name: 'Custom A',
            insertAfterLocationId: 'route-1',
          },
          {
            id: 'custom-B',
            name: 'Custom B',
            insertAfterLocationId: 'custom-A',
          },
          {
            id: 'custom-C',
            name: 'Custom C',
            insertAfterLocationId: 'custom-A',
          },
          {
            id: 'custom-D',
            name: 'Custom D',
            insertAfterLocationId: 'custom-B',
          },
          {
            id: 'custom-E',
            name: 'Custom E',
            insertAfterLocationId: 'custom-C',
          },
        ];

        const dependents = getCustomLocationDependents(
          'custom-A',
          customLocations
        );

        expect(dependents).toHaveLength(4);
        expect(dependents.map(d => d.id).sort()).toEqual([
          'custom-B',
          'custom-C',
          'custom-D',
          'custom-E',
        ]);
      });

      it('should return empty array if no dependents', () => {
        const customLocations: CustomLocation[] = [
          {
            id: 'custom-A',
            name: 'Custom A',
            insertAfterLocationId: 'route-1',
          },
          {
            id: 'custom-B',
            name: 'Custom B',
            insertAfterLocationId: 'route-1',
          },
        ];

        const dependents = getCustomLocationDependents(
          'custom-A',
          customLocations
        );

        expect(dependents).toHaveLength(0);
      });

      it('should handle circular dependencies without infinite loops', () => {
        const customLocations: CustomLocation[] = [
          {
            id: 'custom-A',
            name: 'Custom A',
            insertAfterLocationId: 'custom-B',
          },
          {
            id: 'custom-B',
            name: 'Custom B',
            insertAfterLocationId: 'custom-A',
          },
        ];

        const dependents = getCustomLocationDependents(
          'custom-A',
          customLocations
        );

        // In a circular dependency A→B→A, when asking "what depends on A?",
        // the answer should be just B (not A again)
        expect(dependents).toHaveLength(1);
        expect(dependents[0].id).toBe('custom-B');
      });
    });

    describe('wouldOrphanLocations', () => {
      it('should detect when removing a location would orphan others', () => {
        const customLocations: CustomLocation[] = [
          {
            id: 'custom-A',
            name: 'Custom A',
            insertAfterLocationId: 'route-1',
          },
          {
            id: 'custom-B',
            name: 'Custom B',
            insertAfterLocationId: 'custom-A',
          },
        ];

        const result = wouldOrphanLocations('custom-A', customLocations);

        expect(result.wouldOrphan).toBe(true);
        expect(result.dependents).toHaveLength(1);
        expect(result.dependents[0].id).toBe('custom-B');
      });

      it('should detect when removal is safe', () => {
        const customLocations: CustomLocation[] = [
          {
            id: 'custom-A',
            name: 'Custom A',
            insertAfterLocationId: 'route-1',
          },
          {
            id: 'custom-B',
            name: 'Custom B',
            insertAfterLocationId: 'route-1',
          },
        ];

        const result = wouldOrphanLocations('custom-A', customLocations);

        expect(result.wouldOrphan).toBe(false);
        expect(result.dependents).toHaveLength(0);
      });

      it('should detect complex dependency chains', () => {
        const customLocations: CustomLocation[] = [
          {
            id: 'custom-A',
            name: 'Custom A',
            insertAfterLocationId: 'route-1',
          },
          {
            id: 'custom-B',
            name: 'Custom B',
            insertAfterLocationId: 'custom-A',
          },
          {
            id: 'custom-C',
            name: 'Custom C',
            insertAfterLocationId: 'custom-B',
          },
        ];

        const result = wouldOrphanLocations('custom-A', customLocations);

        expect(result.wouldOrphan).toBe(true);
        expect(result.dependents).toHaveLength(2);
        expect(result.dependents.map(d => d.id)).toEqual([
          'custom-B',
          'custom-C',
        ]);
      });
    });
  });
});
