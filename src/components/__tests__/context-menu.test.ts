import { describe, expect, it } from "vitest";
import { filterEdgeSeparators } from "../context-menu";
import { createExternalDexItems } from "../PokemonSummaryCard/pokemon-context-menu";

describe("filterEdgeSeparators", () => {
  it("should remove separators at the beginning", () => {
    const items = [
      { id: "sep1", separator: true },
      { id: "sep2", separator: true },
      { id: "item1" },
      { id: "item2" },
    ];

    const result = filterEdgeSeparators(items);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("item1");
    expect(result[1].id).toBe("item2");
  });

  it("should remove separators at the end", () => {
    const items = [
      { id: "item1" },
      { id: "item2" },
      { id: "sep1", separator: true },
      { id: "sep2", separator: true },
    ];

    const result = filterEdgeSeparators(items);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("item1");
    expect(result[1].id).toBe("item2");
  });

  it("should remove separators at both beginning and end", () => {
    const items = [
      { id: "sep1", separator: true },
      { id: "item1" },
      { id: "sep2", separator: true },
      { id: "item2" },
      { id: "sep3", separator: true },
    ];

    const result = filterEdgeSeparators(items);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("item1");
    expect(result[1].id).toBe("sep2");
    expect(result[2].id).toBe("item2");
    // sep3 is correctly removed as it's at the end
  });

  it("should preserve separators in the middle", () => {
    const items = [
      { id: "item1" },
      { id: "sep1", separator: true },
      { id: "item2" },
    ];

    const result = filterEdgeSeparators(items);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("item1");
    expect(result[1].id).toBe("sep1");
    expect(result[2].id).toBe("item2");
  });

  it("should return empty array when only separators exist", () => {
    const items = [
      { id: "sep1", separator: true },
      { id: "sep2", separator: true },
    ];

    const result = filterEdgeSeparators(items);
    expect(result).toHaveLength(0);
  });

  it("should return unchanged array when no separators exist", () => {
    const items = [{ id: "item1" }, { id: "item2" }];

    const result = filterEdgeSeparators(items);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("item1");
    expect(result[1].id).toBe("item2");
  });

  it("should handle empty array", () => {
    const items: Array<{ separator?: boolean; id: string }> = [];
    const result = filterEdgeSeparators(items);
    expect(result).toHaveLength(0);
  });

  it("should handle single non-separator item", () => {
    const items = [{ id: "item1" }];
    const result = filterEdgeSeparators(items);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("item1");
  });

  it("should handle single separator item", () => {
    const items = [{ id: "sep1", separator: true }];
    const result = filterEdgeSeparators(items);
    expect(result).toHaveLength(0);
  });
});

describe("createExternalDexItems", () => {
  it("keeps both external entries aligned for a preferred artwork variant", () => {
    const items = createExternalDexItems("25.6", "a");

    expect(items).toMatchObject([
      {
        href: "https://infinitefusiondex.com/details/25.6",
        id: "infinitefusiondex",
        target: "_blank",
      },
      {
        href: "https://fusiondex.org/sprite/pif/25.6a/",
        id: "fusiondex",
        target: "_blank",
      },
    ]);
  });
});
