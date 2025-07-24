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
    routeId: 0,
    order: 1,
    region: 'Kanto',
    description: 'Starting town',
  },
  {
    id: 'route-1',
    name: 'Route 1',
    routeId: 1,
    order: 2,
    region: 'Kanto',
    description: 'First route',
  },
  {
    id: 'viridian-city',
    name: 'Viridian City',
    routeId: 2,
    order: 5,
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
    it('should merge and sort locations by order', () => {
      const customLocations: CustomLocation[] = [
        { id: 'custom-1', name: 'Custom Route A', order: 3 },
        { id: 'custom-2', name: 'Custom Route B', order: 6 },
      ];

      const merged = mergeLocationsWithCustom(
        mockDefaultLocations,
        customLocations
      );

      expect(merged).toHaveLength(5);
      expect(merged.map(l => l.order)).toEqual([1, 2, 3, 5, 6]);
      expect(merged[2].name).toBe('Custom Route A');
      expect(merged[4].name).toBe('Custom Route B');
    });

    it('should work with empty custom locations', () => {
      const merged = mergeLocationsWithCustom(mockDefaultLocations, []);
      expect(merged).toHaveLength(3);
      expect(merged).toEqual(mockDefaultLocations);
    });

    it('should mark custom locations with isCustom flag', () => {
      const customLocations: CustomLocation[] = [
        { id: 'custom-1', name: 'Custom Route A', order: 3 },
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
        order: 3,
        isCustom: true as const,
      };

      expect(isCustomLocation(defaultLocation)).toBe(false);
      expect(isCustomLocation(customLocation)).toBe(true);
    });

    it('should return false for locations without isCustom flag', () => {
      const normalLocation = { id: 'test', name: 'Test', order: 1 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isCustomLocation(normalLocation as any)).toBe(false);
    });
  });
});
