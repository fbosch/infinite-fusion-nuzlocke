import { describe, expect, it } from "vitest";
import { loadFromIndexedDB } from "@/stores/playthroughs/persistence";
import type { PlaythroughsState } from "@/stores/playthroughs/types";

const PLAYTHROUGHS_DATABASE = "playthroughs";

const openDatabase = (onUpgradeNeeded?: (database: IDBDatabase) => void) =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(PLAYTHROUGHS_DATABASE);

    request.onupgradeneeded = () => {
      onUpgradeNeeded?.(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });

describe("playthrough persistence browser regressions", () => {
  it("adds the data store when an existing database does not have it", async () => {
    const legacyDatabase = await openDatabase((database) => {
      database.createObjectStore("legacy");
    });
    legacyDatabase.close();

    const state: PlaythroughsState = {
      playthroughs: [],
      activePlaythroughId: undefined,
      isLoading: false,
      isSaving: false,
    };

    await loadFromIndexedDB(state);

    const database = await openDatabase();
    expect(Array.from(database.objectStoreNames)).toContain("data");
    database.close();
  });
});
