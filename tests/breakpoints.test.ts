import { describe, it, expect } from 'vitest';
import {
  breakpoints,
  getBreakpoint,
  createBreakpointQuery,
  createBreakpointSmallerThanQuery,
  createBreakpointBetweenQuery,
  type Breakpoint,
} from '@/utils/breakpoints';

describe('Breakpoint Utilities', () => {
  describe('breakpoints', () => {
    it('should have correct Tailwind CSS v4 default values', () => {
      expect(breakpoints).toEqual({
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280,
        '2xl': 1536,
      });
    });

    it('should export Breakpoint type', () => {
      // This is a type test - if it compiles, the type is exported correctly
      const testBreakpoint: Breakpoint = 'md';
      expect(testBreakpoint).toBe('md');
    });
  });

  describe('getBreakpoint', () => {
    it('should return correct breakpoint for different widths', () => {
      expect(getBreakpoint(375)).toBe('sm'); // Mobile
      expect(getBreakpoint(640)).toBe('sm'); // sm breakpoint
      expect(getBreakpoint(768)).toBe('md'); // md breakpoint
      expect(getBreakpoint(1024)).toBe('lg'); // lg breakpoint
      expect(getBreakpoint(1280)).toBe('xl'); // xl breakpoint
      expect(getBreakpoint(1536)).toBe('2xl'); // 2xl breakpoint
      expect(getBreakpoint(1920)).toBe('2xl'); // Above 2xl
    });

    it('should handle edge cases correctly', () => {
      expect(getBreakpoint(0)).toBe('sm'); // Minimum width
      expect(getBreakpoint(639)).toBe('sm'); // Just below sm
      expect(getBreakpoint(640)).toBe('sm'); // Exactly sm
      expect(getBreakpoint(641)).toBe('sm'); // Just above sm
      expect(getBreakpoint(767)).toBe('sm'); // Just below md
      expect(getBreakpoint(768)).toBe('md'); // Exactly md
      expect(getBreakpoint(769)).toBe('md'); // Just above md
    });
  });

  describe('createBreakpointQuery', () => {
    it('should create correct min-width media queries', () => {
      expect(createBreakpointQuery('sm')).toBe('(min-width: 640px)');
      expect(createBreakpointQuery('md')).toBe('(min-width: 768px)');
      expect(createBreakpointQuery('lg')).toBe('(min-width: 1024px)');
      expect(createBreakpointQuery('xl')).toBe('(min-width: 1280px)');
      expect(createBreakpointQuery('2xl')).toBe('(min-width: 1536px)');
    });
  });

  describe('createBreakpointSmallerThanQuery', () => {
    it('should create correct max-width media queries', () => {
      expect(createBreakpointSmallerThanQuery('sm')).toBe('(max-width: 639px)');
      expect(createBreakpointSmallerThanQuery('md')).toBe('(max-width: 767px)');
      expect(createBreakpointSmallerThanQuery('lg')).toBe(
        '(max-width: 1023px)'
      );
      expect(createBreakpointSmallerThanQuery('xl')).toBe(
        '(max-width: 1279px)'
      );
      expect(createBreakpointSmallerThanQuery('2xl')).toBe(
        '(max-width: 1535px)'
      );
    });
  });

  describe('createBreakpointBetweenQuery', () => {
    it('should create correct range media queries', () => {
      expect(createBreakpointBetweenQuery('md', 'xl')).toBe(
        '(min-width: 768px) and (max-width: 1280px)'
      );
      expect(createBreakpointBetweenQuery('sm', 'lg')).toBe(
        '(min-width: 640px) and (max-width: 1024px)'
      );
      expect(createBreakpointBetweenQuery('lg', '2xl')).toBe(
        '(min-width: 1024px) and (max-width: 1536px)'
      );
    });

    it('should handle same min and max breakpoints', () => {
      expect(createBreakpointBetweenQuery('md', 'md')).toBe(
        '(min-width: 768px) and (max-width: 768px)'
      );
    });
  });
});
