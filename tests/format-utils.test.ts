import { describe, it, expect } from 'vitest';
import {
  formatFileSize,
  formatDuration,
  formatNumber,
  formatPercentage,
  truncateText,
  padString,
} from '../scripts/utils/format-utils';

describe('Format Utilities', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2048)).toBe('2.0 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
      expect(formatFileSize(1024 * 1024 * 2.7)).toBe('2.7 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
      expect(formatFileSize(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB');
    });

    it('should format terabytes correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1.0 TB');
      expect(formatFileSize(1024 * 1024 * 1024 * 1024 * 5.2)).toBe('5.2 TB');
    });

    it('should handle invalid input', () => {
      expect(formatFileSize(-1)).toBe('0 B');
      expect(formatFileSize(NaN)).toBe('0 B');
      expect(formatFileSize(null as any)).toBe('0 B');
      expect(formatFileSize(undefined as any)).toBe('0 B');
      expect(formatFileSize('string' as any)).toBe('0 B');
    });

    it('should handle very large numbers', () => {
      const veryLarge = 1024 * 1024 * 1024 * 1024 * 1000; // 1000 TB
      expect(formatFileSize(veryLarge)).toContain('TB'); // Should cap at TB
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds correctly', () => {
      expect(formatDuration(0)).toBe('0ms');
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(999)).toBe('999ms');
    });

    it('should format seconds correctly', () => {
      expect(formatDuration(1000)).toBe('1.0s');
      expect(formatDuration(1500)).toBe('1.5s');
      expect(formatDuration(30000)).toBe('30.0s');
      expect(formatDuration(59999)).toBe('60.0s');
    });

    it('should format minutes correctly', () => {
      expect(formatDuration(60000)).toBe('1m');
      expect(formatDuration(90000)).toBe('1m 30s');
      expect(formatDuration(120000)).toBe('2m');
      expect(formatDuration(125000)).toBe('2m 5s');
    });

    it('should format hours correctly', () => {
      expect(formatDuration(3600000)).toBe('1h'); // 1 hour
      expect(formatDuration(3660000)).toBe('1h 1m'); // 1h 1m
      expect(formatDuration(3665000)).toBe('1h 1m 5s'); // 1h 1m 5s
      expect(formatDuration(7200000)).toBe('2h'); // 2 hours
    });

    it('should handle edge cases', () => {
      expect(formatDuration(3600000 + 5000)).toBe('1h 5s'); // 1h 0m 5s -> 1h 5s
      expect(formatDuration(3600000 + 60000)).toBe('1h 1m'); // 1h 1m 0s -> 1h 1m
    });

    it('should handle invalid input', () => {
      expect(formatDuration(-1)).toBe('0ms');
      expect(formatDuration(NaN)).toBe('0ms');
      expect(formatDuration(null as any)).toBe('0ms');
      expect(formatDuration(undefined as any)).toBe('0ms');
      expect(formatDuration('string' as any)).toBe('0ms');
    });

    it('should round milliseconds', () => {
      expect(formatDuration(999.6)).toBe('1000ms');
      expect(formatDuration(999.4)).toBe('999ms');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1234567)).toBe('1,234,567');
      expect(formatNumber(1000000)).toBe('1,000,000');
    });

    it('should handle small numbers', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(123)).toBe('123');
      expect(formatNumber(999)).toBe('999');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-1000)).toBe('-1,000');
      expect(formatNumber(-1234567)).toBe('-1,234,567');
    });

    it('should handle decimal numbers', () => {
      expect(formatNumber(1000.5)).toBe('1,000.5');
      expect(formatNumber(1234567.89)).toBe('1,234,567.89');
    });

    it('should handle invalid input', () => {
      expect(formatNumber(NaN)).toBe('0');
      expect(formatNumber(null as any)).toBe('0');
      expect(formatNumber(undefined as any)).toBe('0');
      expect(formatNumber('string' as any)).toBe('0');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentages with default decimals', () => {
      expect(formatPercentage(50)).toBe('50.0%');
      expect(formatPercentage(33.333)).toBe('33.3%');
      expect(formatPercentage(0)).toBe('0.0%');
      expect(formatPercentage(100)).toBe('100.0%');
    });

    it('should respect custom decimal places', () => {
      expect(formatPercentage(33.33333, 0)).toBe('33%');
      expect(formatPercentage(33.33333, 2)).toBe('33.33%');
      expect(formatPercentage(33.33333, 3)).toBe('33.333%');
    });

    it('should handle edge cases', () => {
      expect(formatPercentage(0.1, 1)).toBe('0.1%');
      expect(formatPercentage(99.999, 2)).toBe('100.00%');
    });

    it('should handle invalid input', () => {
      expect(formatPercentage(NaN)).toBe('0%');
      expect(formatPercentage(null as any)).toBe('0%');
      expect(formatPercentage(undefined as any)).toBe('0%');
      expect(formatPercentage('string' as any)).toBe('0%');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      expect(truncateText('This is a long text', 10)).toBe('This is...');
      expect(truncateText('Hello World', 8)).toBe('Hello...');
    });

    it('should not truncate short text', () => {
      expect(truncateText('Short', 10)).toBe('Short');
      expect(truncateText('Exactly10!', 10)).toBe('Exactly10!');
    });

    it('should handle edge cases', () => {
      expect(truncateText('ABC', 3)).toBe('ABC');
      expect(truncateText('ABCD', 3)).toBe('...');
      expect(truncateText('ABCDE', 4)).toBe('A...');
    });

    it('should handle invalid input', () => {
      expect(truncateText(null as any, 10)).toBe('');
      expect(truncateText(undefined as any, 10)).toBe('');
      expect(truncateText(123 as any, 10)).toBe('123');
    });

    it('should handle empty string', () => {
      expect(truncateText('', 10)).toBe('');
    });
  });

  describe('padString', () => {
    it('should pad strings to the left by default', () => {
      expect(padString('test', 10)).toBe('test      ');
      expect(padString('hi', 5)).toBe('hi   ');
    });

    it('should pad strings to the right', () => {
      expect(padString('test', 10, 'right')).toBe('      test');
      expect(padString('hi', 5, 'right')).toBe('   hi');
    });

    it('should pad strings to the center', () => {
      expect(padString('test', 10, 'center')).toBe('   test   ');
      expect(padString('hi', 6, 'center')).toBe('  hi  ');
      expect(padString('odd', 8, 'center')).toBe('  odd   '); // Uneven padding favors right
    });

    it('should not pad strings that are already long enough', () => {
      expect(padString('already long', 5)).toBe('already long');
      expect(padString('exact', 5)).toBe('exact');
    });

    it('should handle non-string input', () => {
      expect(padString(123 as any, 5)).toBe('123  ');
      expect(padString(null as any, 5)).toBe('null ');
    });

    it('should handle edge cases', () => {
      expect(padString('', 3)).toBe('   ');
      expect(padString('a', 1)).toBe('a');
      expect(padString('test', 0)).toBe('test');
    });

    it('should handle invalid alignment', () => {
      expect(padString('test', 10, 'invalid' as any)).toBe('test      '); // Falls back to left
    });
  });
});
