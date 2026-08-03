#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import type { EncounterType } from "./types/encounters";
import { ConsoleFormatter } from "./utils/console-utils";
import { loadPokemonNameMap } from "./utils/data-loading-utils";
import { ensureEncounterOutputDirectories } from "./utils/encounter-output-utils";
import {
  findPokemonId,
  isPotentialPokemonName,
} from "./utils/pokemon-name-utils";
import {
  exitOnScriptError,
  runDirectScript,
} from "./utils/script-runtime-utils";
import { fetchWikiPageHtml } from "./utils/wiki-fetch-utils";

// Safari Zone area pages
const SAFARI_ZONE_PAGES = [
  "https://infinitefusion.fandom.com/wiki/Safari_Zone_(Area_1)",
  "https://infinitefusion.fandom.com/wiki/Safari_Zone_(Area_2)",
  "https://infinitefusion.fandom.com/wiki/Safari_Zone_(Area_3)",
  "https://infinitefusion.fandom.com/wiki/Safari_Zone_(Area_4)",
  "https://infinitefusion.fandom.com/wiki/Safari_Zone_(Area_5)",
];

interface PokemonEncounter {
  pokemonId: number;
  encounterType: EncounterType;
}

interface RouteEncounters {
  routeName: string;
  encounters: PokemonEncounter[];
}

const ENCOUNTER_TYPE_RULES: Array<{
  type: EncounterType;
  matches: (text: string) => boolean;
}> = [
  {
    type: "surf",
    matches: (text) =>
      text === "surf" ||
      text.includes("surfing") ||
      (text.includes("surf") && !text.includes("rod")),
  },
  {
    type: "fishing",
    matches: (text) =>
      ["old rod", "good rod", "super rod", "fishing rod", "rod fishing"].some(
        (term) => text.includes(term),
      ),
  },
  {
    type: "rock_smash",
    matches: (text) =>
      ["rock smash", "smash rock", "headbutt"].some((term) =>
        text.includes(term),
      ),
  },
  {
    type: "cave",
    matches: (text) =>
      ["cave", "underground", "depths"].some((term) => text.includes(term)),
  },
  {
    type: "special",
    matches: (text) =>
      ["gift", "trade", "static", "overworld"].some((term) =>
        text.includes(term),
      ),
  },
];

/** Detects encounter type from text content like "Surf" or "Old Rod". */
export function detectEncounterType(text: string): EncounterType | null {
  if (!text || typeof text !== "string") {
    return null;
  }

  const normalizedText = text.toLowerCase().trim();

  return (
    ENCOUNTER_TYPE_RULES.find((rule) => rule.matches(normalizedText))?.type ??
    "grass"
  );
}

/**
 * Scrapes encounters from a single Safari Zone area page
 */
async function scrapeSafariAreaPage(
  url: string,
): Promise<RouteEncounters | null> {
  const areaName =
    url
      .split("/")
      .pop()
      ?.replace(/_/g, " ")
      .replace("%28", "(")
      .replace("%29", ")") || "Unknown Safari Area";

  try {
    const html = await fetchWikiPageHtml(url);
    const $ = cheerio.load(html);
    const pokemonNameMap = await loadPokemonNameMap();

    // Get the location name from the page title
    const pageTitle =
      $("h1.page-header__title, #firstHeading").first().text().trim() ||
      areaName;

    const encounters: PokemonEncounter[] = [];
    let currentEncounterType: EncounterType = "grass";

    // Find all encounter tables on the page
    $("table.IFTable.encounterTable").each((_tableIndex, table) => {
      const $table = $(table);

      // Look for encounter type headers in the table
      $table.find("tr").each((_rowIndex, row) => {
        const $row = $(row);

        // Check if this row contains a header that spans multiple columns (encounter type header)
        const headerCell = $row.find("th[colspan]").first();
        if (headerCell.length > 0) {
          const headerText = headerCell.text().trim();
          const detectedType = detectEncounterType(headerText);
          if (detectedType) {
            currentEncounterType = detectedType;
            return; // Skip processing this row for Pokemon
          }
        }

        // Process Pokemon in this row using the current encounter type
        $row.find("td").each((_cellIndex, cell) => {
          const cellText = $(cell).text().trim();

          // Skip headers and non-Pokemon content
          if (isPotentialPokemonName(cellText)) {
            // Try to find Pokemon by name (returns custom ID)
            const pokemonId = findPokemonId(cellText, pokemonNameMap);

            if (pokemonId) {
              encounters.push({
                pokemonId,
                encounterType: currentEncounterType,
              });
            }
          }
        });
      });
    });

    if (encounters.length > 0) {
      return {
        routeName: pageTitle,
        encounters: encounters,
      };
    } else {
      ConsoleFormatter.warn(`No encounters found in ${pageTitle}`);
      return null;
    }
  } catch (error) {
    ConsoleFormatter.error(
      `Error scraping ${areaName}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return null;
  }
}

/**
 * Main function to scrape all Safari Zone areas
 */
async function main() {
  const startTime = Date.now();

  try {
    ConsoleFormatter.printHeader(
      "Safari Zone Encounter Scraper",
      "Scraping Safari Zone area encounters from individual wiki pages",
    );

    const { classicDir, remixDir } = await ensureEncounterOutputDirectories();

    // Scrape all Safari Zone area pages
    const safariEncounters: RouteEncounters[] = [];

    ConsoleFormatter.info(
      `Scraping ${SAFARI_ZONE_PAGES.length} Safari Zone areas...`,
    );

    for (const url of SAFARI_ZONE_PAGES) {
      const encounters = await scrapeSafariAreaPage(url);
      if (encounters) {
        safariEncounters.push(encounters);
        ConsoleFormatter.info(
          `✓ ${encounters.routeName}: ${encounters.encounters.length} encounters`,
        );
      }
    }

    if (safariEncounters.length === 0) {
      ConsoleFormatter.warn("No Safari Zone encounters found!");
      return;
    }

    const totalEncounters = safariEncounters.reduce(
      (sum, area) => sum + area.encounters.length,
      0,
    );
    ConsoleFormatter.success(
      `Successfully scraped ${safariEncounters.length} areas with ${totalEncounters} total encounters`,
    );

    // Save Safari Zone encounters to separate files
    ConsoleFormatter.info("Saving Safari Zone encounter data...");
    const safariClassicPath = path.join(classicDir, "safari-encounters.json");
    const safariRemixPath = path.join(remixDir, "safari-encounters.json");

    await Promise.all([
      fs.writeFile(
        safariClassicPath,
        JSON.stringify(safariEncounters, null, 2),
      ),
      fs.writeFile(safariRemixPath, JSON.stringify(safariEncounters, null, 2)), // Same data for both modes for now
    ]);

    // Get file stats
    const [classicStats, remixStats] = await Promise.all([
      fs.stat(safariClassicPath),
      fs.stat(safariRemixPath),
    ]);

    const duration = Date.now() - startTime;

    ConsoleFormatter.success(`Safari Zone scraping completed successfully!`);
    ConsoleFormatter.info(
      `Safari encounters: ${safariEncounters.length} areas`,
    );
    ConsoleFormatter.info(
      `Classic file: ${(classicStats.size / 1024).toFixed(1)} KB`,
    );
    ConsoleFormatter.info(
      `Remix file: ${(remixStats.size / 1024).toFixed(1)} KB`,
    );
    ConsoleFormatter.info(`Total duration: ${(duration / 1000).toFixed(2)}s`);
  } catch (error) {
    exitOnScriptError("Safari Zone scraping failed", error);
  }
}

runDirectScript(import.meta.url, main);
