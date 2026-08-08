import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACTIVE_PLAYTHROUGH_KEY,
  loadAllPlaythroughs,
  loadFromIndexedDB,
  loadPlaythroughById,
} from "../persistence";
import type { PlaythroughsState } from "../types";

const idbMocks = vi.hoisted(() => ({
  del: vi.fn(),
  get: vi.fn(),
  keys: vi.fn(),
  set: vi.fn(),
}));

vi.mock("idb-keyval", () => ({
  createStore: vi.fn(() => ({ name: "mock-store" })),
  del: idbMocks.del,
  get: idbMocks.get,
  keys: idbMocks.keys,
  set: idbMocks.set,
}));

const createState = (): PlaythroughsState => ({
  activePlaythroughId: undefined,
  isLoading: false,
  isSaving: false,
  playthroughs: [],
});

const createLocalStorageMock = () => {
  const store = new Map<string, string>();

  return {
    clear: () => {
      store.clear();
    },
    getItem: (key: string) => store.get(key) ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
};

describe("playthrough persistence initialization regression cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: createLocalStorageMock(),
    });
    localStorage.clear();
  });

  it("creates a default playthrough for a fresh session", async () => {
    const state = createState();

    idbMocks.keys.mockResolvedValue([]);
    idbMocks.get.mockResolvedValue(null);
    idbMocks.set.mockResolvedValue(undefined);

    await loadFromIndexedDB(state);

    expect(state.playthroughs).toHaveLength(1);
    expect(state.activePlaythroughId).toBeDefined();
    expect(state.activePlaythroughId).toBe(
      localStorage.getItem(ACTIVE_PLAYTHROUGH_KEY),
    );
    expect(idbMocks.set).toHaveBeenCalledTimes(1);
    expect(state.isLoading).toBe(false);
  });

  it("preserves an existing session and migrates old playthrough data", async () => {
    const state = createState();

    localStorage.setItem(ACTIVE_PLAYTHROUGH_KEY, "pt-old");

    idbMocks.keys.mockResolvedValue(["pt-new", "pt-old"]);
    idbMocks.get.mockImplementation(async (key: string) => {
      if (key === "pt-new") {
        return {
          createdAt: 100,
          encounters: {},
          gameMode: "classic",
          id: "pt-new",
          name: "New",
          team: { members: Array.from({ length: 6 }, () => null) },
          updatedAt: 100,
          version: "1.0.0",
        };
      }

      if (key === "pt-old") {
        return {
          createdAt: 50,
          encounters: {},
          gameMode: "classic",
          id: "pt-old",
          name: "Old",
          team: {
            members: {
              0: {
                bodyEncounterId: "route1:body",
                headEncounterId: "route1:head",
              },
            },
          },
          updatedAt: 50,
        };
      }

      return null;
    });

    await loadFromIndexedDB(state);

    expect(state.playthroughs).toHaveLength(2);
    expect(state.activePlaythroughId).toBe("pt-old");

    const oldPlaythrough = state.playthroughs.find(
      (playthrough: { id: string }) => playthrough.id === "pt-old",
    );
    expect(oldPlaythrough).toBeDefined();
    expect(oldPlaythrough?.version).toBe("1.0.0");
    expect(oldPlaythrough?.team.members).toHaveLength(6);
    expect(oldPlaythrough?.team.members[0]).toEqual({
      bodyPokemonUid: "",
      headPokemonUid: "",
    });
    expect(state.isLoading).toBe(false);
  });

  it("falls back to first playthrough when stored active id is missing", async () => {
    const state = createState();

    localStorage.setItem(ACTIVE_PLAYTHROUGH_KEY, "missing-id");

    idbMocks.keys.mockResolvedValue(["pt-a"]);
    idbMocks.get.mockResolvedValue({
      createdAt: 1,
      encounters: {},
      gameMode: "classic",
      id: "pt-a",
      name: "Run A",
      team: { members: Array.from({ length: 6 }, () => null) },
      updatedAt: 1,
      version: "1.0.0",
    });

    await loadFromIndexedDB(state);

    expect(state.activePlaythroughId).toBe("pt-a");
    expect(localStorage.getItem(ACTIVE_PLAYTHROUGH_KEY)).toBe("pt-a");
    expect(state.isLoading).toBe(false);
  });

  it("uses deterministic fallback when IndexedDB load fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const state = createState();

    idbMocks.keys.mockRejectedValue(new Error("indexeddb unavailable"));

    await loadFromIndexedDB(state);
    consoleErrorSpy.mockRestore();

    expect(state.playthroughs).toHaveLength(1);
    expect(state.activePlaythroughId).toBeDefined();
    expect(state.activePlaythroughId).toBe(
      localStorage.getItem(ACTIVE_PLAYTHROUGH_KEY),
    );
    expect(state.isLoading).toBe(false);
  });

  it("keeps the fallback usable when localStorage is only partially implemented", async () => {
    const state = createState();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: { getItem: () => null },
    });
    idbMocks.keys.mockRejectedValue(new Error("indexeddb unavailable"));

    await expect(loadFromIndexedDB(state)).resolves.toBeUndefined();

    expect(state.playthroughs).toHaveLength(1);
    expect(state.activePlaythroughId).toBeDefined();
    expect(state.isLoading).toBe(false);
  });

  it("migrates old team-member schema when loading a single playthrough", async () => {
    idbMocks.get.mockResolvedValue({
      createdAt: 10,
      encounters: {},
      gameMode: "classic",
      id: "legacy",
      name: "Legacy Run",
      team: {
        members: {
          2: { bodyEncounterId: "route3:body", headEncounterId: "route3:head" },
        },
      },
      updatedAt: 10,
    });

    const loaded = await loadPlaythroughById("legacy");

    expect(loaded).not.toBeNull();
    expect(loaded?.version).toBe("1.0.0");
    expect(loaded?.team.members).toHaveLength(6);
    expect(loaded?.team.members[2]).toEqual({
      bodyPokemonUid: "",
      headPokemonUid: "",
    });
  });

  it("keeps valid playthroughs when another stored record is malformed", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    idbMocks.keys.mockResolvedValue(["valid", "invalid"]);
    idbMocks.get.mockImplementation(async (key: string) => {
      if (key === "valid") {
        return {
          createdAt: 1,
          encounters: {},
          gameMode: "classic",
          id: "valid",
          name: "Valid Run",
          team: { members: Array.from({ length: 6 }, () => null) },
          updatedAt: 1,
          version: "1.0.0",
        };
      }

      return {
        createdAt: 1,
        gameMode: "classic",
        id: "invalid",
        name: "Invalid Run",
        team: { members: ["invalid", null, null, null, null, null] },
        updatedAt: 1,
        version: "1.0.0",
      };
    });

    await expect(loadAllPlaythroughs()).resolves.toMatchObject([
      { id: "valid" },
    ]);
    consoleErrorSpy.mockRestore();
  });
});
