#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as cheerio from "cheerio";
import { ConsoleFormatter } from "./utils/console-utils";
import { fetchWikiPageHtml } from "./utils/wiki-fetch-utils";

const POKEDEX_URL = "https://infinitefusion.fandom.com/wiki/Pok%C3%A9dex";

export type DexEntry = { id: number; name: string };

export function parseDexEntriesFromHtml(html: string): DexEntry[] {
  const $ = cheerio.load(html);
  const dexEntries: DexEntry[] = [];

  $("table tr").each((_index: number, element: any) => {
    const cells = $(element).find("td");
    const dexNumber = Number.parseInt(cells.first().text().trim(), 10);
    const nameText = cells.eq(2).text().trim();

    if (!Number.isNaN(dexNumber) && dexNumber > 0 && nameText.length > 0) {
      dexEntries.push({
        id: dexNumber,
        name: nameText,
      });
    }
  });

  return dexEntries;
}

export function extractPokedexSubpageTitles(html: string): string[] {
  const $ = cheerio.load(html);
  const titles = new Set<string>();

  $('a[href^="/wiki/Pok%C3%A9dex/"]').each((_index: number, element: any) => {
    const title = $(element).attr("title")?.trim();
    if (title?.startsWith("Pokédex/") === true) {
      titles.add(title);
    }
  });

  return [...titles];
}

function getPokedexPageUrl(title: string): string {
  const pathSegments = title
    .split("/")
    .map((segment) => encodeURIComponent(segment));
  return `https://infinitefusion.fandom.com/wiki/${pathSegments.join("/")}`;
}

function mergeDexEntries(entries: DexEntry[]): DexEntry[] {
  const entriesById = new Map<number, string>();

  for (const entry of entries) {
    const existingName = entriesById.get(entry.id);
    if (existingName !== undefined && existingName !== entry.name) {
      throw new Error(
        `Conflicting Pokédex entry for ID ${entry.id}: "${existingName}" vs "${entry.name}"`,
      );
    }

    entriesById.set(entry.id, entry.name);
  }

  return [...entriesById.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.id - b.id);
}

async function scrapeDexEntries(): Promise<DexEntry[]> {
  ConsoleFormatter.printHeader(
    "Scraping Pokédex",
    "Scraping Pokédex entries from the wiki",
  );
  const startTime = Date.now();

  try {
    const landingPageHtml = await ConsoleFormatter.withSpinner(
      "Fetching Pokédex page...",
      () => fetchWikiPageHtml(POKEDEX_URL),
    );

    const subpageTitles = extractPokedexSubpageTitles(landingPageHtml);
    ConsoleFormatter.working(
      subpageTitles.length > 0
        ? `Fetching ${subpageTitles.length} Pokédex subpages...`
        : "Extracting Pokédex entries from landing page...",
    );

    const pageHtml = [landingPageHtml];
    for (const title of subpageTitles) {
      pageHtml.push(await fetchWikiPageHtml(getPokedexPageUrl(title)));
    }

    const dexEntries = mergeDexEntries(
      pageHtml.flatMap((html) => parseDexEntriesFromHtml(html)),
    );

    if (dexEntries.length === 0) {
      throw new Error("No Pokédex entries found in wiki tables");
    }

    // Add the special egg entry with ID -1 (required for egg encounters)
    dexEntries.unshift({
      id: -1,
      name: "Egg",
    });

    ConsoleFormatter.success(
      `Found ${dexEntries.length} unique Pokédex entries`,
    );

    // Write to JSON file
    ConsoleFormatter.info("Saving entries to file...");
    const outputPath = path.join(
      process.cwd(),
      "data/shared/base-entries.json",
    );

    // Ensure the shared directory exists
    const sharedDir = path.dirname(outputPath);
    await fs.mkdir(sharedDir, { recursive: true });

    await fs.writeFile(outputPath, JSON.stringify(dexEntries, null, 2));

    const fileStats = await fs.stat(outputPath);
    const duration = Date.now() - startTime;

    // Success summary
    ConsoleFormatter.printSummary("Pokédex Scraping Complete!", [
      { label: "Output saved to", value: outputPath, color: "cyan" },
      { label: "Total entries", value: dexEntries.length, color: "green" },
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

    return dexEntries;
  } catch (error) {
    ConsoleFormatter.error(
      `Error scraping Pokédex: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  scrapeDexEntries();
}
