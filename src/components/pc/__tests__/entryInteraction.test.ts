import { describe, expect, it, vi } from "vitest";

const { scrollToLocationByIdMock } = vi.hoisted(() => ({
  scrollToLocationByIdMock: vi.fn(),
}));

vi.mock("@/utils/scrollToLocation", () => ({
  scrollToLocationById: scrollToLocationByIdMock,
}));

import { scrollToPokemonEntry } from "../entryInteraction";

describe("scrollToPokemonEntry", () => {
  it("scrolls to and highlights each available Pokemon identity", () => {
    scrollToPokemonEntry(
      "route-1",
      { id: 25, name: "Pikachu", nationalDexId: 25, uid: "pikachu-uid" },
      { id: 133, name: "Eevee", nationalDexId: 133, uid: "eevee-uid" },
    );

    expect(scrollToLocationByIdMock).toHaveBeenCalledWith("route-1", {
      behavior: "smooth",
      durationMs: 1200,
      highlightUids: ["pikachu-uid", "eevee-uid"],
    });
  });

  it("does not include Pokemon without persisted identities", () => {
    scrollToPokemonEntry(
      "route-1",
      { id: 25, name: "Pikachu", nationalDexId: 25, uid: undefined },
      null,
    );

    expect(scrollToLocationByIdMock).toHaveBeenLastCalledWith("route-1", {
      behavior: "smooth",
      durationMs: 1200,
      highlightUids: [],
    });
  });
});
