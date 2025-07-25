import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useKeyPressed,
  useShiftKey,
  useControlKey,
  useAltKey,
} from '../useKeyPressed';

// Mock the DOM events
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

// Store original methods
const originalAddEventListener = document.addEventListener;
const originalRemoveEventListener = document.removeEventListener;
const originalWindowAddEventListener = window.addEventListener;
const originalWindowRemoveEventListener = window.removeEventListener;

beforeEach(() => {
  // Mock document event listeners
  document.addEventListener = mockAddEventListener;
  document.removeEventListener = mockRemoveEventListener;

  // Mock window event listeners
  window.addEventListener = vi.fn();
  window.removeEventListener = vi.fn();

  // Clear all mocks
  vi.clearAllMocks();
});

afterEach(() => {
  // Restore original methods
  document.addEventListener = originalAddEventListener;
  document.removeEventListener = originalRemoveEventListener;
  window.addEventListener = originalWindowAddEventListener;
  window.removeEventListener = originalWindowRemoveEventListener;
});

describe('useKeyPressed', () => {
  it('should return false initially for any key', () => {
    const { result: shiftResult } = renderHook(() => useKeyPressed('Shift'));
    const { result: ctrlResult } = renderHook(() => useKeyPressed('Control'));
    const { result: enterResult } = renderHook(() => useKeyPressed('Enter'));

    expect(shiftResult.current).toBe(false);
    expect(ctrlResult.current).toBe(false);
    expect(enterResult.current).toBe(false);
  });

  it('should add event listeners when first hook is mounted', () => {
    renderHook(() => useKeyPressed('Shift'));

    expect(mockAddEventListener).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );
    expect(mockAddEventListener).toHaveBeenCalledWith(
      'keyup',
      expect.any(Function)
    );
    expect(window.addEventListener).toHaveBeenCalledWith(
      'blur',
      expect.any(Function)
    );
  });

  it('should not add duplicate event listeners for multiple keys', () => {
    const { unmount: unmount1 } = renderHook(() => useKeyPressed('Shift'));
    const { unmount: unmount2 } = renderHook(() => useKeyPressed('Control'));
    const { unmount: unmount3 } = renderHook(() => useKeyPressed('Alt'));

    // Should only be called once despite multiple hooks for different keys
    expect(mockAddEventListener).toHaveBeenCalledTimes(2); // keydown, keyup
    expect(window.addEventListener).toHaveBeenCalledTimes(1); // blur

    unmount1();
    unmount2();
    unmount3();
  });

  it('should remove event listeners when last hook is unmounted', () => {
    const { unmount: unmount1 } = renderHook(() => useKeyPressed('Shift'));
    const { unmount: unmount2 } = renderHook(() => useKeyPressed('Control'));

    // Unmount first hook - listeners should remain
    unmount1();
    expect(mockRemoveEventListener).not.toHaveBeenCalled();

    // Unmount last hook - listeners should be removed
    unmount2();
    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );
    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      'keyup',
      expect.any(Function)
    );
    expect(window.removeEventListener).toHaveBeenCalledWith(
      'blur',
      expect.any(Function)
    );
  });

  it('should update state for specific keys independently', () => {
    const { result: shiftResult } = renderHook(() => useKeyPressed('Shift'));
    const { result: ctrlResult } = renderHook(() => useKeyPressed('Control'));

    // Get the keydown and keyup handlers
    const keydownHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'keydown'
    )?.[1];

    const keyupHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'keyup'
    )?.[1];

    expect(keydownHandler).toBeDefined();
    expect(keyupHandler).toBeDefined();

    // Initially both false
    expect(shiftResult.current).toBe(false);
    expect(ctrlResult.current).toBe(false);

    // Simulate shift key down
    act(() => {
      keydownHandler({ key: 'Shift' });
    });

    expect(shiftResult.current).toBe(true);
    expect(ctrlResult.current).toBe(false); // Control should remain false

    // Simulate control key down
    act(() => {
      keydownHandler({ key: 'Control' });
    });

    expect(shiftResult.current).toBe(true); // Shift should remain true
    expect(ctrlResult.current).toBe(true);

    // Simulate shift key up
    act(() => {
      keyupHandler({ key: 'Shift' });
    });

    expect(shiftResult.current).toBe(false);
    expect(ctrlResult.current).toBe(true); // Control should remain true
  });

  it('should handle multiple subscriptions to the same key', () => {
    const { result: shift1 } = renderHook(() => useKeyPressed('Shift'));
    const { result: shift2 } = renderHook(() => useKeyPressed('Shift'));

    const keydownHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'keydown'
    )?.[1];

    // Both should start false
    expect(shift1.current).toBe(false);
    expect(shift2.current).toBe(false);

    // Press shift
    act(() => {
      keydownHandler({ key: 'Shift' });
    });

    // Both should update to true
    expect(shift1.current).toBe(true);
    expect(shift2.current).toBe(true);
  });

  it('should reset all keys on window blur', () => {
    const { result: shiftResult } = renderHook(() => useKeyPressed('Shift'));
    const { result: ctrlResult } = renderHook(() => useKeyPressed('Control'));

    const keydownHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'keydown'
    )?.[1];

    const windowAddEventListenerMock = window.addEventListener as ReturnType<
      typeof vi.fn
    >;
    const blurHandler = windowAddEventListenerMock.mock.calls.find(
      call => call[0] === 'blur'
    )?.[1];

    // Press both keys
    act(() => {
      keydownHandler({ key: 'Shift' });
      keydownHandler({ key: 'Control' });
    });

    expect(shiftResult.current).toBe(true);
    expect(ctrlResult.current).toBe(true);

    // Simulate window blur
    act(() => {
      blurHandler();
    });

    expect(shiftResult.current).toBe(false);
    expect(ctrlResult.current).toBe(false);
  });

  it('should handle letter keys and special keys', () => {
    const { result: aResult } = renderHook(() => useKeyPressed('a'));
    const { result: enterResult } = renderHook(() => useKeyPressed('Enter'));
    const { result: spaceResult } = renderHook(() => useKeyPressed(' '));

    const keydownHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'keydown'
    )?.[1];

    // Test letter key
    act(() => {
      keydownHandler({ key: 'a' });
    });

    expect(aResult.current).toBe(true);
    expect(enterResult.current).toBe(false);
    expect(spaceResult.current).toBe(false);

    // Test Enter key
    act(() => {
      keydownHandler({ key: 'Enter' });
    });

    expect(aResult.current).toBe(true);
    expect(enterResult.current).toBe(true);
    expect(spaceResult.current).toBe(false);

    // Test space key
    act(() => {
      keydownHandler({ key: ' ' });
    });

    expect(aResult.current).toBe(true);
    expect(enterResult.current).toBe(true);
    expect(spaceResult.current).toBe(true);
  });
});

describe('Convenience hooks', () => {
  it('useShiftKey should work correctly', () => {
    const { result } = renderHook(() => useShiftKey());

    const keydownHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'keydown'
    )?.[1];

    expect(result.current).toBe(false);

    act(() => {
      keydownHandler({ key: 'Shift' });
    });

    expect(result.current).toBe(true);
  });

  it('useControlKey should work correctly', () => {
    const { result } = renderHook(() => useControlKey());

    const keydownHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'keydown'
    )?.[1];

    expect(result.current).toBe(false);

    act(() => {
      keydownHandler({ key: 'Control' });
    });

    expect(result.current).toBe(true);
  });

  it('useAltKey should work correctly', () => {
    const { result } = renderHook(() => useAltKey());

    const keydownHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'keydown'
    )?.[1];

    expect(result.current).toBe(false);

    act(() => {
      keydownHandler({ key: 'Alt' });
    });

    expect(result.current).toBe(true);
  });
});
