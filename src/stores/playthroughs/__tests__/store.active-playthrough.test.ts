import { describe, expect, it } from "vitest";
import {
  createPlaythrough,
  deletePlaythrough,
  getActivePlaythrough,
  playthroughsStore,
  setActivePlaythrough,
} from "../store";
import { resetPlaythroughsStore } from "./test-utils";

describe("active playthrough lookup", () => {
  resetPlaythroughsStore();

  it("returns the latest active playthrough after switching", async () => {
    const firstId = createPlaythrough("First Run");
    const secondId = createPlaythrough("Second Run");

    playthroughsStore.activePlaythroughId = firstId;
    expect(getActivePlaythrough()?.id).toBe(firstId);

    await setActivePlaythrough(secondId);

    expect(getActivePlaythrough()?.id).toBe(secondId);
  });

  it("returns the new active playthrough after deleting the current one", async () => {
    const firstId = createPlaythrough("First Run");
    const secondId = createPlaythrough("Second Run");

    await setActivePlaythrough(secondId);
    expect(getActivePlaythrough()?.id).toBe(secondId);

    await deletePlaythrough(secondId);

    expect(playthroughsStore.activePlaythroughId).toBe(firstId);
    expect(getActivePlaythrough()?.id).toBe(firstId);
  });

  it("returns null after deleting the final playthrough", async () => {
    const onlyId = createPlaythrough("Only Run");

    playthroughsStore.activePlaythroughId = onlyId;
    expect(getActivePlaythrough()?.id).toBe(onlyId);

    await deletePlaythrough(onlyId);

    expect(playthroughsStore.activePlaythroughId).toBeUndefined();
    expect(getActivePlaythrough()).toBeNull();
  });
});
