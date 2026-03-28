#!/usr/bin/env node

import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import type { EncounterType } from "./types/encounters";
import { ConsoleFormatter } from "./utils/console-utils";
import { loadPokemonNameMap } from "./utils/data-loading-utils";
import {
  findPokemonId,
  isPotentialPokemonName,
  type PokemonNameMap,
} from "./utils/pokemon-name-utils";
import { isRoutePattern, processRouteName } from "./utils/route-utils";
import { fetchWikiPageHtml } from "./utils/wiki-fetch-utils";

const WILD_ENCOUNTERS_CLASSIC_URL =
  "https://infinitefusion.fandom.com/wiki/Wild_Encounters";
const WILD_ENCOUNTERS_REMIX_URL =
  "https://infinitefusion.fandom.com/wiki/Wild_Encounters/Remix";

const ROUTE_ARTICLE_BATCH_SIZE = 6;

const WILD_ENCOUNTER_TYPES: readonly EncounterType[] = [
  "grass",
  "cave",
  "rock_smash",
  "surf",
  "fishing",
  "pokeradar",
];

/**
 * Detects encounter type from text content like "Surf", "Old Rod", etc.
 */
export function detectEncounterType(text: string): EncounterType | null {
  if (!text || typeof text !== "string") return null;

  const normalizedText = text.toLowerCase().trim();

  // Pattern-based detection for cleaner, more maintainable code
  const encounterPatterns: Array<{
    type: EncounterType;
    patterns: string[];
    customCheck?: (text: string) => boolean;
  }> = [
    {
      type: "surf",
      patterns: ["surfing"],
      customCheck: (text) =>
        text === "surf" || (text.includes("surf") && !text.includes("rod")),
    },
    {
      type: "fishing",
      patterns: [
        "old rod",
        "good rod",
        "super rod",
        "fishing rod",
        "rod fishing",
      ],
    },
    {
      type: "rock_smash",
      patterns: ["rock smash", "smash rock", "breaking rocks", "break rock"],
    },
    {
      type: "cave",
      patterns: ["cave", "cavern", "underground", "tunnel", "mine", "grotto"],
    },
    {
      type: "grass",
      patterns: ["grass", "walking", "wild grass", "overworld", "lilypads"],
    },
    {
      type: "special",
      patterns: ["gift", "trade", "special", "event"],
    },
    {
      type: "pokeradar",
      patterns: ["pokeradar", "pokéradar", "radar"],
    },
  ];

  for (const { type, patterns, customCheck } of encounterPatterns) {
    const hasPattern = patterns.some((pattern) =>
      normalizedText.includes(pattern),
    );
    const passesCustomCheck = !customCheck || customCheck(normalizedText);

    if (hasPattern || (customCheck && passesCustomCheck && !hasPattern)) {
      return type;
    }
  }

  return null;
}

function isWildEncounterType(encounterType: EncounterType): boolean {
  return WILD_ENCOUNTER_TYPES.includes(encounterType);
}

/**
 * Validates if a potential route name is actually a valid route and not CSS or other content
 */
function isValidRouteName(text: string): boolean {
  if (!text || typeof text !== "string") {
    return false;
  }

  const trimmedText = text.trim();

  // Exclude if too long (CSS content is typically very long)
  if (trimmedText.length > 100) {
    return false;
  }

  // CSS detection removed - our regex pattern is specific enough

  // Exclude very short or meaningless text
  if (trimmedText.length < 3) {
    return false;
  }

  // Note: Removed alpha character ratio check as it was filtering out valid location names with ID numbers

  return true;
}

interface PokemonEncounter {
  pokemonId: number; // Custom Infinite Fusion ID
  encounterType: EncounterType;
}

interface RouteEncounters {
  routeName: string;
  encounters: PokemonEncounter[];
}

function getLocationWikiUrl(locationName: string): string {
  const slug = encodeURIComponent(locationName.trim().replace(/\s+/g, "_"));
  return `https://infinitefusion.fandom.com/wiki/${slug}`;
}

function parseEncounterTable(
  $: cheerio.CheerioAPI,
  table: cheerio.Cheerio<any>,
  pokemonNameMap: PokemonNameMap,
  defaultEncounterType: EncounterType | null,
): PokemonEncounter[] {
  const encounters: PokemonEncounter[] = [];
  let currentEncounterType: EncounterType | null = defaultEncounterType;

  table.find("tr").each((_rowIndex, row) => {
    const $row = $(row);
    const headerCell = $row.find("th[colspan]").first();

    if (headerCell.length > 0) {
      const detectedType = detectEncounterType(headerCell.text().trim());
      currentEncounterType =
        detectedType && isWildEncounterType(detectedType) ? detectedType : null;
      return;
    }

    if (currentEncounterType === null) {
      return;
    }

    const activeEncounterType = currentEncounterType;

    $row.find("td").each((_cellIndex, cell) => {
      const cellText = $(cell).text().trim();
      if (isPotentialPokemonName(cellText) === false) {
        return;
      }

      const pokemonId = findPokemonId(cellText, pokemonNameMap);
      if (pokemonId === null) {
        return;
      }

      encounters.push({
        pokemonId,
        encounterType: activeEncounterType,
      });
    });
  });

  return encounters;
}

async function scrapeEncountersFromLocationArticle(
  locationName: string,
  pokemonNameMap: PokemonNameMap,
): Promise<PokemonEncounter[]> {
  const html = await fetchWikiPageHtml(getLocationWikiUrl(locationName));
  const $ = cheerio.load(html);
  const firstEncounterTable = $(
    ".mw-parser-output table.IFTable.encounterTable",
  ).first();

  if (firstEncounterTable.length === 0) {
    return [];
  }

  const encounters = parseEncounterTable(
    $,
    firstEncounterTable,
    pokemonNameMap,
    null,
  );

  const uniqueByKey = new Map<string, PokemonEncounter>();
  for (const encounter of encounters) {
    uniqueByKey.set(
      `${encounter.pokemonId}:${encounter.encounterType}`,
      encounter,
    );
  }

  return Array.from(uniqueByKey.values());
}

async function backfillMissingRouteArticles(
  routes: RouteEncounters[],
  pokemonNameMap: PokemonNameMap,
): Promise<RouteEncounters[]> {
  const locationsPath = path.join(
    process.cwd(),
    "data",
    "shared",
    "locations.json",
  );
  const locationsData = JSON.parse(
    readFileSync(locationsPath, "utf-8"),
  ) as Array<{
    name: string;
  }>;

  const scrapedRouteNames = new Set(routes.map((route) => route.routeName));
  const missingRouteNames = locationsData
    .map((location) => location.name)
    .filter(
      (locationName) =>
        /^Route \d+$/i.test(locationName) &&
        scrapedRouteNames.has(locationName) === false,
    );

  if (missingRouteNames.length === 0) {
    return routes;
  }

  ConsoleFormatter.info(
    `Backfilling missing route articles: ${missingRouteNames.join(", ")}`,
  );

  const recoveredRoutes: RouteEncounters[] = [];

  for (let i = 0; i < missingRouteNames.length; i += ROUTE_ARTICLE_BATCH_SIZE) {
    const batch = missingRouteNames.slice(i, i + ROUTE_ARTICLE_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (routeName) => {
        try {
          const encounters = await scrapeEncountersFromLocationArticle(
            routeName,
            pokemonNameMap,
          );

          if (encounters.length === 0) {
            ConsoleFormatter.warn(
              `No wild encounter table found on article: ${routeName}`,
            );
            return null;
          }

          return { routeName, encounters } satisfies RouteEncounters;
        } catch (error) {
          ConsoleFormatter.warn(
            `Failed to scrape article for ${routeName}: ${error instanceof Error ? error.message : "unknown error"}`,
          );
          return null;
        }
      }),
    );

    for (const result of batchResults) {
      if (result) {
        recoveredRoutes.push(result);
      }
    }
  }

  if (recoveredRoutes.length > 0) {
    ConsoleFormatter.success(
      `Recovered ${recoveredRoutes.length} missing routes from individual route articles`,
    );
  }

  return [...routes, ...recoveredRoutes];
}

/**
 * Consolidates sub-locations under their parent locations for Nuzlocke rules.
 * For example: Mt. Moon B1F, Mt. Moon B2F, Mt. Moon Summit -> Mt. Moon
 */
function consolidateSubLocations(routes: RouteEncounters[]): RouteEncounters[] {
  // Load existing locations to use as reference
  const locationsPath = path.join(
    process.cwd(),
    "data",
    "shared",
    "locations.json",
  );
  const locationsData = JSON.parse(readFileSync(locationsPath, "utf-8"));
  const existingLocationNames = locationsData.map((loc: any) => loc.name);

  const locationGroups = new Map<string, PokemonEncounter[]>();

  for (const route of routes) {
    // Find if this route is a sub-location of any existing location
    const parentLocation = findParentLocation(
      route.routeName,
      existingLocationNames,
    );
    const baseLocation = parentLocation || route.routeName;

    if (!locationGroups.has(baseLocation)) {
      locationGroups.set(baseLocation, []);
    }

    // Add all encounters to the base location (will deduplicate later)
    locationGroups.get(baseLocation)?.push(...route.encounters);
  }

  // Convert back to RouteEncounters format with deduplication
  return Array.from(locationGroups.entries()).map(([routeName, encounters]) => {
    // Deduplicate encounters by creating a unique key for each encounter
    const uniqueEncounters = new Map<string, PokemonEncounter>();

    for (const encounter of encounters) {
      const key = `${encounter.pokemonId}-${encounter.encounterType}`;
      if (!uniqueEncounters.has(key)) {
        uniqueEncounters.set(key, encounter);
      }
    }

    return {
      routeName,
      encounters: Array.from(uniqueEncounters.values()).sort((a, b) => {
        // Sort by encounter type first, then by pokemon ID
        const typeOrder = {
          grass: 0,
          cave: 1,
          rock_smash: 2,
          surf: 3,
          fishing: 4,
          special: 5,
          pokeradar: 6,
        };
        const typeComparison =
          typeOrder[a.encounterType] - typeOrder[b.encounterType];
        return typeComparison !== 0
          ? typeComparison
          : a.pokemonId - b.pokemonId;
      }),
    };
  });
}

/**
 * Finds if a route name is a sub-location of any existing location.
 * Returns the parent location name if found, null otherwise.
 */
function findParentLocation(
  routeName: string,
  existingLocations: string[],
): string | null {
  // Define valid sub-location suffixes that indicate a real sub-location
  const validSubLocationSuffixes = [
    "B1F",
    "B2F",
    "B3F",
    "B4F",
    "B5F",
    "1F",
    "2F",
    "3F",
    "4F",
    "5F",
    "WTF",
    "F1",
    "F2",
    "F3",
    "F4",
    "F5",
    "F6",
    "F7",
    "F8",
    "F9", // Pokemon Tower format
    "B1",
    "B2",
    "B3",
    "B4",
    "B5",
    "B6",
    "B7",
    "B8",
    "B9", // Seafoam Islands format
    "(Area 1)",
    "(Area 2)",
    "(Area 3)",
    "(Area 4)",
    "(Area 5)",
    "(Area 6)", // Safari Zone format
    "Summit",
    "Square",
    "Entrance",
    "Exit",
    "Top",
    "Bottom",
    "Upper",
    "Lower",
    "North",
    "South",
    "East",
    "West",
    "Interior",
    "Exterior",
    "Cave",
    "Depths",
    "Hidden",
    "Center",
  ];

  // Check if any existing location is a prefix of the route name
  for (const location of existingLocations) {
    if (routeName.startsWith(location) && routeName !== location) {
      // Get the remainder after the location name
      const remainder = routeName.substring(location.length).trim();

      // Only consolidate if the remainder is a valid sub-location suffix
      if (
        remainder.length > 0 &&
        validSubLocationSuffixes.some((suffix) => remainder === suffix)
      ) {
        return location;
      }
    }
  }

  return null;
}

async function scrapeWildEncounters(
  url: string,
  isRemix: boolean = false,
): Promise<RouteEncounters[]> {
  ConsoleFormatter.printHeader(
    "Scraping Wild Encounters",
    "Scraping wild encounter data from the wiki",
  );
  try {
    const modeType = isRemix ? "Remix" : "Classic";

    // Fetch the webpage
    const html = await ConsoleFormatter.withSpinner(
      `Fetching ${modeType} Wild Encounters page...`,
      () => fetchWikiPageHtml(url),
    );

    const $ = cheerio.load(html);
    const pokemonNameMap = await loadPokemonNameMap(); // Use cached data

    // Focus on main content area
    const mainContent = $(".mw-parser-output");
    const routes: RouteEncounters[] = [];
    const routesSeen = new Set<string>(); // Track cleaned route names

    // Find route headings - back to original approach but with pre-compiled regex
    const allElements = mainContent.find("*");

    let routesProcessed = 0;
    const progressBar = ConsoleFormatter.createMiniProgressBar(
      allElements.length,
      "Scanning for routes...",
    );

    allElements.each((index: number, element: any) => {
      const $element = $(element);
      const fullText = $element.text().trim();

      // Update progress periodically
      if (index % 100 === 0) {
        progressBar.update(index, {
          status: `Scanning elements... (${routesProcessed} routes found)`,
        });
      }

      // Look for route patterns
      if (isRoutePattern(fullText) && isValidRouteName(fullText)) {
        // Make sure this isn't deeply nested content (allow some basic formatting)
        const children = $element.children();
        if (children.length <= 2) {
          const { cleanName: cleanedRouteName, routeId } =
            processRouteName(fullText);

          // Additional validation on the cleaned name
          if (!isValidRouteName(cleanedRouteName)) {
            return;
          }

          // Create unique identifier that includes both name and ID for duplicate detection
          const uniqueIdentifier = routeId
            ? `${cleanedRouteName}#${routeId}`
            : cleanedRouteName;

          // Skip if we've already processed this exact route (including ID)
          if (routesSeen.has(uniqueIdentifier)) {
            return;
          }
          routesSeen.add(uniqueIdentifier);

          routesProcessed++;
          progressBar.update(index, {
            status: `Processing: ${cleanedRouteName}`,
          });

          // Find Pokemon data in the immediately following table
          const encounters: PokemonEncounter[] = [];

          // Look for the next table with classes 'IFTable encounterTable'
          let nextElement = $element.next();
          let tablesChecked = 0;
          while (nextElement.length > 0 && tablesChecked < 10) {
            if (nextElement.is("table.IFTable.encounterTable")) {
              // Found the encounter table for this route - process it
              encounters.push(
                ...parseEncounterTable($, nextElement, pokemonNameMap, "grass"),
              );

              break; // Found and processed one table, stop looking
            }

            // Stop if we hit another route heading
            if (
              isRoutePattern(nextElement.text().trim()) &&
              isValidRouteName(nextElement.text().trim())
            ) {
              break;
            }

            tablesChecked++;
            nextElement = nextElement.next();
          }

          if (encounters.length > 0) {
            const routeData: RouteEncounters = {
              routeName: cleanedRouteName,
              encounters: encounters,
            };
            routes.push(routeData);
          } else {
            console.debug("No encounters found for route:", cleanedRouteName);
          }
        }
      }
    });

    progressBar.update(allElements.length, { status: "Scanning complete!" });
    progressBar.stop();
    ConsoleFormatter.success(`${modeType} scraping complete!`);

    const routesWithArticleBackfill = await backfillMissingRouteArticles(
      routes,
      pokemonNameMap,
    );

    // Consolidate sub-locations under parent locations for Nuzlocke rules
    const consolidatedRoutes = consolidateSubLocations(
      routesWithArticleBackfill,
    );
    ConsoleFormatter.info(
      `Consolidated ${routesWithArticleBackfill.length} locations into ${consolidatedRoutes.length} unique locations`,
    );

    return consolidatedRoutes;
  } catch (error) {
    ConsoleFormatter.error(
      `Error scraping ${isRemix ? "Remix" : "Classic"} encounters: ${error instanceof Error ? error.message : "Unknown error"}`,
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

    const [classicRoutes, remixRoutes] = await Promise.all([
      (async () => {
        ConsoleFormatter.info("Scraping Classic Mode encounters...");
        return scrapeWildEncounters(WILD_ENCOUNTERS_CLASSIC_URL, false);
      })(),
      (async () => {
        ConsoleFormatter.info("Scraping Remix Mode encounters...");
        return scrapeWildEncounters(WILD_ENCOUNTERS_REMIX_URL, true);
      })(),
    ]);

    // Write separate files in parallel
    ConsoleFormatter.info("Saving encounter data to files...");
    const classicPath = path.join(classicDir, "encounters.json");
    const remixPath = path.join(remixDir, "encounters.json");

    await Promise.all([
      fs.writeFile(classicPath, JSON.stringify(classicRoutes, null, 2)),
      fs.writeFile(remixPath, JSON.stringify(remixRoutes, null, 2)),
    ]);

    // Get file stats in parallel
    const [classicStats, remixStats] = await Promise.all([
      fs.stat(classicPath),
      fs.stat(remixPath),
    ]);

    const duration = Date.now() - startTime;

    ConsoleFormatter.success(`Scraping completed successfully!`);
    ConsoleFormatter.info(
      `Classic encounters: ${classicRoutes.length} routes (${(classicStats.size / 1024).toFixed(1)} KB)`,
    );
    ConsoleFormatter.info(
      `Remix encounters: ${remixRoutes.length} routes (${(remixStats.size / 1024).toFixed(1)} KB)`,
    );
    ConsoleFormatter.info(`Total duration: ${(duration / 1000).toFixed(2)}s`);
  } catch (error) {
    ConsoleFormatter.error(
      `Scraping failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
