import { describe, expect, it } from "vitest";
import {
  extractStaticEncounterLocations,
  getSpecialEncounterPokedexUrls,
} from "../scripts/scrape-special-encounters";

describe("extractStaticEncounterLocations", () => {
  it("expands Trash Cans static locations to all listed locations", () => {
    const locations = extractStaticEncounterLocations(
      "Trash Cans (static), Route 4, 5, Route 10, Safari Zone A1, A2",
    );

    expect(locations).toEqual([
      "Route 4",
      "Route 5",
      "Route 10",
      "Safari Zone A1",
      "Safari Zone A2",
    ]);
  });

  it("keeps only explicit static locations for non-trash rows", () => {
    const locations = extractStaticEncounterLocations(
      "Route 12, 16 (static), Vermillion City",
    );

    expect(locations).toEqual(["Route 16"]);
  });

  it("drops trash-can placeholder for singular and lowercase variants", () => {
    const locations = extractStaticEncounterLocations(
      "trash can (static), Route 11, Route 12",
    );

    expect(locations).toEqual(["Route 11", "Route 12"]);
  });
});

describe("getSpecialEncounterPokedexUrls", () => {
  it("selects Classic subpages from the Pokédex landing page", () => {
    const html = [
      '<a href="/wiki/Pok%C3%A9dex/Kanto/Classic" title="Pokédex/Kanto/Classic">Kanto Classic</a>',
      '<a href="/wiki/Pok%C3%A9dex/Kanto/Remix" title="Pokédex/Kanto/Remix">Kanto Remix</a>',
      '<a href="/wiki/Pok%C3%A9dex/Hoenn/Classic" title="Pokédex/Hoenn/Classic">Hoenn Classic</a>',
    ].join("");

    expect(
      getSpecialEncounterPokedexUrls(
        html,
        "https://infinitefusion.fandom.com/wiki/Pok%C3%A9dex",
        "classic",
      ),
    ).toEqual([
      "https://infinitefusion.fandom.com/wiki/Pok%C3%A9dex/Kanto/Classic",
      "https://infinitefusion.fandom.com/wiki/Pok%C3%A9dex/Hoenn/Classic",
    ]);
  });

  it("uses the source page when no matching subpage links exist", () => {
    expect(
      getSpecialEncounterPokedexUrls(
        "<table><tr><td>1</td></tr></table>",
        "https://infinitefusion.fandom.com/wiki/Pok%C3%A9dex/Remix",
        "remix",
      ),
    ).toEqual(["https://infinitefusion.fandom.com/wiki/Pok%C3%A9dex/Remix"]);
  });
});
