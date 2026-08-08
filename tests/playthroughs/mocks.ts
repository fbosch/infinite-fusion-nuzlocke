import { vi } from "vitest";

// Mock IndexedDB operations first
vi.mock("idb-keyval", () => ({
  createStore: vi.fn(() => ({
    // Mock store object that can be passed as second parameter
    name: "mock-store",
    storeName: "mock-object-store",
  })),
  del: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  set: vi.fn().mockResolvedValue(undefined),
}));

// Mock search service to avoid Worker issues in tests
vi.mock("@/services/searchService", () => ({
  default: {
    search: vi.fn().mockResolvedValue([]),
  },
}));
