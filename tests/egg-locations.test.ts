import { describe, expect, it } from "vitest";
import eggLocationsData from "../data/shared/egg-locations.json";

interface EggLocation {
  description: string;
  routeName: string;
  source: "gift" | "nest";
}

interface EggLocationsData {
  locations: EggLocation[];
  sources: {
    gifts: number;
    nests: number;
  };
  totalLocations: number;
}

const validRoutePatterns = [
  /^Route \d+$/,
  /^[A-Za-z\s]+$/,
  /^[A-Za-z\s]+(?:Daycare|Forest|Islands|Tunnel|Garden|Road)$/,
];
const giftDescriptionPattern = /egg|Egg|Pokemon|Pokémon/i;
const nestDescriptionPattern = /nest|Nest location/i;
const consecutiveWhitespacePattern = /\s{2,}/;
const surroundingWhitespacePattern = /^\s|\s$/;
const titleCaseRoutePattern = /^[A-Z][a-zA-Z\s\d]+$/;

describe("Egg Locations Data Integrity", () => {
  const data = eggLocationsData as EggLocationsData;

  describe("Data Structure", () => {
    it("should have the correct data structure", () => {
      expect(data).toHaveProperty("totalLocations");
      expect(data).toHaveProperty("sources");
      expect(data).toHaveProperty("locations");
      expect(Array.isArray(data.locations)).toBe(true);
    });

    it("should have correct source counts", () => {
      expect(data.sources).toHaveProperty("gifts");
      expect(data.sources).toHaveProperty("nests");
      expect(typeof data.sources.gifts).toBe("number");
      expect(typeof data.sources.nests).toBe("number");
    });

    it("should have correct total location count", () => {
      expect(data.totalLocations).toBe(data.locations.length);
      expect(data.totalLocations).toBe(data.sources.gifts + data.sources.nests);
    });
  });

  describe("Location Data Validation", () => {
    it("should have valid location objects", () => {
      for (const location of data.locations) {
        expect(location).toHaveProperty("routeName");
        expect(location).toHaveProperty("source");
        expect(location).toHaveProperty("description");

        expect(typeof location.routeName).toBe("string");
        expect(typeof location.source).toBe("string");
        expect(typeof location.description).toBe("string");

        expect(location.routeName.length).toBeGreaterThan(0);
        expect(location.description.length).toBeGreaterThan(0);
        expect(["gift", "nest"]).toContain(location.source);
      }
    });

    it("should have unique route names", () => {
      const routeNames = data.locations.map((loc) => loc.routeName);
      const uniqueRouteNames = new Set(routeNames);
      expect(uniqueRouteNames.size).toBe(routeNames.length);
    });

    it("should have valid route names", () => {
      for (const location of data.locations) {
        const isValidRoute = validRoutePatterns.some((pattern) =>
          pattern.test(location.routeName),
        );
        expect(
          isValidRoute,
          `${location.routeName} is not a valid route name`,
        ).toBe(true);
      }
    });
  });

  describe("Source Counts", () => {
    it("should have exactly 7 gift locations", () => {
      const giftLocations = data.locations.filter(
        (loc) => loc.source === "gift",
      );
      expect(giftLocations.length).toBe(7);
      expect(data.sources.gifts).toBe(7);
    });

    it("should have exactly 9 nest locations", () => {
      const nestLocations = data.locations.filter(
        (loc) => loc.source === "nest",
      );
      expect(nestLocations.length).toBe(9);
      expect(data.sources.nests).toBe(9);
    });

    it("should have correct total count", () => {
      expect(data.totalLocations).toBe(16);
    });
  });

  describe("Specific Location Validation", () => {
    it("should contain all expected gift locations", () => {
      const expectedGiftLocations = [
        "Kanto Daycare",
        "Knot Island",
        "Lavender Town",
        "National Park",
        "Pallet Town",
        "Route 5",
        "Route 8",
      ];

      const actualGiftLocations = data.locations
        .filter((loc) => loc.source === "gift")
        .map((loc) => loc.routeName)
        .sort((left, right) => left.localeCompare(right));

      expect(actualGiftLocations).toEqual(
        expectedGiftLocations.sort((left, right) => left.localeCompare(right)),
      );
    });

    it("should contain all expected nest locations", () => {
      const expectedNestLocations = [
        "Kindle Road",
        "Rock Tunnel",
        "Route 15",
        "Route 23",
        "Route 34",
        "Saffron City",
        "Seafoam Islands",
        "Secret Garden",
        "Viridian Forest",
      ];

      const actualNestLocations = data.locations
        .filter((loc) => loc.source === "nest")
        .map((loc) => loc.routeName)
        .sort((left, right) => left.localeCompare(right));

      expect(actualNestLocations).toEqual(
        expectedNestLocations.sort((left, right) => left.localeCompare(right)),
      );
    });
  });

  describe("Description Validation", () => {
    it("should have meaningful descriptions for gift locations", () => {
      const giftLocations = data.locations.filter(
        (loc) => loc.source === "gift",
      );

      for (const location of giftLocations) {
        expect(location.description.length).toBeGreaterThan(5);
        expect(location.description).toMatch(giftDescriptionPattern);
      }
    });

    it("should have meaningful descriptions for nest locations", () => {
      const nestLocations = data.locations.filter(
        (loc) => loc.source === "nest",
      );

      for (const location of nestLocations) {
        expect(location.description.length).toBeGreaterThan(5);
        expect(location.description).toMatch(nestDescriptionPattern);
      }
    });
  });

  describe("Data Completeness", () => {
    it("should not have any empty or null values", () => {
      for (const [index, location] of data.locations.entries()) {
        expect(
          location.routeName,
          `Location ${index} has empty routeName`,
        ).toBeTruthy();
        expect(
          location.source,
          `Location ${index} has empty source`,
        ).toBeTruthy();
        expect(
          location.description,
          `Location ${index} has empty description`,
        ).toBeTruthy();
      }
    });

    it("should not have any duplicate entries", () => {
      const seen = new Set<string>();

      for (const location of data.locations) {
        const key = `${location.routeName}-${location.source}`;
        expect(
          seen.has(key),
          `Duplicate entry found: ${location.routeName}`,
        ).toBe(false);
        seen.add(key);
      }
    });
  });

  describe("Route Name Formatting", () => {
    it("should have properly formatted route names", () => {
      for (const location of data.locations) {
        // Should not have extra whitespace
        expect(location.routeName).toBe(location.routeName.trim());

        // Should not have consecutive spaces
        expect(location.routeName).not.toMatch(consecutiveWhitespacePattern);

        // Should not start or end with spaces
        expect(location.routeName).not.toMatch(surroundingWhitespacePattern);
      }
    });

    it("should have consistent capitalization", () => {
      for (const location of data.locations) {
        // Route names should be properly capitalized (title case allowed)
        expect(location.routeName).toMatch(titleCaseRoutePattern);
      }
    });
  });
});
