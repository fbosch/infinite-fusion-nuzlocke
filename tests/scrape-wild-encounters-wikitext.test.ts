import { describe, expect, it } from "vitest";
import {
  parseEncounterTemplatesFromWikitext,
  parseWildEncounterRoutesFromWikitext,
} from "../scripts/scrape-wild-encounters";
import { buildPokemonNameMap } from "../scripts/utils/pokemon-name-utils";

const pokemonNameMap = buildPokemonNameMap([
  { id: 16, name: "Pidgey" },
  { id: 27, name: "Sandshrew" },
  { id: 41, name: "Zubat" },
  { id: 54, name: "Psyduck" },
  { id: 74, name: "Geodude" },
  { id: 478, name: "Carbink" },
]);

describe("Wild encounter wikitext parser", () => {
  it("parses Mt. Moon from scoped route blocks without Route 4 leakage", () => {
    const wikitext = [
      "'''Route 4 (ID 100)'''",
      "{{EncounterTable/Header/Time}}",
      "{{EncounterTable/Section|Surf}}",
      "{{EncounterTable/Data|054|Psyduck|5|70%|15|100%|15|100%}}",
      "{{EncounterTable/Footer/Time}}",
      "",
      "'''Mt. Moon (ID 102)'''",
      "{{EncounterTable/Header}}",
      "{{EncounterTable/Section|Cave}}",
      "{{EncounterTable/Data|027|Sandshrew|8|20%}}",
      "{{EncounterTable/Data|041|Zubat|10|40%}}",
      "{{EncounterTable/RockSmash}}",
      "{{EncounterTable/Data|478|Carbink|12|100%}}",
      "{{EncounterTable/Footer}}",
    ].join("\n");

    const routes = parseWildEncounterRoutesFromWikitext(
      wikitext,
      pokemonNameMap,
    );
    const mtMoon = routes.find((route) => route.routeName === "Mt. Moon");

    expect(mtMoon).toBeDefined();
    expect(mtMoon?.encounters).toEqual(
      expect.arrayContaining([
        { pokemonId: 27, encounterType: "cave" },
        { pokemonId: 41, encounterType: "cave" },
        { pokemonId: 478, encounterType: "rock_smash" },
      ]),
    );
    expect(mtMoon?.encounters.some((entry) => entry.pokemonId === 54)).toBe(
      false,
    );
  });

  it("prefers direct template IDs before fuzzy name matching", () => {
    const wikitext = [
      "{{EncounterTable/Header}}",
      "{{EncounterTable/Section|Grass}}",
      "{{EncounterTable/Data|027|Psyduck|8|100%}}",
      "{{EncounterTable/Footer}}",
    ].join("\n");

    const encounters = parseEncounterTemplatesFromWikitext(
      wikitext,
      pokemonNameMap,
      "unit test",
    );

    expect(encounters).toEqual([{ pokemonId: 27, encounterType: "grass" }]);
  });

  it("throws on unresolved EncounterTable/Data rows to avoid silent partial output", () => {
    const wikitext = [
      "{{EncounterTable/Header}}",
      "{{EncounterTable/Section|Grass}}",
      "{{EncounterTable/Data|9999|MissingNo|10|100%}}",
      "{{EncounterTable/Footer}}",
    ].join("\n");

    expect(() =>
      parseEncounterTemplatesFromWikitext(
        wikitext,
        pokemonNameMap,
        "unit test",
      ),
    ).toThrow(/Unable to resolve Pokemon/);
  });

  it("does not flush an active route on non-route bold lines", () => {
    const wikitext = [
      "'''Route 2 (ID 20)'''",
      "{{EncounterTable/Header}}",
      "'''Table Notes'''",
      "{{EncounterTable/Section|Grass}}",
      "{{EncounterTable/Data|016|Pidgey|3|100%}}",
      "{{EncounterTable/Footer}}",
    ].join("\n");

    const routes = parseWildEncounterRoutesFromWikitext(
      wikitext,
      pokemonNameMap,
    );

    expect(routes).toHaveLength(1);
    expect(routes[0]?.routeName).toBe("Route 2");
    expect(routes[0]?.encounters).toEqual([
      { pokemonId: 16, encounterType: "grass" },
    ]);
  });
});
