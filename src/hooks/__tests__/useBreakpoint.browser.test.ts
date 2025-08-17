import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useBreakpoint,
  useBreakpointAtLeast,
  useBreakpointSmallerThan,
  useBreakpointBetween,
} from '@/hooks/useBreakpoint';

describe('useBreakpoint Browser Tests', () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    // Store original window width
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    // Restore original window width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    // Trigger resize event to update the hook
    window.dispatchEvent(new Event('resize'));
  });

  const setWindowWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    // Trigger resize event to update the hook
    window.dispatchEvent(new Event('resize'));
  };

  describe('useBreakpoint', () => {
    it('should return correct breakpoint for different window widths', () => {
      // Test mobile width (below sm)
      setWindowWidth(375);
      const { result: result1 } = renderHook(() => useBreakpoint());
      expect(result1.current).toBe('sm');

      // Test sm breakpoint
      setWindowWidth(640);
      const { result: result2 } = renderHook(() => useBreakpoint());
      expect(result2.current).toBe('sm');

      // Test md breakpoint
      setWindowWidth(768);
      const { result: result3 } = renderHook(() => useBreakpoint());
      expect(result3.current).toBe('md');

      // Test lg breakpoint
      setWindowWidth(1024);
      const { result: result4 } = renderHook(() => useBreakpoint());
      expect(result4.current).toBe('lg');

      // Test xl breakpoint
      setWindowWidth(1280);
      const { result: result5 } = renderHook(() => useBreakpoint());
      expect(result5.current).toBe('xl');

      // Test 2xl breakpoint
      setWindowWidth(1536);
      const { result: result6 } = renderHook(() => useBreakpoint());
      expect(result6.current).toBe('2xl');

      // Test above 2xl
      setWindowWidth(1920);
      const { result: result7 } = renderHook(() => useBreakpoint());
      expect(result7.current).toBe('2xl');
    });

    it('should update breakpoint when window is resized', async () => {
      setWindowWidth(375);
      const { result, rerender } = renderHook(() => useBreakpoint());
      expect(result.current).toBe('sm');

      // Resize to md
      setWindowWidth(768);
      rerender();
      expect(result.current).toBe('md');

      // Resize to lg
      setWindowWidth(1024);
      rerender();
      expect(result.current).toBe('lg');
    });
  });

  describe('useBreakpointAtLeast', () => {
    it('should return true for breakpoints at or above the specified breakpoint', () => {
      // Test with sm breakpoint
      setWindowWidth(640);
      const { result: result1 } = renderHook(() => useBreakpointAtLeast('sm'));
      expect(result1.current).toBe(true);

      // Test with md breakpoint
      setWindowWidth(768);
      const { result: result2 } = renderHook(() => useBreakpointAtLeast('md'));
      expect(result2.current).toBe(true);

      // Test with lg breakpoint
      setWindowWidth(1024);
      const { result: result3 } = renderHook(() => useBreakpointAtLeast('lg'));
      expect(result3.current).toBe(true);

      // Test with xl breakpoint
      setWindowWidth(1280);
      const { result: result4 } = renderHook(() => useBreakpointAtLeast('xl'));
      expect(result4.current).toBe(true);

      // Test with 2xl breakpoint
      setWindowWidth(1536);
      const { result: result5 } = renderHook(() => useBreakpointAtLeast('2xl'));
      expect(result5.current).toBe(true);
    });

    it('should return false for breakpoints below the specified breakpoint', () => {
      // Test mobile width
      setWindowWidth(375);
      const { result: result1 } = renderHook(() => useBreakpointAtLeast('md'));
      expect(result1.current).toBe(false);

      // Test sm width
      setWindowWidth(640);
      const { result: result2 } = renderHook(() => useBreakpointAtLeast('md'));
      expect(result2.current).toBe(false);

      // Test md width
      setWindowWidth(768);
      const { result: result3 } = renderHook(() => useBreakpointAtLeast('lg'));
      expect(result3.current).toBe(false);
    });

    it('should update when window is resized', async () => {
      setWindowWidth(375);
      const { result, rerender } = renderHook(() => useBreakpointAtLeast('md'));
      expect(result.current).toBe(false);

      // Resize to md
      setWindowWidth(768);
      rerender();
      expect(result.current).toBe(true);

      // Resize to lg
      setWindowWidth(1024);
      rerender();
      expect(result.current).toBe(true);
    });
  });

  describe('useBreakpointSmallerThan', () => {
    it('should return true for breakpoints smaller than the specified breakpoint', () => {
      // Test mobile width
      setWindowWidth(375);
      const { result: result1 } = renderHook(() =>
        useBreakpointSmallerThan('md')
      );
      expect(result1.current).toBe(true);

      // Test sm width
      setWindowWidth(640);
      const { result: result2 } = renderHook(() =>
        useBreakpointSmallerThan('md')
      );
      expect(result2.current).toBe(true);

      // Test md width
      setWindowWidth(768);
      const { result: result3 } = renderHook(() =>
        useBreakpointSmallerThan('lg')
      );
      expect(result3.current).toBe(true);
    });

    it('should return false for breakpoints at or above the specified breakpoint', () => {
      // Test md width
      setWindowWidth(768);
      const { result: result1 } = renderHook(() =>
        useBreakpointSmallerThan('md')
      );
      expect(result1.current).toBe(false);

      // Test lg width
      setWindowWidth(1024);
      const { result: result2 } = renderHook(() =>
        useBreakpointSmallerThan('lg')
      );
      expect(result2.current).toBe(false);

      // Test xl width
      setWindowWidth(1280);
      const { result: result3 } = renderHook(() =>
        useBreakpointSmallerThan('xl')
      );
      expect(result3.current).toBe(false);
    });
  });

  describe('useBreakpointBetween', () => {
    it('should return true for breakpoints within the specified range', () => {
      // Test md width
      setWindowWidth(768);
      const { result: result1 } = renderHook(() =>
        useBreakpointBetween('md', 'xl')
      );
      expect(result1.current).toBe(true);

      // Test lg width
      setWindowWidth(1024);
      const { result: result2 } = renderHook(() =>
        useBreakpointBetween('md', 'xl')
      );
      expect(result2.current).toBe(true);

      // Test xl width
      setWindowWidth(1280);
      const { result: result3 } = renderHook(() =>
        useBreakpointBetween('md', 'xl')
      );
      expect(result3.current).toBe(true);
    });

    it('should return false for breakpoints outside the specified range', () => {
      // Test sm width (below range)
      setWindowWidth(640);
      const { result: result1 } = renderHook(() =>
        useBreakpointBetween('md', 'xl')
      );
      expect(result1.current).toBe(false);

      // Test 2xl width (above range)
      setWindowWidth(1536);
      const { result: result2 } = renderHook(() =>
        useBreakpointBetween('md', 'xl')
      );
      expect(result2.current).toBe(false);
    });

    it('should handle edge cases correctly', () => {
      // Test exact minimum boundary
      setWindowWidth(768);
      const { result: result1 } = renderHook(() =>
        useBreakpointBetween('md', 'xl')
      );
      expect(result1.current).toBe(true);

      // Test exact maximum boundary
      setWindowWidth(1280);
      const { result: result2 } = renderHook(() =>
        useBreakpointBetween('md', 'xl')
      );
      expect(result2.current).toBe(true);
    });
  });
});
