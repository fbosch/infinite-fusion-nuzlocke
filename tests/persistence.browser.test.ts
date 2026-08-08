import { beforeEach, describe, expect, it } from "vitest";
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

const deleteDatabase = () =>
  new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(PLAYTHROUGHS_DATABASE);

    request.onblocked = () => {
      reject(new Error("Unable to clear the playthroughs IndexedDB fixture"));
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });

describe("playthrough persistence browser regressions", () => {
  beforeEach(async () => {
    await deleteDatabase();
  });

  it("adds the data store when an existing database does not have it", async () => {
    const legacyDatabase = await openDatabase((upgradeDatabase) => {
      upgradeDatabase.createObjectStore("legacy");
    });
    legacyDatabase.close();

    const state: PlaythroughsState = {
      activePlaythroughId: undefined,
      isLoading: false,
      isSaving: false,
      playthroughs: [],
    };

    await loadFromIndexedDB(state);

    const database = await openDatabase();
    expect(Array.from(database.objectStoreNames)).toContain("data");
    database.close();
  });
});
