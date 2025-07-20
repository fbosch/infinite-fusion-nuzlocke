import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock requestIdleCallback for tests
Object.defineProperty(global, 'window', {
  value: {
    ...global.window,
    requestIdleCallback: vi.fn((callback, options) => {
      setTimeout(callback, 0);
      return 1; // Return a mock ID
    }),
  },
  writable: true,
});
