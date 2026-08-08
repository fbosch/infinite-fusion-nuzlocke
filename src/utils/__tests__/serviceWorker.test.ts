import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceWorkerManager } from "@/utils/serviceWorker";

// Mock the service worker API
const mockServiceWorker = {
  addEventListener: vi.fn(),
  controller: null as ServiceWorker | null,
  register: vi.fn(),
};

const mockCache = {
  delete: vi.fn(),
  keys: vi.fn(),
  match: vi.fn(),
  put: vi.fn(),
};

const mockCaches = {
  keys: vi.fn(),
  match: vi.fn(),
  open: vi.fn().mockResolvedValue(mockCache),
};

// Mock fetch
const mockFetch = vi.fn();

// Mock console methods
const mockConsole = {
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

describe("ServiceWorkerManager", () => {
  beforeEach(() => {
    // Setup global mocks using vi.stubGlobal
    vi.stubGlobal("navigator", {
      serviceWorker: mockServiceWorker,
    });

    vi.stubGlobal("caches", mockCaches);
    vi.stubGlobal("fetch", mockFetch);
    vi.stubGlobal("console", mockConsole);

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("API Cache Status", () => {
    it("should return API cache status when service worker is active", async () => {
      // Mock service worker controller
      const mockController = {
        postMessage: vi.fn(),
      } as unknown as ServiceWorker;
      mockServiceWorker.controller = mockController;

      // Mock message channel
      const mockPort = {
        onmessage: vi.fn(),
        postMessage: vi.fn(),
      };
      const mockMessageChannel = {
        port1: mockPort,
        port2: mockPort,
      };
      vi.stubGlobal(
        "MessageChannel",
        vi.fn(function MockMessageChannel() {
          return mockMessageChannel;
        }),
      );

      const manager = ServiceWorkerManager.getInstance();

      // Mock the response from service worker
      setTimeout(() => {
        mockPort.onmessage({
          data: {
            status: {
              cached: 8,
              percentage: 80,
              total: 10,
            },
            type: "API_CACHE_STATUS",
          },
        });
      }, 0);

      const status = await manager.getApiCacheStatus();

      expect(status).toEqual({
        cached: 8,
        percentage: 80,
        total: 10,
      });
      expect(mockController.postMessage).toHaveBeenCalledWith(
        { type: "GET_API_CACHE_STATUS" },
        [mockPort],
      );
    });

    it("should return error when service worker is not active", async () => {
      mockServiceWorker.controller = null;

      const manager = ServiceWorkerManager.getInstance();
      const status = await manager.getApiCacheStatus();

      expect(status).toEqual({
        endpoints: [],
        error: "Service worker not active",
        total: 0,
      });
    });
  });

  describe("API Cache Clearing", () => {
    it("should clear API cache when service worker is active", async () => {
      const mockController = {
        postMessage: vi.fn(),
      } as unknown as ServiceWorker;
      mockServiceWorker.controller = mockController;

      const mockPort = {
        onmessage: vi.fn(),
        postMessage: vi.fn(),
      };
      const mockMessageChannel = {
        port1: mockPort,
        port2: mockPort,
      };
      vi.stubGlobal(
        "MessageChannel",
        vi.fn(function MockMessageChannel() {
          return mockMessageChannel;
        }),
      );

      const manager = ServiceWorkerManager.getInstance();

      // Mock the response from service worker
      setTimeout(() => {
        mockPort.onmessage({
          data: {
            type: "API_CACHE_CLEARED",
          },
        });
      }, 0);

      await manager.clearApiCache();

      expect(mockController.postMessage).toHaveBeenCalledWith(
        { type: "CLEAR_API_CACHE" },
        [mockPort],
      );
    });

    it("should handle clearing when service worker is not active", async () => {
      mockServiceWorker.controller = null;

      const manager = ServiceWorkerManager.getInstance();

      // Should not throw
      await expect(manager.clearApiCache()).resolves.toBeUndefined();
    });
  });
});
