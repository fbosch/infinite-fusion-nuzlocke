#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import { ConsoleFormatter } from "./utils/console-utils";
import { loadPokemonNameMap } from "./utils/data-loading-utils";
import {
  findPokemonId,
  isPotentialPokemonName,
  type PokemonNameMap,
} from "./utils/pokemon-name-utils";
import { processRouteName } from "./utils/route-utils";
import {
  exitOnScriptError,
  runDirectScript,
} from "./utils/script-runtime-utils";
import { fetchWikiPageHtml } from "./utils/wiki-fetch-utils";

const LEGENDARY_POKEMON_URL =
  "https://infinitefusion.fandom.com/wiki/Legendary_Pok%C3%A9mon";

interface LegendaryRoute {
  routeName: string;
  encounters: number[]; // Array of Pokémon IDs
}

type CheerioInput = Parameters<ReturnType<typeof cheerio.load>>[0];

export function collectLegendaryRouteMapFromHtml(
  html: string,
  pokemonNameMap: PokemonNameMap,
): Map<string, number[]> {
  const $ = cheerio.load(html);
  const routeMap = new Map<string, number[]>();
  const headings = $(".mw-parser-output").find("h3");

  ConsoleFormatter.info(`Found ${headings.length} h3 headings`);
  headings.each((_index, heading) => {
    addLegendaryHeadingEncounters($, heading, pokemonNameMap, routeMap);
  });

  return routeMap;
}

function addLegendaryHeadingEncounters(
  $: ReturnType<typeof cheerio.load>,
  heading: CheerioInput,
  pokemonNameMap: PokemonNameMap,
  routeMap: Map<string, number[]>,
): void {
  const $heading = $(heading);
  const pokemonName = $heading.find("span.mw-headline").text().trim();
  if (!isPotentialPokemonName(pokemonName)) {
    return;
  }

  for (const name of pokemonName.split("/").map((part) => part.trim())) {
    const pokemonIds = getLegendaryPokemonIds(name, pokemonNameMap);
    if (pokemonIds.length === 0) {
      ConsoleFormatter.warn(`Could not find any forms for legendary: ${name}`);
      continue;
    }

    const routeName = findLegendaryRouteName($heading);
    if (routeName) {
      addLegendaryIdsToRoute(routeMap, routeName, pokemonIds);
      ConsoleFormatter.success(
        `Added ${pokemonIds.length} forms of ${name} to route: ${routeName}`,
      );
    }
  }
}

function getLegendaryPokemonIds(
  name: string,
  pokemonNameMap: PokemonNameMap,
): number[] {
  const pokemonIds: number[] = [];
  const exactMatch = findPokemonId(name, pokemonNameMap);
  if (exactMatch) {
    pokemonIds.push(exactMatch);
  }

  for (const [pokemonName, id] of pokemonNameMap.nameToId.entries()) {
    if (pokemonName.startsWith(`${name} `) && pokemonName !== name) {
      pokemonIds.push(id);
    }
  }

  return pokemonIds;
}

function findLegendaryRouteName(
  $heading: ReturnType<ReturnType<typeof cheerio.load>>,
): string {
  let nextElement = $heading.next();

  for (
    let siblingsChecked = 0;
    nextElement.length > 0 && siblingsChecked < 10;
    siblingsChecked += 1, nextElement = nextElement.next()
  ) {
    if (nextElement.is("table.article-table")) {
      return getRouteNameFromLegendaryTable(nextElement);
    }
    if (nextElement.is("h3")) {
      return "";
    }
  }

  return "";
}

function getRouteNameFromLegendaryTable(
  $table: ReturnType<ReturnType<typeof cheerio.load>>,
): string {
  const $cell = $table.find("tr").first().find("td").first();
  if ($cell.length === 0) {
    return "";
  }

  const anchors = $cell.find("a");
  const rawRouteName =
    anchors.length > 0 ? anchors.last().text().trim() : $cell.text().trim();
  const { cleanName } = processRouteName(rawRouteName);

  return cleanName === "Location" ? "" : cleanName;
}

function addLegendaryIdsToRoute(
  routeMap: Map<string, number[]>,
  routeName: string,
  pokemonIds: number[],
): void {
  const encounters = routeMap.get(routeName) ?? [];
  encounters.push(...pokemonIds);
  routeMap.set(routeName, encounters);
}

async function scrapeLegendaryEncounters(): Promise<LegendaryRoute[]> {
  ConsoleFormatter.printHeader(
    "Scraping Legendary Pokémon",
    "Scraping legendary encounter data from the wiki",
  );

  try {
    // Fetch the webpage
    const html = await ConsoleFormatter.withSpinner(
      "Fetching Legendary Pokémon page...",
      () => fetchWikiPageHtml(LEGENDARY_POKEMON_URL),
    );

    const pokemonNameMap = await loadPokemonNameMap();
    const routeMap = collectLegendaryRouteMapFromHtml(html, pokemonNameMap);

    // Convert map to array format
    const routes: LegendaryRoute[] = Array.from(routeMap.entries()).map(
      ([routeName, encounters]) => ({
        routeName,
        encounters: encounters.sort((a, b) => a - b), // Sort by ID
      }),
    );

    ConsoleFormatter.success(
      `Scraping complete! Found ${routes.length} routes with legendary encounters`,
    );

    return routes;
  } catch (error) {
    ConsoleFormatter.error(
      `Error scraping legendary encounters: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    throw error;
  }
}

async function main() {
  const startTime = Date.now();

  try {
    const dataDir = path.join(process.cwd(), "data", "shared");

    // Create directory if it doesn't exist
    await fs.mkdir(dataDir, { recursive: true });

    ConsoleFormatter.info("Scraping Legendary Pokémon encounters...");
    const legendaries = await scrapeLegendaryEncounters();

    // Write to file
    ConsoleFormatter.info("Saving legendary encounter data to file...");
    const outputPath = path.join(dataDir, "legendary-encounters.json");
    await fs.writeFile(outputPath, JSON.stringify(legendaries, null, 2));

    // Get file stats
    const stats = await fs.stat(outputPath);
    const duration = Date.now() - startTime;

    ConsoleFormatter.success(`Legendary scraping completed successfully!`);
    ConsoleFormatter.info(
      `Legendaries: ${legendaries.length} (${(stats.size / 1024).toFixed(1)} KB)`,
    );
    ConsoleFormatter.info(`Total duration: ${(duration / 1000).toFixed(2)}s`);
  } catch (error) {
    exitOnScriptError("Legendary scraping failed", error);
  }
}

runDirectScript(import.meta.url, main);
