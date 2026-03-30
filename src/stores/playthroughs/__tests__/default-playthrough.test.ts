import { describe, expect, it } from "vitest";
import { PlaythroughSchema } from "@/stores/playthroughs/types";
import { createDefaultPlaythrough } from "../defaultPlaythrough";

describe("createDefaultPlaythrough", () => {
  it("creates a schema-valid default playthrough", () => {
    const playthrough = createDefaultPlaythrough();

    expect(playthrough.id.startsWith("playthrough_")).toBe(true);
    expect(playthrough.name).toBe("Playthrough");
    expect(playthrough.gameMode).toBe("classic");
    expect(playthrough.version).toBe("1.0.0");
    expect(playthrough.team.members).toHaveLength(6);
    expect(playthrough.createdAt).toBe(playthrough.updatedAt);

    expect(() => PlaythroughSchema.parse(playthrough)).not.toThrow();
  });

  it("creates unique ids for new defaults", () => {
    const first = createDefaultPlaythrough();
    const second = createDefaultPlaythrough();

    expect(first.id).not.toBe(second.id);
  });
});
