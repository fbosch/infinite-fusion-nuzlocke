import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACTIVE_PLAYTHROUGH_KEY,
  loadFromIndexedDB,
  loadPlaythroughById,
} from '../persistence';
import type { PlaythroughsState } from '../types';

const idbMocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
}));

vi.mock('idb-keyval', () => ({
  get: idbMocks.get,
  set: idbMocks.set,
  del: idbMocks.del,
  keys: idbMocks.keys,
  createStore: vi.fn(() => ({ name: 'mock-store' })),
}));

const createState = (): PlaythroughsState => ({
  playthroughs: [],
  activePlaythroughId: undefined,
  isLoading: false,
  isSaving: false,
});

const createLocalStorageMock = () => {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
};

describe('playthrough persistence initialization regression cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true,
    });
    localStorage.clear();
  });

  it('creates a default playthrough for a fresh session', async () => {
    const state = createState();

    idbMocks.keys.mockResolvedValue([]);
    idbMocks.get.mockResolvedValue(null);
    idbMocks.set.mockResolvedValue(undefined);

    await loadFromIndexedDB(state);

    expect(state.playthroughs).toHaveLength(1);
    expect(state.activePlaythroughId).toBeDefined();
    expect(state.activePlaythroughId).toBe(
      localStorage.getItem(ACTIVE_PLAYTHROUGH_KEY)
    );
    expect(idbMocks.set).toHaveBeenCalledTimes(1);
    expect(state.isLoading).toBe(false);
  });

  it('preserves an existing session and migrates old playthrough data', async () => {
    const state = createState();

    localStorage.setItem(ACTIVE_PLAYTHROUGH_KEY, 'pt-old');

    idbMocks.keys.mockResolvedValue(['pt-new', 'pt-old']);
    idbMocks.get.mockImplementation(async (key: string) => {
      if (key === 'pt-new') {
        return {
          id: 'pt-new',
          name: 'New',
          gameMode: 'classic',
          version: '1.0.0',
          team: { members: Array.from({ length: 6 }, () => null) },
          encounters: {},
          createdAt: 100,
          updatedAt: 100,
        };
      }

      if (key === 'pt-old') {
        return {
          id: 'pt-old',
          name: 'Old',
          gameMode: 'classic',
          team: {
            members: {
              0: {
                headEncounterId: 'route1:head',
                bodyEncounterId: 'route1:body',
              },
            },
          },
          encounters: {},
          createdAt: 50,
          updatedAt: 50,
        };
      }

      return null;
    });

    await loadFromIndexedDB(state);

    expect(state.playthroughs).toHaveLength(2);
    expect(state.activePlaythroughId).toBe('pt-old');

    const oldPlaythrough = state.playthroughs.find(
      (playthrough: { id: string }) => playthrough.id === 'pt-old'
    );
    expect(oldPlaythrough).toBeDefined();
    expect(oldPlaythrough?.version).toBe('1.0.0');
    expect(oldPlaythrough?.team.members).toHaveLength(6);
    expect(oldPlaythrough?.team.members[0]).toEqual({
      headPokemonUid: '',
      bodyPokemonUid: '',
    });
    expect(state.isLoading).toBe(false);
  });

  it('falls back to first playthrough when stored active id is missing', async () => {
    const state = createState();

    localStorage.setItem(ACTIVE_PLAYTHROUGH_KEY, 'missing-id');

    idbMocks.keys.mockResolvedValue(['pt-a']);
    idbMocks.get.mockResolvedValue({
      id: 'pt-a',
      name: 'Run A',
      gameMode: 'classic',
      version: '1.0.0',
      team: { members: Array.from({ length: 6 }, () => null) },
      encounters: {},
      createdAt: 1,
      updatedAt: 1,
    });

    await loadFromIndexedDB(state);

    expect(state.activePlaythroughId).toBe('pt-a');
    expect(localStorage.getItem(ACTIVE_PLAYTHROUGH_KEY)).toBe('pt-a');
    expect(state.isLoading).toBe(false);
  });

  it('uses deterministic fallback when IndexedDB load fails', async () => {
    const state = createState();

    idbMocks.keys.mockRejectedValue(new Error('indexeddb unavailable'));

    await loadFromIndexedDB(state);

    expect(state.playthroughs).toHaveLength(1);
    expect(state.activePlaythroughId).toBeDefined();
    expect(state.activePlaythroughId).toBe(
      localStorage.getItem(ACTIVE_PLAYTHROUGH_KEY)
    );
    expect(state.isLoading).toBe(false);
  });

  it('migrates old team-member schema when loading a single playthrough', async () => {
    idbMocks.get.mockResolvedValue({
      id: 'legacy',
      name: 'Legacy Run',
      gameMode: 'classic',
      team: {
        members: {
          2: { headEncounterId: 'route3:head', bodyEncounterId: 'route3:body' },
        },
      },
      encounters: {},
      createdAt: 10,
      updatedAt: 10,
    });

    const loaded = await loadPlaythroughById('legacy');

    expect(loaded).not.toBeNull();
    expect(loaded?.version).toBe('1.0.0');
    expect(loaded?.team.members).toHaveLength(6);
    expect(loaded?.team.members[2]).toEqual({
      headPokemonUid: '',
      bodyPokemonUid: '',
    });
  });
});
