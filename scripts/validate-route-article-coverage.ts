#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { scrapeEncountersFromLocationArticle } from "./scrape-wild-encounters";
import type { EncounterType } from "./types/encounters";
import { ConsoleFormatter } from "./utils/console-utils";
import { loadPokemonNameMap } from "./utils/data-loading-utils";

const ROUTE_VALIDATION_BATCH_SIZE = 6;

interface PokemonEncounter {
  pokemonId: number;
  encounterType: EncounterType;
}

interface RouteEncounters {
  routeName: string;
  encounters: PokemonEncounter[];
}

interface LocationEntry {
  name: string;
}

interface RouteValidationFailure {
  routeName: string;
  reasons: string[];
}

function loadJsonFile<T>(filePath: string): T {
  const payload = readFileSync(filePath, "utf-8");
  return JSON.parse(payload) as T;
}

function getRouteLocations(locations: LocationEntry[]): string[] {
  return locations
    .map((location) => location.name)
    .filter((name) => /^Route \d+$/i.test(name))
    .sort((left, right) => {
      const leftNumber = Number.parseInt(left.replace(/\D+/g, ""), 10);
      const rightNumber = Number.parseInt(right.replace(/\D+/g, ""), 10);
      return leftNumber - rightNumber;
    });
}

function getEncounterSet(encounters: PokemonEncounter[]): Set<string> {
  return new Set(
    encounters.map((entry) => `${entry.pokemonId}:${entry.encounterType}`),
  );
}

function buildValidationFailure(
  routeName: string,
  articleEncounters: PokemonEncounter[],
  classicEncounters: PokemonEncounter[],
  remixEncounters: PokemonEncounter[],
): RouteValidationFailure | null {
  const reasons: string[] = [];

  if (articleEncounters.length === 0) {
    reasons.push("article has no wild encounter rows");
  }

  if (classicEncounters.length === 0 && remixEncounters.length === 0) {
    reasons.push(
      "route missing from both classic and remix encounter datasets",
    );
  }

  if (
    articleEncounters.length > 0 &&
    (classicEncounters.length > 0 || remixEncounters.length > 0)
  ) {
    const articleSet = getEncounterSet(articleEncounters);
    const dataSet = getEncounterSet([...classicEncounters, ...remixEncounters]);
    const hasOverlap = [...articleSet].some((entry) => dataSet.has(entry));

    if (hasOverlap === false) {
      reasons.push("no overlap between article encounters and stored datasets");
    }
  }

  if (reasons.length === 0) {
    return null;
  }

  return {
    routeName,
    reasons,
  };
}

async function main() {
  const dataRoot = path.join(process.cwd(), "data");

  const locations = loadJsonFile<LocationEntry[]>(
    path.join(dataRoot, "shared", "locations.json"),
  );
  const classicRoutes = loadJsonFile<RouteEncounters[]>(
    path.join(dataRoot, "classic", "encounters.json"),
  );
  const remixRoutes = loadJsonFile<RouteEncounters[]>(
    path.join(dataRoot, "remix", "encounters.json"),
  );

  const routeLocations = getRouteLocations(locations);

  if (routeLocations.length === 0) {
    throw new Error("No numbered routes found in shared locations data");
  }

  ConsoleFormatter.printHeader(
    "Route Article Validation",
    "Validating numbered routes against their wiki articles",
  );
  ConsoleFormatter.info(`Checking ${routeLocations.length} route articles...`);

  const pokemonNameMap = await loadPokemonNameMap();
  const validationFailures: RouteValidationFailure[] = [];

  for (
    let offset = 0;
    offset < routeLocations.length;
    offset += ROUTE_VALIDATION_BATCH_SIZE
  ) {
    const batch = routeLocations.slice(
      offset,
      offset + ROUTE_VALIDATION_BATCH_SIZE,
    );

    const batchFailures = await Promise.all(
      batch.map(async (routeName) => {
        const classicEncounters =
          classicRoutes.find((route) => route.routeName === routeName)
            ?.encounters ?? [];
        const remixEncounters =
          remixRoutes.find((route) => route.routeName === routeName)
            ?.encounters ?? [];

        try {
          const articleEncounters = await scrapeEncountersFromLocationArticle(
            routeName,
            pokemonNameMap,
          );

          return buildValidationFailure(
            routeName,
            articleEncounters,
            classicEncounters,
            remixEncounters,
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "unknown scrape error";

          return {
            routeName,
            reasons: [`failed to scrape matching article: ${message}`],
          } satisfies RouteValidationFailure;
        }
      }),
    );

    for (const failure of batchFailures) {
      if (failure) {
        validationFailures.push(failure);
      }
    }
  }

  if (validationFailures.length > 0) {
    ConsoleFormatter.error(
      `Route/article validation failed for ${validationFailures.length} routes`,
    );

    for (const failure of validationFailures) {
      ConsoleFormatter.warn(
        `${failure.routeName}: ${failure.reasons.join("; ")}`,
      );
    }

    process.exit(1);
  }

  ConsoleFormatter.success(
    `All ${routeLocations.length} routes have matching article coverage and data overlap`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    ConsoleFormatter.error(
      `Route/article validation failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    process.exit(1);
  });
}
