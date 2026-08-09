#!/usr/bin/env node

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type CheerioAPI, load } from "cheerio";
import type { Element } from "domhandler";
import { ConsoleFormatter } from "./utils/console-utils";
import { cleanLocationName } from "./utils/location-utils";
import {
  exitOnScriptError,
  runDirectScript,
} from "./utils/script-runtime-utils";
import { fetchWikiPageHtml } from "./utils/wiki-fetch-utils";

const GIFTS_AND_TRADES_URL =
  "https://infinitefusion.fandom.com/wiki/List_of_Gift_Pok%C3%A9mon_and_Trades";
const POKEMON_NESTS_URL =
  "https://infinitefusion.fandom.com/wiki/Pok%C3%A9mon_Nests";

interface PokemonData {
  id: number;
  name: string;
  nationalDexId: number;
}

interface EggLocation {
  description: string;
  pokemonId?: number;
  pokemonName?: string;
  routeName: string;
  source: "gift" | "nest";
}

const EGG_KEYWORDS = ["egg", "as egg", "daycare egg", "random egg"] as const;

const EGG_POKEMON_NAMES = [
  "togepi",
  "azurill",
  "pichu",
  "cleffa",
  "igglybuff",
  "bonsly",
  "mantyke",
  "happiny",
  "elekid",
  "magby",
  "smoochum",
  "ralts",
  "pawniard",
  "bagon",
] as const;

const LOCATION_KEYWORDS = [
  "route",
  "city",
  "town",
  "island",
  "park",
  "daycare",
  "mt.",
  "mountain",
  "cave",
  "forest",
] as const;
const WIKI_PATH_PATTERN = /\/wiki\/([^/]+)/;
const EGG_PREFIX_PATTERN =
  /^(Gift|Egg|Trade|As Egg|Daycare Egg|Random Egg)\s*[-:]?\s*/i;
const EGG_SUFFIX_PATTERN =
  /\s*[-:]\s*(Gift|Egg|Trade|As Egg|Daycare Egg|Random Egg)$/i;
const EGG_LOCATION_SUFFIX_PATTERN =
  /\s*[-:]\s*(brought with Heart Scales|from.*|in.*|at.*)$/i;
const EGG_NAME_SEPARATOR = /[-:,]/;
const POKEMON_NAME_PATTERN = /^[A-Z][a-zA-Z]*$/;
const NEST_PATTERN = /([A-Z][a-zA-Z]+)\s+nest/gi;

/** Returns whether a gift/trade row describes an egg encounter. */
export function isEggRelated(pokemonCell: string, notesCell: string): boolean {
  const pokemonText = pokemonCell.toLowerCase();
  const notesText = notesCell.toLowerCase();

  return (
    EGG_KEYWORDS.some(
      (keyword) => pokemonText.includes(keyword) || notesText.includes(keyword),
    ) || EGG_POKEMON_NAMES.some((name) => pokemonText.includes(name))
  );
}

/** Returns whether a cleaned row value is a usable egg-location name. */
export function isEggLocationName(location: string): boolean {
  const normalizedLocation = location.toLowerCase();

  return (
    location.length > 2 &&
    !normalizedLocation.includes("pokemon") &&
    !normalizedLocation.includes("egg") &&
    LOCATION_KEYWORDS.some((keyword) => normalizedLocation.includes(keyword))
  );
}

/** Returns the nest location encoded by a nearby wiki link, when usable. */
export function getNestLocationName(
  href: string,
  parentText: string,
  hasNestImage: boolean,
): string | null {
  if (
    !(
      href.includes("/wiki/") &&
      (parentText.toLowerCase().includes("nest") || hasNestImage)
    )
  ) {
    return null;
  }

  const urlMatch = href.match(WIKI_PATH_PATTERN);
  if (!urlMatch) {
    return null;
  }

  const routeName = decodeURIComponent(urlMatch[1])
    .replace(/_/g, " ")
    .replace(/%20/g, " ")
    .trim();
  const normalizedRouteName = routeName.toLowerCase();

  if (
    routeName.length <= 2 ||
    normalizedRouteName.includes("pokemon") ||
    normalizedRouteName.includes("nest") ||
    normalizedRouteName.includes("egg") ||
    normalizedRouteName.includes("file:")
  ) {
    return null;
  }

  return routeName;
}

/**
 * Loads Pokemon data for name-to-ID mapping
 */
async function loadPokemonData(): Promise<Map<string, PokemonData>> {
  try {
    const pokemonDataPath = join(
      process.cwd(),
      "data",
      "shared",
      "pokemon-data.json",
    );
    const pokemonDataContent = await readFile(pokemonDataPath, "utf8");
    const pokemonArray: PokemonData[] = JSON.parse(pokemonDataContent);

    const pokemonMap = new Map<string, PokemonData>();

    for (const pokemon of pokemonArray) {
      // Store by lowercase name for case-insensitive lookup
      pokemonMap.set(pokemon.name.toLowerCase(), pokemon);
    }

    ConsoleFormatter.success(
      `Loaded ${pokemonMap.size} Pokemon for name mapping`,
    );
    return pokemonMap;
  } catch (error) {
    ConsoleFormatter.error(
      `Error loading Pokemon data: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    throw error;
  }
}

/**
 * Extracts a clean Pokemon name from text
 */
function extractPokemonName(text: string): string | null {
  if (!text || typeof text !== "string") {
    return null;
  }

  // Remove common prefixes and suffixes
  const cleanedText = text
    .replace(EGG_PREFIX_PATTERN, "")
    .replace(EGG_SUFFIX_PATTERN, "")
    // Remove wiki links
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[\[([^\]]+)\|([^\]]+)\]\]/g, "$2")
    // Remove parenthetical content
    .replace(/\s*\([^)]*\)/g, "")
    // Remove common suffixes
    .replace(EGG_LOCATION_SUFFIX_PATTERN, "")
    .trim();

  // Split on common separators and take the first part (which should be the Pokemon name)
  const parts = cleanedText.split(EGG_NAME_SEPARATOR);
  const pokemonName = parts[0].trim();

  // Validate that it looks like a Pokemon name (starts with capital letter, reasonable length)
  if (
    pokemonName &&
    pokemonName.length >= 3 &&
    pokemonName.length <= 20 &&
    POKEMON_NAME_PATTERN.test(pokemonName)
  ) {
    return pokemonName;
  }

  return null;
}

/**
 * Gets Pokemon data by name
 */
function getPokemonByName(
  name: string,
  pokemonMap: Map<string, PokemonData>,
): PokemonData | null {
  if (!name) {
    return null;
  }

  const pokemon = pokemonMap.get(name.toLowerCase());
  return pokemon || null;
}

function extractGiftEggLocation(
  $: CheerioAPI,
  row: Element,
  pokemonMap: Map<string, PokemonData>,
): EggLocation | null {
  const cells = $(row).find("td");
  if (cells.length < 3) {
    return null;
  }

  const pokemonCell = cells.eq(0).text().trim();
  const locationCell = cells.eq(1).text().trim();
  const notesCell = cells.length > 3 ? cells.eq(3).text().trim() : "";
  if (isEggRelated(pokemonCell, notesCell) === false) {
    return null;
  }

  const routeName = cleanLocationName(locationCell);
  if (!(routeName && isEggLocationName(routeName))) {
    return null;
  }

  const pokemon = getPokemonByName(
    extractPokemonName(pokemonCell) ?? "",
    pokemonMap,
  );
  return {
    description: `${pokemonCell} - ${notesCell}`.trim(),
    ...(pokemon && { pokemonId: pokemon.id, pokemonName: pokemon.name }),
    routeName,
    source: "gift",
  };
}

const getNestPageContent = ($: CheerioAPI): string => {
  const textContent = $("*")
    .contents()
    .filter(function () {
      return this.nodeType === 3;
    })
    .map(function () {
      return $(this).text();
    })
    .get()
    .join(" ");
  const attributeContent = $("*")
    .map(function () {
      const alt = $(this).attr("alt") || "";
      const title = $(this).attr("title") || "";
      const text = $(this).text() || "";
      return `${alt} ${title} ${text}`;
    })
    .get()
    .join(" ");

  return `${textContent} ${attributeContent}`;
};

const collectNestLocations = ($: CheerioAPI): Set<string> => {
  const locations = new Set<string>();

  $('a[href*="/wiki/"]').each((_index: number, link: Element) => {
    const $link = $(link);
    const parent = $link.parent();
    const routeName = getNestLocationName(
      $link.attr("href") || "",
      parent.text(),
      parent.find('img[alt*="nest"]').length > 0,
    );

    if (routeName) {
      locations.add(routeName);
    }
  });

  return locations;
};

const collectPokemonNestLocations = (
  content: string,
  locations: Set<string>,
): Map<string, string> => {
  const pokemonNests = new Map<string, string>();

  for (const match of content.matchAll(NEST_PATTERN)) {
    const [, pokemonName] = match;
    if (!pokemonName || pokemonName.length < 3) {
      continue;
    }

    const matchIndex = content.indexOf(match[0]);
    const contextBefore = content.slice(
      Math.max(0, matchIndex - 100),
      matchIndex,
    );
    const contextAfter = content.slice(matchIndex, matchIndex + 100);
    const context = `${contextBefore} ${contextAfter}`;
    const location = Array.from(locations).find((candidate) =>
      context.toLowerCase().includes(candidate.toLowerCase()),
    );

    if (location) {
      pokemonNests.set(location, pokemonName);
    }
  }

  return pokemonNests;
};

const createNestEggLocation = (
  routeName: string,
  pokemonName: string | undefined,
  pokemonMap: Map<string, PokemonData>,
): EggLocation => {
  const pokemon = pokemonName
    ? getPokemonByName(pokemonName, pokemonMap)
    : null;

  return {
    description: pokemonName
      ? `${pokemonName} nest location: ${routeName}`
      : `Nest location: ${routeName}`,
    ...(pokemon && { pokemonId: pokemon.id, pokemonName: pokemon.name }),
    routeName,
    source: "nest",
  };
};

/**
 * Extracts egg-related locations from the gifts and trades page
 */
async function scrapeGiftsAndTradesForEggs(
  pokemonMap: Map<string, PokemonData>,
): Promise<EggLocation[]> {
  ConsoleFormatter.printHeader(
    "Scraping Gifts and Trades for Eggs",
    "Extracting egg locations from the gifts and trades page",
  );

  try {
    const html = await ConsoleFormatter.withSpinner(
      "Fetching gifts and trades page...",
      () => fetchWikiPageHtml(GIFTS_AND_TRADES_URL),
    );

    const $ = load(html);
    const eggLocations: EggLocation[] = [];

    // Find tables that might contain egg information
    const tables = $("table");

    tables.each((_tableIndex: number, table: Element) => {
      const $table = $(table);
      const rows = $table.find("tr");

      rows.each((_rowIndex: number, row: Element) => {
        const eggLocation = extractGiftEggLocation($, row, pokemonMap);
        if (eggLocation) {
          eggLocations.push(eggLocation);
        }
      });
    });

    ConsoleFormatter.success(
      `Found ${eggLocations.length} egg locations from gifts and trades`,
    );
    return eggLocations;
  } catch (error) {
    ConsoleFormatter.error(
      `Error scraping gifts and trades for eggs: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    throw error;
  }
}

/**
 * Extracts egg-related locations from the Pokémon nests page
 */
async function scrapePokemonNestsForEggs(
  pokemonMap: Map<string, PokemonData>,
): Promise<EggLocation[]> {
  ConsoleFormatter.printHeader(
    "Scraping Pokémon Nests for Eggs",
    "Extracting egg locations from the Pokémon nests page",
  );

  try {
    const html = await ConsoleFormatter.withSpinner(
      "Fetching Pokémon nests page...",
      () => fetchWikiPageHtml(POKEMON_NESTS_URL),
    );

    const $ = load(html);
    const content = getNestPageContent($);
    const locations = collectNestLocations($);
    const pokemonNests = collectPokemonNestLocations(content, locations);
    const eggLocations = Array.from(locations, (routeName) =>
      createNestEggLocation(routeName, pokemonNests.get(routeName), pokemonMap),
    );

    ConsoleFormatter.success(
      `Found ${eggLocations.length} egg locations from Pokémon nests`,
    );
    return eggLocations;
  } catch (error) {
    ConsoleFormatter.error(
      `Error scraping Pokémon nests for eggs: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    throw error;
  }
}

/**
 * Merges and deduplicates egg locations from both sources
 */
function mergeEggLocations(
  giftsLocations: EggLocation[],
  nestsLocations: EggLocation[],
): EggLocation[] {
  const merged = new Map<string, EggLocation>();

  // Add all locations from both sources
  for (const location of [...giftsLocations, ...nestsLocations]) {
    const key = location.routeName.toLowerCase();

    const existing = merged.get(key);
    if (existing) {
      // If we already have this location, merge the sources
      if (existing.source !== location.source) {
        // Update description to include both sources
        existing.description = `${existing.description} | ${location.description}`;
      }
    } else {
      merged.set(key, location);
    }
  }

  // Convert back to array, sort, and filter out invalid entries
  return Array.from(merged.values())
    .filter(
      (location) =>
        location.routeName &&
        location.routeName.length > 2 &&
        !location.routeName.toLowerCase().includes("file:") &&
        !location.routeName.toLowerCase().includes("pokémon") &&
        !location.routeName.toLowerCase().includes("nest") &&
        !location.routeName.toLowerCase().includes("egg"),
    )
    .sort((a, b) => a.routeName.localeCompare(b.routeName));
}

async function main() {
  const startTime = Date.now();

  try {
    const dataDir = join(process.cwd(), "data");
    await mkdir(dataDir, { recursive: true });

    ConsoleFormatter.info("Loading Pokemon data for name mapping...");
    const pokemonMap = await loadPokemonData();

    ConsoleFormatter.info("Scraping egg locations from multiple sources...");

    // Scrape both sources
    const [giftsLocations, nestsLocations] = await Promise.all([
      scrapeGiftsAndTradesForEggs(pokemonMap),
      scrapePokemonNestsForEggs(pokemonMap),
    ]);

    // Merge and deduplicate locations
    const mergedLocations = mergeEggLocations(giftsLocations, nestsLocations);

    // Calculate Pokemon identification statistics
    const locationsWithPokemon = mergedLocations.filter(
      (loc) => loc.pokemonName && loc.pokemonId,
    );
    const giftsWithPokemon = giftsLocations.filter(
      (loc) => loc.pokemonName && loc.pokemonId,
    );
    const nestsWithPokemon = nestsLocations.filter(
      (loc) => loc.pokemonName && loc.pokemonId,
    );

    // Create the output data structure
    const eggLocationsData = {
      locations: mergedLocations,
      pokemonIdentified: {
        fromGifts: giftsWithPokemon.length,
        fromNests: nestsWithPokemon.length,
        total: locationsWithPokemon.length,
      },
      sources: {
        gifts: giftsLocations.length,
        nests: nestsLocations.length,
      },
      totalLocations: mergedLocations.length,
    };

    // Write to file
    ConsoleFormatter.info("Saving egg locations data...");
    const outputPath = join(dataDir, "shared", "egg-locations.json");
    await writeFile(outputPath, JSON.stringify(eggLocationsData, null, 2));

    // Get file stats
    const fileStats = await stat(outputPath);
    const duration = Date.now() - startTime;

    // Success summary
    ConsoleFormatter.printSummary("Egg Locations Scraping Complete!", [
      {
        color: "yellow",
        label: "Total egg locations found",
        value: mergedLocations.length,
      },
      {
        color: "cyan",
        label: "From gifts and trades",
        value: giftsLocations.length,
      },
      {
        color: "cyan",
        label: "From Pokémon nests",
        value: nestsLocations.length,
      },
      {
        color: "green",
        label: "Pokémon identified",
        value: `${locationsWithPokemon.length}/${mergedLocations.length}`,
      },
      {
        color: "cyan",
        label: "From gifts (with Pokémon)",
        value: `${giftsWithPokemon.length}/${giftsLocations.length}`,
      },
      {
        color: "cyan",
        label: "From nests (with Pokémon)",
        value: `${nestsWithPokemon.length}/${nestsLocations.length}`,
      },
      { color: "green", label: "File saved", value: outputPath },
      {
        color: "cyan",
        label: "File size",
        value: ConsoleFormatter.formatFileSize(fileStats.size),
      },
      {
        color: "yellow",
        label: "Duration",
        value: ConsoleFormatter.formatDuration(duration),
      },
    ]);
  } catch (error) {
    exitOnScriptError("Fatal error", error);
  }
}

runDirectScript(import.meta.url, main);
