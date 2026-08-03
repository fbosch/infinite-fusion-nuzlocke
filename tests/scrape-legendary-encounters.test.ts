import { describe, expect, it } from "vitest";
import { collectLegendaryRouteMapFromHtml } from "../scripts/scrape-legendary-encounters";
import { buildPokemonNameMap } from "../scripts/utils/pokemon-name-utils";

const pokemonNameMap = buildPokemonNameMap([
  { id: 144, name: "Articuno" },
  { id: 1001, name: "Articuno Galarian" },
  { id: 145, name: "Zapdos" },
  { id: 1002, name: "Zapdos Galarian" },
]);

describe("legendary encounter DOM traversal", () => {
  it("collects forms from the first table after a valid heading", () => {
    const html = `
      <div class="mw-parser-output">
        <h3><span class="mw-headline">Articuno / Zapdos</span></h3>
        <div>intro</div>
        <table class="article-table">
          <tr><td><a>Ignored</a><a>Route 1 (ID 10)</a></td></tr>
        </table>
      </div>`;

    expect(
      Array.from(collectLegendaryRouteMapFromHtml(html, pokemonNameMap)),
    ).toEqual([["Route 1", [144, 1001, 145, 1002]]]);
  });

  it("stops searching at a following heading or after ten siblings", () => {
    const ignoredTable = `<table class="article-table"><tr><td>Route 2</td></tr></table>`;
    const html = `
      <div class="mw-parser-output">
        <h3><span class="mw-headline">Articuno</span></h3>
        <div></div><div></div><div></div><div></div><div></div>
        <div></div><div></div><div></div><div></div><div></div>
        ${ignoredTable}
        <h3><span class="mw-headline">Table Notes</span></h3>
        ${ignoredTable}
      </div>`;

    expect(collectLegendaryRouteMapFromHtml(html, pokemonNameMap)).toEqual(
      new Map(),
    );
  });
});
