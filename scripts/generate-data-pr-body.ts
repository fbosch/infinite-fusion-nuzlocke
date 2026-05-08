#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_OUTPUT_PATH = ".github/data-refresh-pr-body.md";
const POKESPRITE_BASE_URL =
  "https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen7x/regular";

interface PokemonDataEntry {
  id: number;
  name: string;
}

interface FileChangeStats {
  filePath: string;
  additions: number;
  deletions: number;
}

type PokemonChangeStatus = "Added" | "Removed";

interface LocationPokemonDelta {
  status: PokemonChangeStatus;
  version: string;
  location: string;
  source: string;
  pokemonId: number;
}

interface GroupedLocationPokemonDelta {
  status: PokemonChangeStatus;
  version: string;
  location: string;
  source: string;
  pokemonIds: number[];
}

interface RoutePokemonIdsEntry {
  routeName: string;
  pokemonIds: number[];
}

interface RouteEncounterEntry {
  routeName: string;
  encounters: Array<{
    pokemonId: number;
    encounterType: string;
  }>;
}

interface LocationPokemonEntry {
  location: string;
  source: string;
  pokemonId: number;
}

function runGitCommand(args: string[]): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new Error(
      `Failed to execute git command 'git ${args.join(" ")}': ${message}`,
    );
  }
}

function readJsonWithContext<T>(jsonText: string, source: string): T {
  try {
    return JSON.parse(jsonText) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new Error(`Failed to parse JSON from ${source}: ${message}`);
  }
}

function formatPokemonId(pokemonId: number): string {
  return String(pokemonId).padStart(3, "0");
}

function titleCase(value: string): string {
  return value
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function describePokemon(
  pokemonId: number,
  pokemonNameMap: Map<number, string>,
): string {
  const pokemonName = pokemonNameMap.get(pokemonId) ?? "Unknown";
  return `${pokemonName} (${formatPokemonId(pokemonId)})`;
}

function createPokemonSpriteSlug(pokemonName: string): string {
  return pokemonName
    .toLowerCase()
    .replace("♀", "-f")
    .replace("♂", "-m")
    .replaceAll("'", "")
    .replaceAll(".", "")
    .replaceAll(":", "")
    .replaceAll("é", "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function describePokemonWithSprite(
  pokemonId: number,
  pokemonNameMap: Map<number, string>,
): string {
  const pokemonName = pokemonNameMap.get(pokemonId) ?? "Unknown";
  const spriteSlug = createPokemonSpriteSlug(pokemonName);
  const spriteUrl = `${POKESPRITE_BASE_URL}/${spriteSlug}.png`;
  const sprite = `<img src="${spriteUrl}" alt="${pokemonName}" />`;
  return `${sprite} ${describePokemon(pokemonId, pokemonNameMap)}`;
}

function formatPokemonBulletList(
  pokemonIds: number[],
  pokemonNameMap: Map<number, string>,
): string {
  const listItems = pokemonIds
    .map(
      (pokemonId) =>
        `<li>${describePokemonWithSprite(pokemonId, pokemonNameMap)}</li>`,
    )
    .join("");

  return `<ul>${listItems}</ul>`;
}

function escapeMarkdownTableCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function getFileChangeStats(): FileChangeStats[] {
  const output = runGitCommand(["diff", "--numstat", "--", "data/"]);
  if (output.length === 0) {
    return [];
  }

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [additions, deletions, filePath] = line.split("\t");
      if (!additions || !deletions || !filePath) {
        throw new Error(`Unexpected git diff --numstat output: ${line}`);
      }

      return {
        filePath,
        additions: additions === "-" ? 0 : Number.parseInt(additions, 10),
        deletions: deletions === "-" ? 0 : Number.parseInt(deletions, 10),
      };
    })
    .filter((stats) => stats.filePath.endsWith(".json"))
    .sort((a, b) => a.filePath.localeCompare(b.filePath));
}

function getVersionFromFilePath(filePath: string): string {
  const [, version] = filePath.split("/");
  return version ? titleCase(version) : "Unknown";
}

function getSourceFromFilePath(filePath: string): string {
  const fileName = path.basename(filePath, ".json");
  return titleCase(fileName);
}

function isRoutePokemonIdsEntry(value: unknown): value is RoutePokemonIdsEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Record<string, unknown>;
  return typeof entry.routeName === "string" && Array.isArray(entry.pokemonIds);
}

function isRouteEncounterEntry(value: unknown): value is RouteEncounterEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Record<string, unknown>;
  return typeof entry.routeName === "string" && Array.isArray(entry.encounters);
}

function flattenLocationPokemonEntries(
  filePath: string,
  data: unknown,
): LocationPokemonEntry[] {
  if (!Array.isArray(data)) {
    return [];
  }

  const entries: LocationPokemonEntry[] = [];
  const defaultSource = getSourceFromFilePath(filePath);

  for (const item of data) {
    if (isRouteEncounterEntry(item)) {
      for (const encounter of item.encounters) {
        if (
          typeof encounter.pokemonId === "number" &&
          Number.isInteger(encounter.pokemonId) &&
          typeof encounter.encounterType === "string"
        ) {
          entries.push({
            location: item.routeName,
            source: encounter.encounterType,
            pokemonId: encounter.pokemonId,
          });
        }
      }
      continue;
    }

    if (isRoutePokemonIdsEntry(item)) {
      for (const pokemonId of item.pokemonIds) {
        if (typeof pokemonId === "number" && Number.isInteger(pokemonId)) {
          entries.push({
            location: item.routeName,
            source: defaultSource,
            pokemonId,
          });
        }
      }
    }
  }

  return entries;
}

function countEntries(entries: LocationPokemonEntry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const key = `${entry.location}\u0000${entry.source}\u0000${entry.pokemonId}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function diffLocationPokemonEntries(
  status: PokemonChangeStatus,
  version: string,
  previousEntries: LocationPokemonEntry[],
  nextEntries: LocationPokemonEntry[],
): LocationPokemonDelta[] {
  const seenEntries = status === "Added" ? previousEntries : nextEntries;
  const candidateEntries = status === "Added" ? nextEntries : previousEntries;
  const seenCounts = countEntries(seenEntries);
  const deltas: LocationPokemonDelta[] = [];

  for (const entry of candidateEntries) {
    const key = `${entry.location}\u0000${entry.source}\u0000${entry.pokemonId}`;
    const count = seenCounts.get(key) ?? 0;

    if (count > 0) {
      seenCounts.set(key, count - 1);
      continue;
    }

    deltas.push({ status, version, ...entry });
  }

  return deltas;
}

function groupLocationPokemonDeltas(
  deltas: LocationPokemonDelta[],
): GroupedLocationPokemonDelta[] {
  const grouped = new Map<string, GroupedLocationPokemonDelta>();

  for (const delta of deltas) {
    const key = [
      delta.status,
      delta.version,
      delta.location,
      delta.source,
    ].join("\u0000");
    const group = grouped.get(key) ?? {
      status: delta.status,
      version: delta.version,
      location: delta.location,
      source: delta.source,
      pokemonIds: [],
    };

    group.pokemonIds.push(delta.pokemonId);
    grouped.set(key, group);
  }

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      pokemonIds: group.pokemonIds.sort((a, b) => a - b),
    }))
    .sort(
      (a, b) =>
        a.status.localeCompare(b.status) ||
        a.version.localeCompare(b.version) ||
        a.location.localeCompare(b.location) ||
        a.source.localeCompare(b.source),
    );
}

function buildBody(
  fileStats: FileChangeStats[],
  locationDeltas: LocationPokemonDelta[],
  pokemonNameMap: Map<number, string>,
): string {
  const totalAdditions = fileStats.reduce(
    (sum, stats) => sum + stats.additions,
    0,
  );
  const totalDeletions = fileStats.reduce(
    (sum, stats) => sum + stats.deletions,
    0,
  );
  const addedCount = locationDeltas.filter(
    (delta) => delta.status === "Added",
  ).length;
  const removedCount = locationDeltas.filter(
    (delta) => delta.status === "Removed",
  ).length;
  const groupedLocationDeltas = groupLocationPokemonDeltas(locationDeltas);
  const versions = Array.from(
    new Set(groupedLocationDeltas.map((delta) => delta.version)),
  ).sort((a, b) => a.localeCompare(b));

  const lines: string[] = [
    "This PR contains automatically updated Pokemon encounter data.",
    "",
    "## Summary",
    `- Changed files: ${fileStats.length}`,
    `- Line changes: +${totalAdditions} / -${totalDeletions}`,
    `- Pokemon location entries added: ${addedCount}`,
    `- Pokemon location entries removed: ${removedCount}`,
    "",
    "## Changed Data Files",
    ...fileStats.map(
      (stats) =>
        `- \`${stats.filePath}\` (+${stats.additions} / -${stats.deletions})`,
    ),
    "",
    "## Pokemon Location Changes",
  ];

  if (groupedLocationDeltas.length === 0) {
    lines.push("No location-level Pokemon additions/removals detected.");
  } else {
    for (const version of versions) {
      lines.push(
        "",
        `### ${version}`,
        "| Change | Location | Source | Pokemon |",
        "| --- | --- | --- | --- |",
      );

      for (const delta of groupedLocationDeltas.filter(
        (entry) => entry.version === version,
      )) {
        const pokemonList = formatPokemonBulletList(
          delta.pokemonIds,
          pokemonNameMap,
        );
        lines.push(
          `| ${delta.status} | ${escapeMarkdownTableCell(delta.location)} | ${escapeMarkdownTableCell(delta.source)} | ${escapeMarkdownTableCell(pokemonList)} |`,
        );
      }
    }
  }

  lines.push(
    "",
    "Sprites: [PokéSprite Gen 7](https://msikma.github.io/pokesprite/overview/dex-gen7.html)",
    "Generated by: CI data refresh workflow",
    "Triggered by: schedule",
  );

  return `${lines.join("\n")}\n`;
}

async function createPokemonNameMap(): Promise<Map<number, string>> {
  const pokemonDataPath = path.join(
    process.cwd(),
    "data",
    "shared",
    "pokemon-data.json",
  );

  const fileContent = await fs.readFile(pokemonDataPath, "utf8");
  const pokemonData = readJsonWithContext<PokemonDataEntry[]>(
    fileContent,
    pokemonDataPath,
  );

  const pokemonNameMap = new Map<number, string>();
  for (const entry of pokemonData) {
    if (typeof entry.id !== "number" || typeof entry.name !== "string") {
      throw new Error(
        `Invalid Pokemon entry in ${pokemonDataPath}: ${JSON.stringify(entry)}`,
      );
    }

    pokemonNameMap.set(entry.id, entry.name);
  }

  return pokemonNameMap;
}

async function main(): Promise<void> {
  const cliArgs = process.argv.slice(2).filter((arg) => arg !== "--");
  const outputPathArg = cliArgs[0] ?? DEFAULT_OUTPUT_PATH;
  const outputPath = path.resolve(process.cwd(), outputPathArg);

  const fileStats = getFileChangeStats();

  const pokemonNameMap = await createPokemonNameMap();
  const locationDeltas: LocationPokemonDelta[] = [];

  for (const { filePath } of fileStats) {
    const nextContent = await fs.readFile(
      path.resolve(process.cwd(), filePath),
      "utf8",
    );
    const nextJson = readJsonWithContext<unknown>(nextContent, filePath);
    const nextEntries = flattenLocationPokemonEntries(filePath, nextJson);
    let previousEntries: LocationPokemonEntry[] = [];

    try {
      const previousContent = runGitCommand(["show", `HEAD:${filePath}`]);
      const previousJson = readJsonWithContext<unknown>(
        previousContent,
        `HEAD:${filePath}`,
      );
      previousEntries = flattenLocationPokemonEntries(filePath, previousJson);
    } catch {
      previousEntries = [];
    }

    const version = getVersionFromFilePath(filePath);
    locationDeltas.push(
      ...diffLocationPokemonEntries(
        "Added",
        version,
        previousEntries,
        nextEntries,
      ),
      ...diffLocationPokemonEntries(
        "Removed",
        version,
        previousEntries,
        nextEntries,
      ),
    );
  }

  const body = buildBody(fileStats, locationDeltas, pokemonNameMap);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, body, "utf8");

  process.stdout.write(`Generated data PR body: ${outputPath}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown error";
  process.stderr.write(`Failed to generate data PR body: ${message}\n`);
  process.exit(1);
});
