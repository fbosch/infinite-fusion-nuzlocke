import { describe, it, expect } from 'vitest';
import { formatArtistCredits } from './formatCredits';

describe('formatArtistCredits', () => {
  describe('empty and invalid input', () => {
    it('should return "Unknown artist" for null input', () => {
      expect(formatArtistCredits(null)).toBe('Unknown artist');
    });

    it('should return "Unknown artist" for undefined input', () => {
      expect(formatArtistCredits(undefined)).toBe('Unknown artist');
    });

    it('should return "Unknown artist" for empty array', () => {
      expect(formatArtistCredits([])).toBe('Unknown artist');
    });

    it('should return "Unknown artist" for array with only empty strings', () => {
      expect(formatArtistCredits(['', '   ', '\t'])).toBe('Unknown artist');
    });

    it('should return "Unknown artist" for array with only whitespace strings', () => {
      expect(formatArtistCredits(['   ', '\n', '\t'])).toBe('Unknown artist');
    });
  });

  describe('single artist', () => {
    it('should return single artist name', () => {
      expect(formatArtistCredits(['GameFreak'])).toBe('GameFreak');
    });

    it('should trim whitespace from single artist', () => {
      expect(formatArtistCredits(['  GameFreak  '])).toBe('GameFreak');
    });
  });

  describe('two artists', () => {
    it('should join two artists with "and"', () => {
      expect(formatArtistCredits(['GameFreak', 'Artist'])).toBe(
        'GameFreak and Artist'
      );
    });

    it('should trim whitespace from both artists', () => {
      expect(formatArtistCredits(['  GameFreak  ', '  Artist  '])).toBe(
        'GameFreak and Artist'
      );
    });

    it('should handle artists with mixed whitespace', () => {
      expect(formatArtistCredits(['GameFreak', '  Artist  '])).toBe(
        'GameFreak and Artist'
      );
    });
  });

  describe('three or more artists', () => {
    it('should format three artists with commas and "and"', () => {
      expect(formatArtistCredits(['GameFreak', 'Artist1', 'Artist2'])).toBe(
        'GameFreak, Artist1 and Artist2'
      );
    });

    it('should format four artists with commas and "and"', () => {
      expect(
        formatArtistCredits(['GameFreak', 'Artist1', 'Artist2', 'Artist3'])
      ).toBe('GameFreak, Artist1, Artist2 and Artist3');
    });

    it('should format five artists with commas and "and"', () => {
      expect(
        formatArtistCredits([
          'GameFreak',
          'Artist1',
          'Artist2',
          'Artist3',
          'Artist4',
        ])
      ).toBe('GameFreak, Artist1, Artist2, Artist3 and Artist4');
    });

    it('should trim whitespace from all artists', () => {
      expect(
        formatArtistCredits(['  GameFreak  ', '  Artist1  ', '  Artist2  '])
      ).toBe('GameFreak, Artist1 and Artist2');
    });
  });

  describe('mixed valid and invalid input', () => {
    it('should filter out empty strings and format valid artists', () => {
      expect(
        formatArtistCredits(['GameFreak', '', 'Artist1', '   ', 'Artist2'])
      ).toBe('GameFreak, Artist1 and Artist2');
    });

    it('should filter out whitespace-only strings and format valid artists', () => {
      expect(
        formatArtistCredits(['GameFreak', '   ', 'Artist1', '\t', 'Artist2'])
      ).toBe('GameFreak, Artist1 and Artist2');
    });

    it('should handle array with only one valid artist after filtering', () => {
      expect(formatArtistCredits(['', 'GameFreak', '   '])).toBe('GameFreak');
    });

    it('should handle array with only two valid artists after filtering', () => {
      expect(formatArtistCredits(['', 'GameFreak', '   ', 'Artist', ''])).toBe(
        'GameFreak and Artist'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle very long artist names', () => {
      const longName = 'A'.repeat(1000);
      expect(formatArtistCredits([longName])).toBe(longName);
    });

    it('should handle special characters in artist names', () => {
      expect(
        formatArtistCredits(['GameFreak & Co.', 'Artist-Name', 'Artist_Name'])
      ).toBe('GameFreak & Co., Artist-Name and Artist_Name');
    });

    it('should handle unicode characters in artist names', () => {
      expect(formatArtistCredits(['José', 'François', 'Björk'])).toBe(
        'José, François and Björk'
      );
    });
  });
});
