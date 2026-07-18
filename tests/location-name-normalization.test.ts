import { describe, expect, it } from "vitest";
import { cleanLocationName } from "../scripts/utils/location-utils";

describe("location-name normalization", () => {
  it("returns the stable route name from wiki-formatted input", () => {
    expect(
      cleanLocationName("  [[S.S. Anne|S.S. Anne]] (dock) Pokémon Center  "),
    ).toBe("S.S. Anne Pokemon Center");
  });
});
