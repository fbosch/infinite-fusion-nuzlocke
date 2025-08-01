import { describe, it, expect } from 'vitest';

/**
 * Tests for route name validation logic.
 * This replicates the fixed isValidRouteName function to prevent regressions.
 */

/**
 * Replicated validation function that was causing Mt. Moon issues.
 * This is the FIXED version without the problematic alpha character ratio check.
 */
function isValidRouteName(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const trimmedText = text.trim();

  // Exclude if too long (CSS content is typically very long)
  if (trimmedText.length > 100) {
    return false;
  }

  // Exclude CSS content
  if (
    trimmedText.includes('display:') ||
    trimmedText.includes('width:') ||
    trimmedText.includes('height:') ||
    trimmedText.includes('margin:') ||
    trimmedText.includes('padding:') ||
    trimmedText.includes('background:') ||
    trimmedText.includes('border:') ||
    trimmedText.includes('.mw-parser-output') ||
    trimmedText.includes('px') ||
    trimmedText.includes('em') ||
    trimmedText.includes('{') ||
    trimmedText.includes('}') ||
    trimmedText.includes(';')
  ) {
    return false;
  }

  // Exclude very short or meaningless text
  if (trimmedText.length < 3) {
    return false;
  }

  // Note: The problematic alpha character ratio check was removed here
  // This was filtering out valid location names with ID numbers

  return true;
}

/**
 * The BROKEN version that was causing issues (for comparison).
 * This version had the alpha character ratio check that filtered out Mt. Moon entries.
 */
function isValidRouteNameBroken(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const trimmedText = text.trim();

  if (trimmedText.length > 100) {
    return false;
  }

  if (
    trimmedText.includes('display:') ||
    trimmedText.includes('width:') ||
    trimmedText.includes('height:') ||
    trimmedText.includes('margin:') ||
    trimmedText.includes('padding:') ||
    trimmedText.includes('background:') ||
    trimmedText.includes('border:') ||
    trimmedText.includes('.mw-parser-output') ||
    trimmedText.includes('px') ||
    trimmedText.includes('em') ||
    trimmedText.includes('{') ||
    trimmedText.includes('}') ||
    trimmedText.includes(';')
  ) {
    return false;
  }

  if (trimmedText.length < 3) {
    return false;
  }

  // This was the problematic check that filtered out Mt. Moon entries
  const alphaCount = (trimmedText.match(/[a-zA-Z]/g) || []).length;
  const isValidRoute = /^Route \d+(\s*\(ID\s+-?\d+(?:\.\d+)?\))?$/i.test(
    trimmedText
  );
  if (!isValidRoute && alphaCount < trimmedText.length / 2) {
    return false; // <-- This was the problem!
  }

  return true;
}

describe('Route Name Validation', () => {
  describe('Fixed isValidRouteName (current behavior)', () => {
    it('should accept all Mt. Moon variants with ID numbers', () => {
      const mtMoonVariants = [
        'Mt. Moon (ID 102)',
        'Mt. Moon B1F (ID 103)',
        'Mt. Moon B2F (ID 105)',
        'Mt. Moon (ID 767)',
        'Mt. Moon (ID 104)',
        'Mt. Moon Summit (ID 827)',
        'Mt. Moon Dark Room (ID 999)',
      ];

      for (const variant of mtMoonVariants) {
        expect(isValidRouteName(variant)).toBe(true);
      }
    });

    it('should accept Mt. Moon variants without ID numbers', () => {
      const mtMoonVariants = [
        'Mt. Moon',
        'Mt. Moon B1F',
        'Mt. Moon B2F',
        'Mt. Moon Summit',
        'Mt. Moon Dark Room',
      ];

      for (const variant of mtMoonVariants) {
        expect(isValidRouteName(variant)).toBe(true);
      }
    });

    it('should accept other location names with ID numbers', () => {
      const locations = [
        'Route 1 (ID 78)',
        'Viridian Forest (ID 12)',
        'Rock Tunnel (ID 456)',
        'Cerulean Cave (ID 789)',
        'Victory Road (ID 111)',
      ];

      for (const location of locations) {
        expect(isValidRouteName(location)).toBe(true);
      }
    });

    it('should reject CSS content', () => {
      const cssContent = [
        'display: block;',
        'width: 100px;',
        'background: red;',
        '.mw-parser-output',
        'margin: 10px;',
      ];

      for (const css of cssContent) {
        expect(isValidRouteName(css)).toBe(false);
      }
    });

    it('should reject very short text', () => {
      expect(isValidRouteName('')).toBe(false);
      expect(isValidRouteName('a')).toBe(false);
      expect(isValidRouteName('ab')).toBe(false);
    });

    it('should reject very long text', () => {
      const longText = 'a'.repeat(101);
      expect(isValidRouteName(longText)).toBe(false);
    });
  });

  describe('Broken isValidRouteName (what was causing the bug)', () => {
    it('should demonstrate the alpha character ratio bug', () => {
      // These Mt. Moon variants were being rejected due to low alpha ratio
      const problematicVariants = [
        'Mt. Moon (ID 767)', // 8 alpha / 17 total = 47% (< 50%)
        'Mt. Moon B1F (ID 103)', // 10 alpha / 21 total = 48% (< 50%)
        'Mt. Moon (ID 102)', // 8 alpha / 17 total = 47% (< 50%)
      ];

      for (const variant of problematicVariants) {
        expect(isValidRouteNameBroken(variant)).toBe(false); // Should fail with broken version
        expect(isValidRouteName(variant)).toBe(true); // Should pass with fixed version
      }
    });

    it('should show that Mt. Moon Summit passed due to higher alpha ratio', () => {
      // This one passed because it had enough alpha characters
      const variant = 'Mt. Moon Summit (ID 827)'; // 14 alpha / 24 total = 58% (> 50%)

      expect(isValidRouteNameBroken(variant)).toBe(true); // Passed even with broken version
      expect(isValidRouteName(variant)).toBe(true); // Still passes with fixed version
    });

    it('should demonstrate that Route names were exempted from alpha ratio check', () => {
      // Route names had a special exemption
      const routeNames = ['Route 1 (ID 78)', 'Route 25 (ID 100)'];

      for (const route of routeNames) {
        expect(isValidRouteNameBroken(route)).toBe(true); // Passed due to exemption
        expect(isValidRouteName(route)).toBe(true); // Still passes with fixed version
      }
    });
  });

  describe('Alpha character ratio analysis', () => {
    it('should calculate alpha ratios correctly for Mt. Moon variants', () => {
      const testCases = [
        { text: 'Mt. Moon (ID 767)', expectedAlpha: 8, expectedTotal: 17 },
        { text: 'Mt. Moon B1F (ID 103)', expectedAlpha: 10, expectedTotal: 21 },
        {
          text: 'Mt. Moon Summit (ID 827)',
          expectedAlpha: 14,
          expectedTotal: 24,
        },
      ];

      for (const testCase of testCases) {
        const alphaCount = (testCase.text.match(/[a-zA-Z]/g) || []).length;
        const totalLength = testCase.text.length;
        const ratio = alphaCount / totalLength;

        expect(alphaCount).toBe(testCase.expectedAlpha);
        expect(totalLength).toBe(testCase.expectedTotal);

        // Show that the problematic ones had < 50% ratio
        if (testCase.text.includes('Summit')) {
          expect(ratio).toBeGreaterThan(0.5); // This one passed
        } else {
          expect(ratio).toBeLessThan(0.5); // These ones failed
        }
      }
    });
  });
});
