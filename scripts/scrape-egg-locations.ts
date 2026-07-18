#!/usr/bin/env node

import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as cheerio from "cheerio";
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
  routeName: string;
  source: "gift" | "nest";
  description: string;
  pokemonName?: string;
  pokemonId?: number;
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
    !href.includes("/wiki/") ||
    (!parentText.toLowerCase().includes("nest") && !hasNestImage)
  ) {
    return null;
  }

  const urlMatch = href.match(/\/wiki\/([^/]+)/);
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
    const pokemonDataPath = path.join(
      process.cwd(),
      "data",
      "shared",
      "pokemon-data.json",
    );
    const pokemonDataContent = await fs.readFile(pokemonDataPath, "utf8");
    const pokemonArray: PokemonData[] = JSON.parse(pokemonDataContent);

    const pokemonMap = new Map<string, PokemonData>();

    pokemonArray.forEach((pokemon) => {
      // Store by lowercase name for case-insensitive lookup
      pokemonMap.set(pokemon.name.toLowerCase(), pokemon);
    });

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
    .replace(/^(Gift|Egg|Trade|As Egg|Daycare Egg|Random Egg)\s*[-:]?\s*/i, "")
    .replace(/\s*[-:]\s*(Gift|Egg|Trade|As Egg|Daycare Egg|Random Egg)$/i, "")
    // Remove wiki links
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[\[([^\]]+)\|([^\]]+)\]\]/g, "$2")
    // Remove parenthetical content
    .replace(/\s*\([^)]*\)/g, "")
    // Remove common suffixes
    .replace(/\s*[-:]\s*(brought with Heart Scales|from.*|in.*|at.*)$/i, "")
    .trim();

  // Split on common separators and take the first part (which should be the Pokemon name)
  const parts = cleanedText.split(/[-:,]/);
  const pokemonName = parts[0].trim();

  // Validate that it looks like a Pokemon name (starts with capital letter, reasonable length)
  if (
    pokemonName &&
    pokemonName.length >= 3 &&
    pokemonName.length <= 20 &&
    /^[A-Z][a-zA-Z]*$/.test(pokemonName)
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
  if (!name) return null;

  const pokemon = pokemonMap.get(name.toLowerCase());
  return pokemon || null;
}

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

    const $ = cheerio.load(html);
    const eggLocations: EggLocation[] = [];

    // Find tables that might contain egg information
    const tables = $("table");

    tables.each((_tableIndex: number, table: any) => {
      const $table = $(table);
      const rows = $table.find("tr");

      rows.each((_rowIndex: number, row: any) => {
        const $row = $(row);
        const cells = $row.find("td");

        // Skip header rows and rows with insufficient data
        if (cells.length < 3) {
          return;
        }

        // Based on the web search results, the table structure is:
        // Pokemon | Location | Level | Notes
        const pokemonCell = cells.eq(0).text().trim();
        const locationCell = cells.eq(1).text().trim();
        const notesCell = cells.length > 3 ? cells.eq(3).text().trim() : "";

        if (isEggRelated(pokemonCell, notesCell)) {
          const cleanedLocation = cleanLocationName(locationCell);
          // Validate that this is actually a location name, not a Pokémon name
          if (cleanedLocation && isEggLocationName(cleanedLocation)) {
            // Extract Pokemon name and get its data
            const extractedPokemonName = extractPokemonName(pokemonCell);
            const pokemonData = extractedPokemonName
              ? getPokemonByName(extractedPokemonName, pokemonMap)
              : null;

            const eggLocation: EggLocation = {
              routeName: cleanedLocation,
              source: "gift",
              description: `${pokemonCell} - ${notesCell}`.trim(),
            };

            // Add Pokemon info if found
            if (pokemonData) {
              eggLocation.pokemonName = pokemonData.name;
              eggLocation.pokemonId = pokemonData.id;
            }

            eggLocations.push(eggLocation);
          }
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

    const $ = cheerio.load(html);
    const eggLocations: EggLocation[] = [];

    // Look for all text that contains "nest" to find Pokemon nests
    const allText = $("*")
      .contents()
      .filter(function () {
        return this.nodeType === 3; // Text nodes only
      })
      .map(function () {
        return $(this).text();
      })
      .get()
      .join(" ");

    // Also look for alt attributes and titles that contain "nest"
    const allAttributes = $("*")
      .map(function () {
        const alt = $(this).attr("alt") || "";
        const title = $(this).attr("title") || "";
        const text = $(this).text() || "";
        return `${alt} ${title} ${text}`;
      })
      .get()
      .join(" ");

    const combinedContent = `${allText} ${allAttributes}`;

    // Find patterns like "[PokemonName] nest" in the content
    const nestPattern = /([A-Z][a-zA-Z]+)\s+nest/gi;
    const nestMatches = [...combinedContent.matchAll(nestPattern)];

    // Also look for links that contain location names (existing logic)
    const links = $('a[href*="/wiki/"]');
    const locationSet = new Set<string>();

    links.each((_index: number, link: any) => {
      const $link = $(link);
      const href = $link.attr("href") || "";

      // Check if this link is near a nest image or nest text
      const $parent = $link.parent();
      const parentText = $parent.text();
      const hasNestImage = $parent.find('img[alt*="nest"]').length > 0;

      const routeName = getNestLocationName(href, parentText, hasNestImage);
      if (routeName) {
        locationSet.add(routeName);
      }
    });

    // Process Pokemon nest matches
    const pokemonNestMap = new Map<string, string>();
    nestMatches.forEach((match) => {
      const pokemonName = match[1];
      if (pokemonName && pokemonName.length >= 3) {
        // Look for location context around this match
        const matchIndex = combinedContent.indexOf(match[0]);
        const contextBefore = combinedContent.substring(
          Math.max(0, matchIndex - 100),
          matchIndex,
        );
        const contextAfter = combinedContent.substring(
          matchIndex,
          Math.min(combinedContent.length, matchIndex + 100),
        );
        const context = `${contextBefore} ${contextAfter}`;

        // Try to find location names in the context
        const locationMatches = Array.from(locationSet).filter((location) =>
          context.toLowerCase().includes(location.toLowerCase()),
        );

        if (locationMatches.length > 0) {
          // Use the first location found in context
          pokemonNestMap.set(locationMatches[0], pokemonName);
        }
      }
    });

    // Create egg locations from all found locations
    locationSet.forEach((routeName) => {
      const pokemonName = pokemonNestMap.get(routeName);
      const pokemonData = pokemonName
        ? getPokemonByName(pokemonName, pokemonMap)
        : null;

      const eggLocation: EggLocation = {
        routeName: routeName,
        source: "nest",
        description: pokemonName
          ? `${pokemonName} nest location: ${routeName}`
          : `Nest location: ${routeName}`,
      };

      // Add Pokemon info if found
      if (pokemonData) {
        eggLocation.pokemonName = pokemonData.name;
        eggLocation.pokemonId = pokemonData.id;
      }

      eggLocations.push(eggLocation);
    });

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
  [...giftsLocations, ...nestsLocations].forEach((location) => {
    const key = location.routeName.toLowerCase();

    if (!merged.has(key)) {
      merged.set(key, location);
    } else {
      // If we already have this location, merge the sources
      const existing = merged.get(key)!;
      if (existing.source !== location.source) {
        // Update description to include both sources
        existing.description = `${existing.description} | ${location.description}`;
      }
    }
  });

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
    const dataDir = path.join(process.cwd(), "data");
    await fs.mkdir(dataDir, { recursive: true });

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
      totalLocations: mergedLocations.length,
      sources: {
        gifts: giftsLocations.length,
        nests: nestsLocations.length,
      },
      pokemonIdentified: {
        total: locationsWithPokemon.length,
        fromGifts: giftsWithPokemon.length,
        fromNests: nestsWithPokemon.length,
      },
      locations: mergedLocations,
    };

    // Write to file
    ConsoleFormatter.info("Saving egg locations data...");
    const outputPath = path.join(dataDir, "shared", "egg-locations.json");
    await fs.writeFile(outputPath, JSON.stringify(eggLocationsData, null, 2));

    // Get file stats
    const fileStats = await fs.stat(outputPath);
    const duration = Date.now() - startTime;

    // Success summary
    ConsoleFormatter.printSummary("Egg Locations Scraping Complete!", [
      {
        label: "Total egg locations found",
        value: mergedLocations.length,
        color: "yellow",
      },
      {
        label: "From gifts and trades",
        value: giftsLocations.length,
        color: "cyan",
      },
      {
        label: "From Pokémon nests",
        value: nestsLocations.length,
        color: "cyan",
      },
      {
        label: "Pokémon identified",
        value: `${locationsWithPokemon.length}/${mergedLocations.length}`,
        color: "green",
      },
      {
        label: "From gifts (with Pokémon)",
        value: `${giftsWithPokemon.length}/${giftsLocations.length}`,
        color: "cyan",
      },
      {
        label: "From nests (with Pokémon)",
        value: `${nestsWithPokemon.length}/${nestsLocations.length}`,
        color: "cyan",
      },
      { label: "File saved", value: outputPath, color: "green" },
      {
        label: "File size",
        value: ConsoleFormatter.formatFileSize(fileStats.size),
        color: "cyan",
      },
      {
        label: "Duration",
        value: ConsoleFormatter.formatDuration(duration),
        color: "yellow",
      },
    ]);
  } catch (error) {
    exitOnScriptError("Fatal error", error);
  }
}

runDirectScript(import.meta.url, main);
