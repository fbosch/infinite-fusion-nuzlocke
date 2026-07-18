import { describe, expect, it } from "vitest";
import { detectEncounterType } from "../scripts/scrape-safari-encounters";

describe("Safari encounter type detection", () => {
  it.each([
    ["Surf", "surf"],
    ["Super Rod", "fishing"],
    ["Headbutt encounters", "rock_smash"],
    ["Underground cave", "cave"],
    ["Overworld gift", "special"],
    ["Tall grass", "grass"],
  ] as const)("maps %s to %s", (text, expectedType) => {
    expect(detectEncounterType(text)).toBe(expectedType);
  });
});
