import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useKeyPressed,
  useShiftKey,
  useControlKey,
  useAltKey,
} from '../useKeyPressed';

// Helper functions to simulate real keyboard events
function dispatchKeyDown(key: string) {
  const event = new KeyboardEvent('keydown', { key });
  document.dispatchEvent(event);
}

function dispatchKeyUp(key: string) {
  const event = new KeyboardEvent('keyup', { key });
  document.dispatchEvent(event);
}

function dispatchWindowBlur() {
  const event = new Event('blur');
  window.dispatchEvent(event);
}

beforeEach(() => {
  // Reset any pressed keys before each test
  act(() => {
    dispatchWindowBlur();
  });
});

describe('useKeyPressed', () => {
  it('should return false initially for any key', () => {
    const { result: shiftResult } = renderHook(() => useKeyPressed('Shift'));
    const { result: ctrlResult } = renderHook(() => useKeyPressed('Control'));
    const { result: enterResult } = renderHook(() => useKeyPressed('Enter'));
    const { result: aResult } = renderHook(() => useKeyPressed('a'));

    expect(shiftResult.current).toBe(false);
    expect(ctrlResult.current).toBe(false);
    expect(enterResult.current).toBe(false);
    expect(aResult.current).toBe(false);
  });

  it('should update state when keys are pressed and released', () => {
    const { result: shiftResult } = renderHook(() => useKeyPressed('Shift'));
    const { result: ctrlResult } = renderHook(() => useKeyPressed('Control'));

    // Initially both false
    expect(shiftResult.current).toBe(false);
    expect(ctrlResult.current).toBe(false);

    // Press Shift
    act(() => {
      dispatchKeyDown('Shift');
    });

    expect(shiftResult.current).toBe(true);
    expect(ctrlResult.current).toBe(false);

    // Press Control
    act(() => {
      dispatchKeyDown('Control');
    });

    expect(shiftResult.current).toBe(true);
    expect(ctrlResult.current).toBe(true);

    // Release Shift
    act(() => {
      dispatchKeyUp('Shift');
    });

    expect(shiftResult.current).toBe(false);
    expect(ctrlResult.current).toBe(true);

    // Clean up
    act(() => {
      dispatchKeyUp('Control');
    });

    expect(ctrlResult.current).toBe(false);
  });

  it('should handle multiple subscriptions to the same key', () => {
    const { result: shift1 } = renderHook(() => useKeyPressed('Shift'));
    const { result: shift2 } = renderHook(() => useKeyPressed('Shift'));

    expect(shift1.current).toBe(false);
    expect(shift2.current).toBe(false);

    act(() => {
      dispatchKeyDown('Shift');
    });

    expect(shift1.current).toBe(true);
    expect(shift2.current).toBe(true);

    act(() => {
      dispatchKeyUp('Shift');
    });

    expect(shift1.current).toBe(false);
    expect(shift2.current).toBe(false);
  });

  it('should reset all keys on window blur', () => {
    const { result: shiftResult } = renderHook(() => useKeyPressed('Shift'));
    const { result: ctrlResult } = renderHook(() => useKeyPressed('Control'));

    // Press both keys
    act(() => {
      dispatchKeyDown('Shift');
      dispatchKeyDown('Control');
    });

    expect(shiftResult.current).toBe(true);
    expect(ctrlResult.current).toBe(true);

    // Blur window
    act(() => {
      dispatchWindowBlur();
    });

    expect(shiftResult.current).toBe(false);
    expect(ctrlResult.current).toBe(false);
  });

  it('should handle letter keys and special keys', () => {
    const { result: aResult } = renderHook(() => useKeyPressed('a'));
    const { result: enterResult } = renderHook(() => useKeyPressed('Enter'));
    const { result: spaceResult } = renderHook(() => useKeyPressed(' '));

    // Test letter key
    act(() => {
      dispatchKeyDown('a');
    });

    expect(aResult.current).toBe(true);
    expect(enterResult.current).toBe(false);
    expect(spaceResult.current).toBe(false);

    // Test Enter key
    act(() => {
      dispatchKeyDown('Enter');
    });

    expect(aResult.current).toBe(true);
    expect(enterResult.current).toBe(true);
    expect(spaceResult.current).toBe(false);

    // Test space key
    act(() => {
      dispatchKeyDown(' ');
    });

    expect(aResult.current).toBe(true);
    expect(enterResult.current).toBe(true);
    expect(spaceResult.current).toBe(true);

    // Clean up
    act(() => {
      dispatchKeyUp('a');
      dispatchKeyUp('Enter');
      dispatchKeyUp(' ');
    });
  });

  it('should handle rapid key presses correctly', () => {
    const { result } = renderHook(() => useKeyPressed('a'));

    expect(result.current).toBe(false);

    // Rapid key down/up cycles
    act(() => {
      dispatchKeyDown('a');
    });
    expect(result.current).toBe(true);

    act(() => {
      dispatchKeyUp('a');
    });
    expect(result.current).toBe(false);

    act(() => {
      dispatchKeyDown('a');
    });
    expect(result.current).toBe(true);

    act(() => {
      dispatchKeyUp('a');
    });
    expect(result.current).toBe(false);
  });

  it('should ignore repeated keydown events for the same key', () => {
    const { result } = renderHook(() => useKeyPressed('Shift'));

    expect(result.current).toBe(false);

    // First keydown
    act(() => {
      dispatchKeyDown('Shift');
    });
    expect(result.current).toBe(true);

    // Repeated keydown (should not change state)
    act(() => {
      dispatchKeyDown('Shift');
    });
    expect(result.current).toBe(true);

    // Keyup
    act(() => {
      dispatchKeyUp('Shift');
    });
    expect(result.current).toBe(false);
  });
});

describe('Convenience hooks', () => {
  it('useShiftKey should work correctly', () => {
    const { result } = renderHook(() => useShiftKey());

    expect(result.current).toBe(false);

    act(() => {
      dispatchKeyDown('Shift');
    });

    expect(result.current).toBe(true);

    act(() => {
      dispatchKeyUp('Shift');
    });

    expect(result.current).toBe(false);
  });

  it('useControlKey should work correctly', () => {
    const { result } = renderHook(() => useControlKey());

    expect(result.current).toBe(false);

    act(() => {
      dispatchKeyDown('Control');
    });

    expect(result.current).toBe(true);

    act(() => {
      dispatchKeyUp('Control');
    });

    expect(result.current).toBe(false);
  });

  it('useAltKey should work correctly', () => {
    const { result } = renderHook(() => useAltKey());

    expect(result.current).toBe(false);

    act(() => {
      dispatchKeyDown('Alt');
    });

    expect(result.current).toBe(true);

    act(() => {
      dispatchKeyUp('Alt');
    });

    expect(result.current).toBe(false);
  });
});
