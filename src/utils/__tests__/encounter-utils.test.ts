import { describe, expect, it } from "vitest";
import type { PokemonOptionType } from "@/loaders/pokemon";
import type { EncounterData } from "@/stores/playthroughs/types";
import {
  buildCapturedSpeciesIdSet,
  buildPokemonUidIndex,
  findPokemonByUid,
  findPokemonWithLocation,
  getAllPokemonWithLocations,
} from "../encounter-utils";

describe("encounter-utils", () => {
  const mockPikachu: PokemonOptionType = {
    id: 25,
    name: "Pikachu",
    nationalDexId: 25,
    status: "captured",
    uid: "pikachu_route1_123",
  };

  const mockCharmander: PokemonOptionType = {
    id: 4,
    name: "Charmander",
    nationalDexId: 4,
    status: "captured",
    uid: "charmander_route1_456",
  };

  const mockBulbasaur: PokemonOptionType = {
    id: 1,
    name: "Bulbasaur",
    nationalDexId: 1,
    status: "captured",
    uid: "bulbasaur_route2_789",
  };

  describe("getAllPokemonWithLocations", () => {
    it("should return empty array for null encounters", () => {
      const result = getAllPokemonWithLocations(null);
      expect(result).toEqual([]);
    });

    it("should return empty array for undefined encounters", () => {
      const result = getAllPokemonWithLocations(undefined);
      expect(result).toEqual([]);
    });

    it("should return empty array for empty encounters", () => {
      const result = getAllPokemonWithLocations({});
      expect(result).toEqual([]);
    });

    it("should include head Pokémon from single Pokémon encounters", () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      const result = getAllPokemonWithLocations(encounters);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        pokemon: mockPikachu,
        locationId: "route1",
      });
    });

    it("should include both Pokémon from fusion encounters", () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: mockCharmander,
          isFusion: true,
          updatedAt: Date.now(),
        },
      };

      const result = getAllPokemonWithLocations(encounters);
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        pokemon: mockPikachu,
        locationId: "route1",
      });
      expect(result).toContainEqual({
        pokemon: mockCharmander,
        locationId: "route1",
      });
    });

    it("should exclude body Pokémon when isFusion is false", () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: mockCharmander, // This should be excluded
          isFusion: false, // Fusion toggled off
          updatedAt: Date.now(),
        },
      };

      const result = getAllPokemonWithLocations(encounters);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        pokemon: mockPikachu,
        locationId: "route1",
      });
      // Body Pokémon should not be included
      expect(
        result.some((item) => item.pokemon.uid === mockCharmander.uid),
      ).toBe(false);
    });

    it("should handle multiple encounters correctly", () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: mockCharmander,
          isFusion: true, // Fusion enabled
          updatedAt: Date.now(),
        },
        route2: {
          head: mockBulbasaur,
          body: null,
          isFusion: false, // Single Pokémon
          updatedAt: Date.now(),
        },
      };

      const result = getAllPokemonWithLocations(encounters);
      expect(result).toHaveLength(3); // Pikachu, Charmander, Bulbasaur
      expect(result).toContainEqual({
        pokemon: mockPikachu,
        locationId: "route1",
      });
      expect(result).toContainEqual({
        pokemon: mockCharmander,
        locationId: "route1",
      });
      expect(result).toContainEqual({
        pokemon: mockBulbasaur,
        locationId: "route2",
      });
    });

    it("should handle encounters with null head and body", () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: null,
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      const result = getAllPokemonWithLocations(encounters);
      expect(result).toHaveLength(0);
    });
  });

  describe("findPokemonByUid", () => {
    it("should find Pokémon in head slot", () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      const result = findPokemonByUid(encounters, "pikachu_route1_123");
      expect(result).toEqual(mockPikachu);
    });

    it("should find Pokémon in body slot", () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: mockCharmander,
          isFusion: true,
          updatedAt: Date.now(),
        },
      };

      const result = findPokemonByUid(encounters, "charmander_route1_456");
      expect(result).toEqual(mockCharmander);
    });

    it("should return null for non-existent UID", () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      const result = findPokemonByUid(encounters, "non-existent-uid");
      expect(result).toBeNull();
    });

    it("should use uid index when provided", () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: mockCharmander,
          isFusion: true,
          updatedAt: Date.now(),
        },
      };

      const pokemonByUid = buildPokemonUidIndex(encounters);

      const result = findPokemonByUid(
        encounters,
        "charmander_route1_456",
        pokemonByUid,
      );

      expect(result).toEqual(mockCharmander);
    });

    it("should fall back to encounter scan when uid is missing from provided index", () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: mockCharmander,
          isFusion: true,
          updatedAt: Date.now(),
        },
      };

      const incompleteIndex = new Map<string, PokemonOptionType>([
        ["pikachu_route1_123", mockPikachu],
      ]);

      const result = findPokemonByUid(
        encounters,
        "charmander_route1_456",
        incompleteIndex,
      );

      expect(result).toEqual(mockCharmander);
    });
  });

  describe("buildPokemonUidIndex", () => {
    it("should index head and body pokemon by uid", () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: mockCharmander,
          isFusion: true,
          updatedAt: Date.now(),
        },
        route2: {
          head: mockBulbasaur,
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      const index = buildPokemonUidIndex(encounters);

      expect(index.get("pikachu_route1_123")).toEqual(mockPikachu);
      expect(index.get("charmander_route1_456")).toEqual(mockCharmander);
      expect(index.get("bulbasaur_route2_789")).toEqual(mockBulbasaur);
      expect(index.size).toBe(3);
    });

    it("should return empty index for null encounters", () => {
      const index = buildPokemonUidIndex(null);
      expect(index.size).toBe(0);
    });
  });

  describe("buildCapturedSpeciesIdSet", () => {
    it("includes species captured directly or via original capture provenance", () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: {
            ...mockCharmander,
            status: "deceased",
            originalReceivalStatus: "captured",
          },
          isFusion: true,
          updatedAt: Date.now(),
        },
      };

      expect(buildCapturedSpeciesIdSet(encounters)).toEqual(new Set([25, 4]));
    });

    it("keeps legacy stored or deceased species when provenance is missing", () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: {
            ...mockPikachu,
            status: "stored",
            originalReceivalStatus: undefined,
          },
          body: {
            ...mockCharmander,
            status: "deceased",
            originalReceivalStatus: undefined,
          },
          isFusion: true,
          updatedAt: Date.now(),
        },
      };

      expect(buildCapturedSpeciesIdSet(encounters)).toEqual(new Set([25, 4]));
    });

    it("ignores non-captured provenance and hidden non-fusion body pokemon", () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: {
            ...mockPikachu,
            status: "received",
            originalReceivalStatus: "received",
          },
          body: mockCharmander,
          isFusion: false,
          updatedAt: Date.now(),
        },
        route2: {
          head: {
            ...mockBulbasaur,
            status: "traded",
            originalReceivalStatus: "traded",
          },
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      expect(buildCapturedSpeciesIdSet(encounters)).toEqual(new Set());
    });
  });

  describe("findPokemonWithLocation", () => {
    it("should find Pokémon with location info", () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      const result = findPokemonWithLocation(encounters, "pikachu_route1_123");
      expect(result).toEqual({
        pokemon: mockPikachu,
        locationId: "route1",
      });
    });

    it("should return null for non-existent UID", () => {
      const encounters: Record<string, EncounterData> = {
        route1: {
          head: mockPikachu,
          body: null,
          isFusion: false,
          updatedAt: Date.now(),
        },
      };

      const result = findPokemonWithLocation(encounters, "non-existent-uid");
      expect(result).toBeNull();
    });
  });
});
