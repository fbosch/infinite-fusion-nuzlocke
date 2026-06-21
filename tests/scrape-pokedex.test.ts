import { describe, expect, it } from "vitest";
import {
  extractPokedexSubpageTitles,
  parseDexEntriesFromHtml,
} from "../scripts/scrape-pokedex";

describe("Pokédex scraper", () => {
  it("extracts current Pokédex subpage links from the landing page", () => {
    const html = [
      '<a href="/wiki/Pok%C3%A9dex/Kanto/Classic" title="Pokédex/Kanto/Classic">Kanto Classic</a>',
      '<a href="/wiki/Pok%C3%A9dex/Kanto/Remix" title="Pokédex/Kanto/Remix">Kanto Remix</a>',
      '<a href="/wiki/Route_1" title="Route 1">Route 1</a>',
    ].join("");

    expect(extractPokedexSubpageTitles(html)).toEqual([
      "Pokédex/Kanto/Classic",
      "Pokédex/Kanto/Remix",
    ]);
  });

  it("parses entry rows from regional Pokédex tables", () => {
    const html = `
      <table>
        <tr>
          <th>Dex</th>
          <th colspan="2">Pokémon</th>
        </tr>
        <tr>
          <td>132</td>
          <td><span class="pokemon-icon"></span></td>
          <td><a href="https://infinitefusiondex.com/details/132">Ditto</a></td>
          <td>Normal</td>
        </tr>
      </table>
    `;

    expect(parseDexEntriesFromHtml(html)).toEqual([{ id: 132, name: "Ditto" }]);
  });

  it("returns no entries for landing page navigation tables", () => {
    const html = `
      <table>
        <tr>
          <td><a href="/wiki/Pok%C3%A9dex/Kanto/Classic" title="Pokédex/Kanto/Classic">Kanto Classic</a></td>
          <td><a href="/wiki/Pok%C3%A9dex/Kanto/Remix" title="Pokédex/Kanto/Remix">Kanto Remix</a></td>
        </tr>
      </table>
    `;

    expect(parseDexEntriesFromHtml(html)).toEqual([]);
  });
});
