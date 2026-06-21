#!/usr/bin/env node

import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as cheerio from "cheerio";
import { extractPokedexSubpageTitles } from "./scrape-pokedex";
import { ConsoleFormatter } from "./utils/console-utils";
import { loadPokemonNameMap } from "./utils/data-loading-utils";
import {
  findPokemonId,
  isPotentialPokemonName,
  type PokemonNameMap,
} from "./utils/pokemon-name-utils";
import { fetchWikiPageHtml } from "./utils/wiki-fetch-utils";

const CLASSIC_POKEDEX_URL =
  "https://infinitefusion.fandom.com/wiki/Pok%C3%A9dex";
const REMIX_POKEDEX_URL =
  "https://infinitefusion.fandom.com/wiki/Pok%C3%A9dex/Remix";

function getPokedexPageUrl(title: string): string {
  const pathSegments = title
    .split("/")
    .map((segment) => encodeURIComponent(segment));
  return `https://infinitefusion.fandom.com/wiki/${pathSegments.join("/")}`;
}

export function getSpecialEncounterPokedexUrls(
  html: string,
  sourceUrl: string,
  mode: "classic" | "remix",
): string[] {
  const modeSubpageSuffix = mode === "classic" ? "/Classic" : "/Remix";
  const subpageUrls = extractPokedexSubpageTitles(html)
    .filter((title) => title.endsWith(modeSubpageSuffix))
    .map((title) => getPokedexPageUrl(title));

  return subpageUrls.length > 0 ? subpageUrls : [sourceUrl];
}

/**
 * Handles special cases for Pokémon names that might not be found in the standard name map
 */
function findPokemonIdWithSpecialCases(
  pokemonName: string,
  pokemonNameMap: import("./utils/pokemon-name-utils").PokemonNameMap,
): number | null {
  // First try the standard lookup
  const standardId = findPokemonId(pokemonName, pokemonNameMap);
  if (standardId) {
    return standardId;
  }

  // Handle special cases
  const specialCases: Record<string, number> = {
    oricorio: 741, // Oricorio (Baile form)
    egg: -1, // Special case for eggs
  };

  // Handle common typos
  const typoCorrections: Record<string, string> = {
    cyadaquil: "cyndaquil",
  };

  const normalizedName = pokemonName.toLowerCase().trim();

  // Check for typos first
  if (typoCorrections[normalizedName]) {
    const correctedName = typoCorrections[normalizedName];
    const correctedId = findPokemonId(correctedName, pokemonNameMap);
    if (correctedId) {
      return correctedId;
    }
  }

  // Check exact matches first
  if (specialCases[normalizedName]) {
    return specialCases[normalizedName];
  }

  // Check partial matches
  for (const [key, id] of Object.entries(specialCases)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return id;
    }
  }

  return null;
}

/**
 * Cleans location names to match the standard format
 */
function cleanLocationName(location: string): string {
  return (
    location
      // Remove wiki links
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/\[\[([^\]]+)\|([^\]]+)\]\]/g, "$2")
      // Remove extra context in parentheses
      .replace(/\s*\([^)]*\)/g, "")
      // Standardize Pokémon -> Pokemon
      .replace(/Pokémon/g, "Pokemon")
      // Standardize S.S. Anne
      .replace(/S\.S\.\s*Anne/g, "S.S. Anne")
      // Remove extra whitespace
      .trim()
  );
}

/**
 * Extracts the base location name without the (gift), (trade), (quest), or (static) markers
 */
function extractBaseLocation(location: string): string {
  return location
    .replace(/\s*\(gift\)/gi, "")
    .replace(/\s*\(trade\)/gi, "")
    .replace(/\s*\(quest\)/gi, "")
    .replace(/\s*\(static\)/gi, "")
    .trim();
}

interface LocationGifts {
  routeName: string;
  pokemonIds: number[];
}

interface LocationTrades {
  routeName: string;
  pokemonIds: number[];
}

interface LocationQuests {
  routeName: string;
  pokemonIds: number[];
}

interface LocationStatics {
  routeName: string;
  pokemonIds: number[];
}

type SpecialEncounterKind = "gift" | "trade" | "quest" | "static";

interface SpecialEncounterItem {
  pokemonId: number;
  location: string;
}

interface SpecialEncounterCollection {
  items: SpecialEncounterItem[];
  seen: Set<string>;
}

interface SpecialEncounterAccumulator {
  gift: SpecialEncounterCollection;
  trade: SpecialEncounterCollection;
  quest: SpecialEncounterCollection;
  static: SpecialEncounterCollection;
}

interface SpecialEncounterResult {
  gifts: LocationGifts[];
  trades: LocationTrades[];
  quests: LocationQuests[];
  statics: LocationStatics[];
}

const SPECIAL_ENCOUNTER_MARKERS = ["(gift)", "(trade)", "(quest)", "(static)"];

function findLocationCellText(cells: cheerio.Cheerio<any>): string {
  for (let index = 0; index < cells.length; index++) {
    const text = cells.eq(index).text().trim();
    const normalized = text.toLowerCase();
    if (
      SPECIAL_ENCOUNTER_MARKERS.some((marker) => normalized.includes(marker))
    ) {
      return text;
    }
  }

  return "";
}

function getSpecialEncounterKind(
  locationCell: string,
): SpecialEncounterKind | null {
  const normalizedLocation = locationCell.toLowerCase();

  if (normalizedLocation.includes("(gift)")) {
    return "gift";
  }

  if (normalizedLocation.includes("(trade)")) {
    return "trade";
  }

  if (normalizedLocation.includes("(quest)")) {
    return "quest";
  }

  if (normalizedLocation.includes("(static)")) {
    return "static";
  }

  return null;
}

/**
 * Extracts only the location that has the (gift), (trade), (quest), or (static) marker
 */
function extractSpecialEncounterLocation(locationText: string): string | null {
  // Split by comma and look for entries with (gift), (trade), (quest), or (static)
  const locations = locationText.split(",").map((loc) => loc.trim());

  for (const location of locations) {
    if (
      location.toLowerCase().includes("(gift)") ||
      location.toLowerCase().includes("(trade)") ||
      location.toLowerCase().includes("(quest)") ||
      location.toLowerCase().includes("(static)")
    ) {
      // Clean the location name
      return cleanLocationName(extractBaseLocation(location));
    }
  }

  return null;
}

function expandLocationShorthand(
  location: string,
  previousLocation: string | null,
): string {
  if (/^\d+$/.test(location) && previousLocation?.startsWith("Route ")) {
    return `Route ${location}`;
  }

  if (
    /^[A-Z]\d+$/i.test(location) &&
    previousLocation?.startsWith("Safari Zone ")
  ) {
    return `Safari Zone ${location.toUpperCase()}`;
  }

  return location;
}

export function extractStaticEncounterLocations(
  locationText: string,
): string[] {
  const parts = locationText
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const isTrashCanLocation = (location: string): boolean =>
    /^trash\s*cans?$/i.test(location.trim());

  const hasTrashCanStatic = parts.some((part) => {
    const cleanedLocation = cleanLocationName(extractBaseLocation(part));
    return (
      isTrashCanLocation(cleanedLocation) &&
      part.toLowerCase().includes("(static)")
    );
  });

  const expandedParts: { location: string; isStatic: boolean }[] = [];
  let previousLocation: string | null = null;

  for (const part of parts) {
    const isStatic = part.toLowerCase().includes("(static)");
    const cleanedLocation = cleanLocationName(extractBaseLocation(part));
    const expandedLocation = expandLocationShorthand(
      cleanedLocation,
      previousLocation,
    );
    previousLocation = expandedLocation;

    expandedParts.push({
      location: expandedLocation,
      isStatic,
    });
  }

  if (hasTrashCanStatic) {
    const expandedTrashCanLocations = Array.from(
      new Set(
        expandedParts
          .map((part) => part.location)
          .filter((location) => isTrashCanLocation(location) === false),
      ),
    );

    if (expandedTrashCanLocations.length > 0) {
      return expandedTrashCanLocations;
    }

    return ["Trash Cans"];
  }

  return Array.from(
    new Set(
      expandedParts
        .filter((part) => part.isStatic)
        .map((part) => part.location),
    ),
  );
}

/**
 * Groups Pokémon by location to create the merged structure
 */
function groupPokemonByLocation<
  T extends { pokemonId: number; location: string },
>(items: T[]): { routeName: string; pokemonIds: number[] }[] {
  const locationMap = new Map<string, number[]>();

  for (const item of items) {
    if (!locationMap.has(item.location)) {
      locationMap.set(item.location, []);
    }
    locationMap.get(item.location)?.push(item.pokemonId);
  }

  // Convert to array and sort by location name
  return Array.from(locationMap.entries())
    .map(([routeName, pokemonIds]) => ({
      routeName,
      pokemonIds: pokemonIds.sort((a, b) => a - b), // Sort Pokémon IDs numerically
    }))
    .sort((a, b) => a.routeName.localeCompare(b.routeName)); // Sort locations alphabetically
}

function createSpecialEncounterAccumulator(): SpecialEncounterAccumulator {
  return {
    gift: { items: [], seen: new Set<string>() },
    trade: { items: [], seen: new Set<string>() },
    quest: { items: [], seen: new Set<string>() },
    static: { items: [], seen: new Set<string>() },
  };
}

function addSpecialEncounterItem(
  collection: SpecialEncounterCollection,
  pokemonCell: string,
  pokemonId: number,
  location: string,
): void {
  const uniqueKey = `${pokemonCell}-${location}`;
  if (collection.seen.has(uniqueKey)) {
    return;
  }

  collection.seen.add(uniqueKey);
  collection.items.push({ pokemonId, location });
}

function addLocationEncounter(
  collection: SpecialEncounterCollection,
  pokemonCell: string,
  pokemonId: number,
  locationCell: string,
): void {
  const specificLocation = extractSpecialEncounterLocation(locationCell);
  if (!specificLocation) {
    ConsoleFormatter.warn(
      `Could not extract specific location for ${pokemonCell}`,
    );
    return;
  }

  addSpecialEncounterItem(collection, pokemonCell, pokemonId, specificLocation);
}

function addStaticEncounters(
  collection: SpecialEncounterCollection,
  pokemonCell: string,
  pokemonId: number,
  locationCell: string,
): void {
  const staticLocations = extractStaticEncounterLocations(locationCell);
  if (staticLocations.length === 0) {
    ConsoleFormatter.warn(
      `Could not extract static locations for ${pokemonCell}`,
    );
    return;
  }

  for (const staticLocation of staticLocations) {
    addSpecialEncounterItem(collection, pokemonCell, pokemonId, staticLocation);
  }
}

function addSpecialEncounterRow(
  cells: cheerio.Cheerio<any>,
  pokemonNameMap: PokemonNameMap,
  accumulator: SpecialEncounterAccumulator,
): void {
  if (cells.length < 5) {
    return;
  }

  const pokemonCell = cells.eq(2).text().trim();
  if (
    !pokemonCell ||
    !isPotentialPokemonName(pokemonCell) ||
    pokemonCell.toLowerCase().includes("pokemon")
  ) {
    return;
  }

  const locationCell = findLocationCellText(cells);
  const encounterKind = getSpecialEncounterKind(locationCell);
  if (encounterKind === null) {
    return;
  }

  const pokemonId = findPokemonIdWithSpecialCases(pokemonCell, pokemonNameMap);
  if (!pokemonId) {
    ConsoleFormatter.warn(
      `Could not find ID for ${encounterKind} Pokémon: ${pokemonCell}`,
    );
    return;
  }

  if (encounterKind === "static") {
    addStaticEncounters(
      accumulator.static,
      pokemonCell,
      pokemonId,
      locationCell,
    );
    return;
  }

  addLocationEncounter(
    accumulator[encounterKind],
    pokemonCell,
    pokemonId,
    locationCell,
  );
}

function addSpecialEncountersFromHtml(
  html: string,
  pokemonNameMap: PokemonNameMap,
  accumulator: SpecialEncounterAccumulator,
): void {
  const $ = cheerio.load(html);

  $("table tr").each((_rowIndex: number, row: any) => {
    addSpecialEncounterRow($(row).find("td"), pokemonNameMap, accumulator);
  });
}

async function fetchSpecialEncounterPokedexPages(
  url: string,
  mode: "classic" | "remix",
): Promise<string[]> {
  const sourceHtml = await ConsoleFormatter.withSpinner(
    `Fetching ${mode} Pokédex page...`,
    () => fetchWikiPageHtml(url),
  );

  const pokedexUrls = getSpecialEncounterPokedexUrls(sourceHtml, url, mode);
  if (pokedexUrls.length === 1 && pokedexUrls[0] === url) {
    return [sourceHtml];
  }

  ConsoleFormatter.working(
    `Fetching ${pokedexUrls.length} ${mode} Pokédex subpages...`,
  );

  const pageHtml: string[] = [];
  for (const pokedexUrl of pokedexUrls) {
    pageHtml.push(await fetchWikiPageHtml(pokedexUrl));
  }

  return pageHtml;
}

function assertHasSpecialEncounters(
  mode: "classic" | "remix",
  result: SpecialEncounterResult,
): void {
  if (
    result.gifts.length > 0 ||
    result.trades.length > 0 ||
    result.quests.length > 0 ||
    result.statics.length > 0
  ) {
    return;
  }

  throw new Error(`No special encounters found in ${mode} Pokédex pages`);
}

async function scrapePokedexForSpecialEncounters(
  url: string,
  mode: "classic" | "remix",
): Promise<SpecialEncounterResult> {
  ConsoleFormatter.printHeader(
    `Scraping ${mode.toUpperCase()} Special Encounters`,
    `Scraping gift, trade, quest, and static Pokémon data from the ${mode} Pokédex`,
  );

  try {
    const pageHtml = await fetchSpecialEncounterPokedexPages(url, mode);
    const pokemonNameMap = await loadPokemonNameMap();
    const accumulator = createSpecialEncounterAccumulator();

    for (const html of pageHtml) {
      addSpecialEncountersFromHtml(html, pokemonNameMap, accumulator);
    }

    // Group by location to match encounters.json structure
    const groupedGifts = groupPokemonByLocation(accumulator.gift.items);
    const groupedTrades = groupPokemonByLocation(accumulator.trade.items);
    const groupedQuests = groupPokemonByLocation(accumulator.quest.items);
    const groupedStatics = groupPokemonByLocation(accumulator.static.items);
    const result = {
      gifts: groupedGifts,
      trades: groupedTrades,
      quests: groupedQuests,
      statics: groupedStatics,
    };

    assertHasSpecialEncounters(mode, result);

    ConsoleFormatter.success(
      `Found ${accumulator.gift.items.length} gift Pokémon in ${groupedGifts.length} locations, ${accumulator.trade.items.length} trades in ${groupedTrades.length} locations, ${accumulator.quest.items.length} quest rewards in ${groupedQuests.length} locations, and ${accumulator.static.items.length} static encounters in ${groupedStatics.length} locations in ${mode} mode`,
    );

    return result;
  } catch (error) {
    ConsoleFormatter.error(
      `Error scraping ${mode} special encounters: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    throw error;
  }
}

async function main() {
  const startTime = Date.now();

  try {
    const dataDir = path.join(process.cwd(), "data");
    const classicDir = path.join(dataDir, "classic");
    const remixDir = path.join(dataDir, "remix");

    // Create directories
    await fs.mkdir(classicDir, { recursive: true });
    await fs.mkdir(remixDir, { recursive: true });

    // Scrape both Classic and Remix data
    ConsoleFormatter.info("Scraping Classic and Remix Special Encounters...");

    const [classicData, remixData] = await Promise.all([
      scrapePokedexForSpecialEncounters(CLASSIC_POKEDEX_URL, "classic"),
      scrapePokedexForSpecialEncounters(REMIX_POKEDEX_URL, "remix"),
    ]);

    // Write to separate files for each mode
    ConsoleFormatter.info("Saving data to files...");

    const files = [
      { path: path.join(classicDir, "gifts.json"), data: classicData.gifts },
      { path: path.join(remixDir, "gifts.json"), data: remixData.gifts },
      { path: path.join(classicDir, "trades.json"), data: classicData.trades },
      { path: path.join(remixDir, "trades.json"), data: remixData.trades },
      { path: path.join(classicDir, "quests.json"), data: classicData.quests },
      { path: path.join(remixDir, "quests.json"), data: remixData.quests },
      {
        path: path.join(classicDir, "statics.json"),
        data: classicData.statics,
      },
      { path: path.join(remixDir, "statics.json"), data: remixData.statics },
    ];

    await Promise.all(
      files.map((file) =>
        fs.writeFile(file.path, JSON.stringify(file.data, null, 2)),
      ),
    );

    // Get file stats
    const fileStats = await Promise.all(
      files.map((file) => fs.stat(file.path)),
    );

    const duration = Date.now() - startTime;

    // Calculate statistics for summary
    const classicGiftLocations = classicData.gifts.length;
    const classicTradeLocations = classicData.trades.length;
    const classicQuestLocations = classicData.quests.length;
    const classicStaticLocations = classicData.statics.length;
    const remixGiftLocations = remixData.gifts.length;
    const remixTradeLocations = remixData.trades.length;
    const remixQuestLocations = remixData.quests.length;
    const remixStaticLocations = remixData.statics.length;

    const classicGiftPokemon = classicData.gifts.reduce(
      (sum, location) => sum + location.pokemonIds.length,
      0,
    );
    const classicTradePokemon = classicData.trades.reduce(
      (sum, location) => sum + location.pokemonIds.length,
      0,
    );
    const classicQuestPokemon = classicData.quests.reduce(
      (sum, location) => sum + location.pokemonIds.length,
      0,
    );
    const classicStaticPokemon = classicData.statics.reduce(
      (sum, location) => sum + location.pokemonIds.length,
      0,
    );
    const remixGiftPokemon = remixData.gifts.reduce(
      (sum, location) => sum + location.pokemonIds.length,
      0,
    );
    const remixTradePokemon = remixData.trades.reduce(
      (sum, location) => sum + location.pokemonIds.length,
      0,
    );
    const remixQuestPokemon = remixData.quests.reduce(
      (sum, location) => sum + location.pokemonIds.length,
      0,
    );
    const remixStaticPokemon = remixData.statics.reduce(
      (sum, location) => sum + location.pokemonIds.length,
      0,
    );

    // Success summary
    ConsoleFormatter.printSummary("Special Encounters Scraping Complete!", [
      {
        label: "Classic gift locations",
        value: classicGiftLocations,
        color: "yellow",
      },
      {
        label: "Classic gift Pokémon",
        value: classicGiftPokemon,
        color: "yellow",
      },
      {
        label: "Classic trade locations",
        value: classicTradeLocations,
        color: "yellow",
      },
      {
        label: "Classic trade Pokémon",
        value: classicTradePokemon,
        color: "yellow",
      },
      {
        label: "Classic quest locations",
        value: classicQuestLocations,
        color: "yellow",
      },
      {
        label: "Classic quest Pokémon",
        value: classicQuestPokemon,
        color: "yellow",
      },
      {
        label: "Classic static locations",
        value: classicStaticLocations,
        color: "yellow",
      },
      {
        label: "Classic static Pokémon",
        value: classicStaticPokemon,
        color: "yellow",
      },
      {
        label: "Remix gift locations",
        value: remixGiftLocations,
        color: "yellow",
      },
      { label: "Remix gift Pokémon", value: remixGiftPokemon, color: "yellow" },
      {
        label: "Remix trade locations",
        value: remixTradeLocations,
        color: "yellow",
      },
      {
        label: "Remix trade Pokémon",
        value: remixTradePokemon,
        color: "yellow",
      },
      {
        label: "Remix quest locations",
        value: remixQuestLocations,
        color: "yellow",
      },
      {
        label: "Remix quest Pokémon",
        value: remixQuestPokemon,
        color: "yellow",
      },
      {
        label: "Remix static locations",
        value: remixStaticLocations,
        color: "yellow",
      },
      {
        label: "Remix static Pokémon",
        value: remixStaticPokemon,
        color: "yellow",
      },
      {
        label: "Files saved",
        value: files.map((f) => f.path).join(", "),
        color: "cyan",
      },
      {
        label: "Total file size",
        value: ConsoleFormatter.formatFileSize(
          fileStats.reduce((sum, stat) => sum + stat.size, 0),
        ),
        color: "cyan",
      },
      {
        label: "Duration",
        value: ConsoleFormatter.formatDuration(duration),
        color: "yellow",
      },
    ]);
  } catch (error) {
    ConsoleFormatter.error(
      `Fatal error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
