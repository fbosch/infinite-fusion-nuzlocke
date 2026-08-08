import { describe, expect, it } from "vitest";
import { type PokemonOptionType, PokemonStatus } from "@/loaders/pokemon";
import type { EncounterData } from "@/stores/playthroughs/types";
import {
  getDeceasedEntries,
  getPCTab,
  getPCTabIndex,
  getStoredEntries,
} from "../pcSheetDomain";

const pokemon = (
  id: number,
  status: PokemonOptionType["status"],
): PokemonOptionType => ({
  id,
  name: `Pokemon ${id}`,
  nationalDexId: id,
  status,
});

const encounters: Record<string, EncounterData> = {
  "route-1": {
    body: pokemon(1, PokemonStatus.STORED),
    head: pokemon(25, PokemonStatus.DECEASED),
    isFusion: true,
    updatedAt: 0,
  },
};

describe("PC sheet domain", () => {
  it("splits deceased members and retains stored members at their encounter", () => {
    const locations = new Map([["route-1", "Route 1"]]);

    expect(getDeceasedEntries(encounters, locations)).toMatchObject([
      {
        body: null,
        head: { id: 25 },
        locationId: "route-1-head",
        locationName: "Route 1",
      },
    ]);
    expect(getStoredEntries(encounters, locations)).toMatchObject([
      {
        body: { id: 1 },
        head: null,
        locationId: "route-1",
        locationName: "Route 1",
      },
    ]);
  });

  it("maps known tabs and invalid indices predictably", () => {
    expect(getPCTabIndex("graveyard")).toBe(2);
    expect(getPCTab(1)).toBe("box");
    expect(getPCTab(99)).toBe("team");
  });
});
