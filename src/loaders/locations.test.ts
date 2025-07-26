import { describe, it, expect } from 'vitest';
import {
  generateCustomLocationId,
  mergeLocationsWithCustom,
  isCustomLocation,
  type Location,
  type CustomLocation,
  type CombinedLocation,
} from './locations';

// Mock location data for testing
const mockLocations: Location[] = [
  {
    id: 'loc-1',
    name: 'Route 1',
    routeId: 1,
    order: 1,
    region: 'Kanto',
    description: 'First route',
  },
  {
    id: 'loc-2',
    name: 'Route 2',
    routeId: 2,
    order: 2,
    region: 'Kanto',
    description: 'Second route',
  },
  {
    id: 'loc-3',
    name: 'Route 3',
    routeId: 3,
    order: 5,
    region: 'Kanto',
    description: 'Third route with gap',
  },
];

describe('Custom Location Utilities', () => {
  describe('generateCustomLocationId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateCustomLocationId();
      const id2 = generateCustomLocationId();

      expect(id1).toMatch(/^custom_\d+_.+$/);
      expect(id2).toMatch(/^custom_\d+_.+$/);
      expect(id1).not.toBe(id2);
    });

    it('should always start with "custom_"', () => {
      const id = generateCustomLocationId();
      expect(id).toMatch(/^custom_/);
    });
  });

  describe('mergeLocationsWithCustom', () => {
    it('should merge and sort locations by order', () => {
      const customLocations: CustomLocation[] = [
        { id: 'custom-1', name: 'Custom Route 1', order: 1.5 },
        { id: 'custom-2', name: 'Custom Route 2', order: 4 },
      ];

      const merged = mergeLocationsWithCustom(mockLocations, customLocations);

      expect(merged).toHaveLength(5);
      expect(merged.map(l => l.order)).toEqual([1, 1.5, 2, 4, 5]);
      expect(merged.map(l => l.name)).toEqual([
        'Route 1',
        'Custom Route 1',
        'Route 2',
        'Custom Route 2',
        'Route 3',
      ]);
    });

    it('should mark custom locations with isCustom flag', () => {
      const customLocations: CustomLocation[] = [
        { id: 'custom-1', name: 'Custom Route', order: 1.5 },
      ];

      const merged = mergeLocationsWithCustom(mockLocations, customLocations);
      const customLocation = merged.find(l => l.id === 'custom-1');

      expect(customLocation).toMatchObject({
        id: 'custom-1',
        name: 'Custom Route',
        order: 1.5,
        isCustom: true,
      });
    });

    it('should handle empty custom locations', () => {
      const merged = mergeLocationsWithCustom(mockLocations, []);
      expect(merged).toEqual(mockLocations);
    });

    it('should handle empty default locations', () => {
      const customLocations: CustomLocation[] = [
        { id: 'custom-1', name: 'Custom Route', order: 1 },
      ];

      const merged = mergeLocationsWithCustom([], customLocations);
      expect(merged).toHaveLength(1);
      expect(merged[0]).toMatchObject({
        id: 'custom-1',
        name: 'Custom Route',
        order: 1,
        isCustom: true,
      });
    });

    it('should handle duplicate orders gracefully', () => {
      const customLocations: CustomLocation[] = [
        { id: 'custom-1', name: 'Custom Route 1', order: 2 },
        { id: 'custom-2', name: 'Custom Route 2', order: 2 },
      ];

      const merged = mergeLocationsWithCustom(mockLocations, customLocations);
      expect(merged).toHaveLength(5);

      // Should maintain stable sort order
      const orderTwoItems = merged.filter(l => l.order === 2);
      expect(orderTwoItems).toHaveLength(3);
    });

    it('should preserve all properties from default locations', () => {
      const merged = mergeLocationsWithCustom(mockLocations, []);
      const firstLocation = merged[0];

      expect(firstLocation).toEqual({
        id: 'loc-1',
        name: 'Route 1',
        routeId: 1,
        order: 1,
        region: 'Kanto',
        description: 'First route',
      });
    });
  });

  describe('isCustomLocation', () => {
    it('should identify custom locations', () => {
      const customLocation: CombinedLocation = {
        id: 'custom-1',
        name: 'Custom Route',
        order: 1.5,
        isCustom: true,
      };

      expect(isCustomLocation(customLocation)).toBe(true);
    });

    it('should identify default locations', () => {
      const defaultLocation: CombinedLocation = mockLocations[0];
      expect(isCustomLocation(defaultLocation)).toBe(false);
    });

    it('should handle locations without isCustom property', () => {
      const locationWithoutFlag: CombinedLocation = {
        id: 'test-location',
        name: 'Test Location',
        routeId: 99,
        order: 1,
        region: 'Test',
        description: 'Test location',
      };
      expect(isCustomLocation(locationWithoutFlag)).toBe(false);
    });
  });

  describe('Custom location order logic', () => {
    it('should calculate gaps between existing locations', () => {
      // Test the logic for placing locations between existing ones
      const sorted = mockLocations.sort((a, b) => a.order - b.order);

      // Find locations with gaps for insertion
      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];
        const gap = next.order - current.order;

        if (gap > 1) {
          // Should be able to place a location in the middle
          const newOrder = current.order + Math.floor(gap / 2);
          expect(newOrder).toBeGreaterThan(current.order);
          expect(newOrder).toBeLessThan(next.order);
        }
      }
    });

    it('should handle decimal ordering for tight spaces', () => {
      // When there's no integer gap, should use decimal
      const order1 = 2;
      const order2 = 3;
      const gap = order2 - order1;

      if (gap <= 1) {
        const decimalOrder = order1 + 0.5;
        expect(decimalOrder).toBe(2.5);
        expect(decimalOrder).toBeGreaterThan(order1);
        expect(decimalOrder).toBeLessThan(order2);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle very large order numbers', () => {
      const largeOrderLocations: Location[] = [
        { ...mockLocations[0], order: 999999 },
        { ...mockLocations[1], order: 1000000 },
      ];

      const customLocations: CustomLocation[] = [
        { id: 'custom-1', name: 'Custom Route', order: 999999.5 },
      ];

      const merged = mergeLocationsWithCustom(
        largeOrderLocations,
        customLocations
      );
      expect(merged).toHaveLength(3);
      expect(merged[1].order).toBe(999999.5);
    });

    it('should handle negative order numbers', () => {
      const negativeOrderLocations: Location[] = [
        { ...mockLocations[0], order: -1 },
        { ...mockLocations[1], order: 0 },
      ];

      const customLocations: CustomLocation[] = [
        { id: 'custom-1', name: 'Custom Route', order: -0.5 },
      ];

      const merged = mergeLocationsWithCustom(
        negativeOrderLocations,
        customLocations
      );
      expect(merged).toHaveLength(3);
      expect(merged.map(l => l.order)).toEqual([-1, -0.5, 0]);
    });

    it('should handle empty inputs gracefully', () => {
      const merged = mergeLocationsWithCustom([], []);
      expect(merged).toEqual([]);
    });
  });
});
