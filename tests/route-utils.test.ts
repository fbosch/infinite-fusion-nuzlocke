import { describe, it, expect } from 'vitest';
import {
  isRoutePattern,
  cleanRouteName,
  extractRouteId,
  processRouteName,
  ROUTE_PATTERNS
} from '../scripts/utils/route-utils';

describe('Route Processing Utilities', () => {
  describe('ROUTE_PATTERNS', () => {
    it('should have the expected regex patterns', () => {
      expect(ROUTE_PATTERNS.ROUTE_MATCH).toBeInstanceOf(RegExp);
      expect(ROUTE_PATTERNS.ROUTE_ID_EXTRACT).toBeInstanceOf(RegExp);
      expect(ROUTE_PATTERNS.ROUTE_ID_CLEAN).toBeInstanceOf(RegExp);
    });
  });

  describe('isRoutePattern', () => {
    it('should match numbered routes', () => {
      expect(isRoutePattern('Route 1')).toBe(true);
      expect(isRoutePattern('Route 25')).toBe(true);
      expect(isRoutePattern('Route 123')).toBe(true);
    });

    it('should match special locations', () => {
      expect(isRoutePattern('Viridian Forest')).toBe(true);
      expect(isRoutePattern('Secret Garden')).toBe(true);
      expect(isRoutePattern('Hidden Forest')).toBe(true);
      expect(isRoutePattern('Viridian River')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isRoutePattern('route 1')).toBe(true);
      expect(isRoutePattern('ROUTE 1')).toBe(true);
      expect(isRoutePattern('viridian forest')).toBe(true);
    });

    it('should handle routes with ID information', () => {
      expect(isRoutePattern('Route 1 (ID 78)')).toBe(true);
      expect(isRoutePattern('Viridian Forest (ID 12)')).toBe(true);
    });

    it('should reject non-route patterns', () => {
      expect(isRoutePattern('Pokemon Center')).toBe(false);
      expect(isRoutePattern('Gym Leader')).toBe(false);
      expect(isRoutePattern('Random Text')).toBe(false);
      expect(isRoutePattern('Route')).toBe(false); // Route without number
    });

    it('should handle invalid input', () => {
      expect(isRoutePattern('')).toBe(false);
      expect(isRoutePattern(null as any)).toBe(false);
      expect(isRoutePattern(undefined as any)).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(isRoutePattern('  Route 1  ')).toBe(true);
      expect(isRoutePattern('\tViridian Forest\n')).toBe(true);
    });
  });

  describe('cleanRouteName', () => {
    it('should remove ID information', () => {
      expect(cleanRouteName('Route 1 (ID 78)')).toBe('Route 1');
      expect(cleanRouteName('Viridian Forest (ID 12)')).toBe('Viridian Forest');
    });

    it('should handle routes without ID', () => {
      expect(cleanRouteName('Route 1')).toBe('Route 1');
      expect(cleanRouteName('Viridian Forest')).toBe('Viridian Forest');
    });

    it('should handle multiple ID patterns', () => {
      expect(cleanRouteName('Route 1 (ID 78) (ID 99)')).toBe('Route 1 (ID 78)');
    });

    it('should trim whitespace', () => {
      expect(cleanRouteName('  Route 1 (ID 78)  ')).toBe('Route 1');
      expect(cleanRouteName('Route 1   (ID 78)')).toBe('Route 1');
    });

    it('should handle invalid input', () => {
      expect(cleanRouteName('')).toBe('');
      expect(cleanRouteName(null as any)).toBe('');
      expect(cleanRouteName(undefined as any)).toBe('');
    });

    it('should handle malformed ID patterns', () => {
      expect(cleanRouteName('Route 1 (ID)')).toBe('Route 1 (ID)');
      expect(cleanRouteName('Route 1 (ID abc)')).toBe('Route 1 (ID abc)');
      expect(cleanRouteName('Route 1 (NoID 123)')).toBe('Route 1 (NoID 123)');
    });
  });

  describe('extractRouteId', () => {
    it('should extract valid route IDs', () => {
      expect(extractRouteId('Route 1 (ID 78)')).toBe(78);
      expect(extractRouteId('Viridian Forest (ID 12)')).toBe(12);
      expect(extractRouteId('Secret Garden (ID 999)')).toBe(999);
    });

    it('should handle routes without ID', () => {
      expect(extractRouteId('Route 1')).toBeUndefined();
      expect(extractRouteId('Viridian Forest')).toBeUndefined();
    });

    it('should handle malformed ID patterns', () => {
      expect(extractRouteId('Route 1 (ID)')).toBeUndefined();
      expect(extractRouteId('Route 1 (ID abc)')).toBeUndefined();
      expect(extractRouteId('Route 1 (NoID 123)')).toBeUndefined();
    });

    it('should extract first ID if multiple exist', () => {
      expect(extractRouteId('Route 1 (ID 78) (ID 99)')).toBe(78);
    });

    it('should handle different spacing', () => {
      expect(extractRouteId('Route 1 (ID  78)')).toBe(78);
      expect(extractRouteId('Route 1 (ID\t78)')).toBe(78);
      expect(extractRouteId('Route 1 ( ID 78 )')).toBeUndefined(); // Extra spaces break pattern
    });

    it('should handle invalid input', () => {
      expect(extractRouteId('')).toBeUndefined();
      expect(extractRouteId(null as any)).toBeUndefined();
      expect(extractRouteId(undefined as any)).toBeUndefined();
    });

    it('should handle edge cases', () => {
      expect(extractRouteId('Route 1 (ID 0)')).toBe(0);
      expect(extractRouteId('Route 1 (ID -1)')).toBe(-1);
      expect(extractRouteId('Route 1 (ID 12.5)')).toBe(12); // parseInt behavior
    });
  });

  describe('processRouteName', () => {
    it('should process route with ID', () => {
      const result = processRouteName('Route 1 (ID 78)');
      expect(result).toEqual({
        cleanName: 'Route 1',
        routeId: 78
      });
    });

    it('should process route without ID', () => {
      const result = processRouteName('Route 1');
      expect(result).toEqual({
        cleanName: 'Route 1'
      });
    });

    it('should handle special locations', () => {
      const result = processRouteName('Viridian Forest (ID 12)');
      expect(result).toEqual({
        cleanName: 'Viridian Forest',
        routeId: 12
      });
    });

    it('should handle empty input', () => {
      const result = processRouteName('');
      expect(result).toEqual({
        cleanName: ''
      });
    });

    it('should not include routeId property when undefined', () => {
      const result = processRouteName('Route 1');
      expect(result).not.toHaveProperty('routeId');
    });

    it('should include routeId property when defined', () => {
      const result = processRouteName('Route 1 (ID 78)');
      expect(result).toHaveProperty('routeId');
      expect(result.routeId).toBe(78);
    });

    it('should handle complex route names', () => {
      const result = processRouteName('Route 22 - Victory Road (ID 156)');
      expect(result.cleanName).toBe('Route 22 - Victory Road');
      expect(result.routeId).toBe(156);
    });
  });
}); 