import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getSearchWorkerService,
  cleanupSearchWorker,
} from '../searchWorkerService';

// Mock web worker support
const mockWorker = {
  postMessage: vi.fn(),
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// Mock comlink
vi.mock('comlink', () => ({
  wrap: vi.fn(() => ({
    initialize: vi.fn().mockResolvedValue({ success: true, dataCount: 10 }),
    search: vi.fn().mockResolvedValue([
      { id: 1, name: 'Bulbasaur', nationalDexId: 1, score: 0 },
      { id: 2, name: 'Ivysaur', nationalDexId: 2, score: 0.2 },
    ]),
    isReady: vi.fn().mockResolvedValue(true),
    getStats: vi.fn().mockResolvedValue({
      initialized: true,
      dataCount: 10,
      hasFuseInstance: true,
    }),
  })),
}));

describe('SearchWorkerService', () => {
  beforeEach(() => {
    // Mock Worker constructor
    global.Worker = vi.fn().mockImplementation(() => mockWorker);

    // Clear any existing service instance
    cleanupSearchWorker();
  });

  afterEach(() => {
    cleanupSearchWorker();
    vi.clearAllMocks();
  });

  it('should detect web worker support', () => {
    expect(typeof Worker).toBe('function');
  });

  it('should create a singleton service instance', () => {
    const service1 = getSearchWorkerService();
    const service2 = getSearchWorkerService();

    expect(service1).toBe(service2);
  });

  it('should initialize with Pokemon data', async () => {
    const service = getSearchWorkerService();
    const testData = [
      { id: 1, name: 'Bulbasaur', nationalDexId: 1 },
      { id: 2, name: 'Ivysaur', nationalDexId: 2 },
    ];

    await expect(service.initialize(testData)).resolves.toBeUndefined();
  });

  it('should perform search operations', async () => {
    const service = getSearchWorkerService();
    const testData = [
      { id: 1, name: 'Bulbasaur', nationalDexId: 1 },
      { id: 2, name: 'Ivysaur', nationalDexId: 2 },
    ];

    await service.initialize(testData);
    const results = await service.search('Bulbasaur');

    expect(results).toEqual([
      { id: 1, name: 'Bulbasaur', nationalDexId: 1, score: 0 },
      { id: 2, name: 'Ivysaur', nationalDexId: 2, score: 0.2 },
    ]);
  });

  it('should handle empty search queries', async () => {
    const service = getSearchWorkerService();
    const testData = [{ id: 1, name: 'Bulbasaur', nationalDexId: 1 }];

    await service.initialize(testData);
    const results = await service.search('');

    // Empty queries should return empty results
    expect(results).toEqual([]);
  });

  it('should check if worker is ready', async () => {
    const service = getSearchWorkerService();
    const testData = [{ id: 1, name: 'Bulbasaur', nationalDexId: 1 }];

    await service.initialize(testData);
    const isReady = await service.isReady();

    expect(isReady).toBe(true);
  });

  it('should get worker statistics', async () => {
    const service = getSearchWorkerService();
    const testData = [{ id: 1, name: 'Bulbasaur', nationalDexId: 1 }];

    await service.initialize(testData);
    const stats = await service.getStats();

    expect(stats).toEqual({
      initialized: true,
      dataCount: 10,
      hasFuseInstance: true,
    });
  });

  it('should handle errors gracefully', async () => {
    const service = getSearchWorkerService();

    // Test search without initialization
    const results = await service.search('test');
    expect(results).toEqual([]);
  });

  it('should cleanup properly', async () => {
    const service = getSearchWorkerService();
    const testData = [{ id: 1, name: 'Bulbasaur', nationalDexId: 1 }];

    // Initialize the service first to create the worker
    await service.initialize(testData);

    // This should not throw
    expect(() => cleanupSearchWorker()).not.toThrow();
    expect(mockWorker.terminate).toHaveBeenCalled();
  });
});
