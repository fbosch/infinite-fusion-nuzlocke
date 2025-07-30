import { describe, it, expect } from 'vitest';
import {
  generateCustomLocationId,
  mergeLocationsWithCustom,
  isCustomLocation,
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

      expect(id1).toMatch(/^custom_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^custom_\d+_[a-z0-9]+$/);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isCustomLocation(normalLocation as any)).toBe(false);
    });
  });
});
