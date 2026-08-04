import { PokemonStatus } from "@/loaders/pokemon";
import { type GameMode, isGameMode, type Playthrough } from "./types";

/**
 * Migration data type for playthrough migrations
 */
interface MigrationData {
  id?: string;
  name?: string;
  customLocations?: unknown[];
  encounters?: Record<string, unknown>;
  team?: unknown;
  gameMode?: GameMode;
  remixMode?: boolean;
  createdAt?: number;
  updatedAt?: number;
  version?: string;
  [key: string]: unknown;
}

/**
 * Migrate remixMode to gameMode field
 */
const migrateRemixMode = (data: MigrationData): MigrationData => {
  if (
    data.remixMode !== undefined &&
    (data.gameMode === undefined || data.gameMode === "classic")
  ) {
    return {
      ...data,
      gameMode: data.remixMode ? "remix" : "classic",
      remixMode: undefined, // Remove the old field
      version: "1.0.0",
    };
  }
  return data;
};

/**
 * Ensure team field exists with default empty team
 */
const migrateTeamField = (data: MigrationData): MigrationData => {
  let team = data.team;

  if (!team) {
    // No team field exists, create default
    team = { members: Array.from({ length: 6 }, () => null) };
  } else if (team && typeof team === "object" && "members" in team) {
    // Team exists, ensure it has the right structure
    const members = (team as Record<string, unknown>).members;
    if (Array.isArray(members)) {
      // Ensure it's the right length and has null values for empty slots
      const fixedMembers = new Array(6).fill(null);
      members.forEach((member, index) => {
        if (index < 6 && member !== null) {
          fixedMembers[index] = member;
        }
      });
      team = { members: fixedMembers };
    } else if (typeof members === "object" && members !== null) {
      // Members is a record/object, convert to array format
      const fixedMembers = new Array(6).fill(null);
      Object.entries(members as Record<string, unknown>).forEach(
        ([key, member]) => {
          const index = parseInt(key, 10);
          if (index >= 0 && index < 6 && member !== null) {
            fixedMembers[index] = member;
          }
        },
      );
      team = { members: fixedMembers };
    }
  }

  return { ...data, team };
};

/**
 * Ensure version field exists with default
 */
const migrateVersion = (data: MigrationData): MigrationData => {
  if (data.version === undefined) {
    return { ...data, version: "1.0.0" };
  }
  return data;
};

/**
 * Clean up old remixMode field
 */
const cleanupRemixMode = (data: MigrationData): MigrationData => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { remixMode, ...cleanData } = data;
  return cleanData;
};

/**
 * Migrate team member schema from encounter IDs to Pokémon UIDs
 */
const migrateTeamMemberSchema = (data: MigrationData): MigrationData => {
  if (data.team && typeof data.team === "object" && "members" in data.team) {
    const team = data.team as Record<string, unknown>;
    const members = team.members;

    if (Array.isArray(members)) {
      const migratedMembers = members.map((member: unknown) => {
        if (member && typeof member === "object") {
          // Check if this is the old format with encounter IDs
          if ("headEncounterId" in member || "bodyEncounterId" in member) {
            // Convert to new format - for now, we'll set empty UIDs
            // since we can't reliably reconstruct the old UIDs
            return {
              headPokemonUid: "",
              bodyPokemonUid: "",
            };
          }
          // Already in new format
          return member;
        }
        return member;
      });

      return {
        ...data,
        team: {
          ...data.team,
          members: migratedMembers,
        },
      };
    }
  }
  return data;
};

type MigratablePokemon = {
  originalReceivalStatus?: string;
  status?: string;
};

const normalizePokemonOriginalReceivalStatus = (
  pokemon: MigratablePokemon | null | undefined,
) => {
  if (!pokemon || pokemon.originalReceivalStatus) {
    return pokemon;
  }

  const normalizedPokemon = { ...pokemon };

  if (
    normalizedPokemon.status === PokemonStatus.STORED ||
    normalizedPokemon.status === PokemonStatus.DECEASED
  ) {
    normalizedPokemon.originalReceivalStatus = PokemonStatus.CAPTURED;
    return normalizedPokemon;
  }

  if (
    normalizedPokemon.status === PokemonStatus.CAPTURED ||
    normalizedPokemon.status === PokemonStatus.RECEIVED ||
    normalizedPokemon.status === PokemonStatus.TRADED
  ) {
    normalizedPokemon.originalReceivalStatus = normalizedPokemon.status;
  }

  return normalizedPokemon;
};

const migrateOriginalReceivalStatus = (data: MigrationData): MigrationData => {
  if (data.encounters && typeof data.encounters === "object") {
    const encounters = data.encounters as Record<
      string,
      { head?: MigratablePokemon | null; body?: MigratablePokemon | null }
    >;

    return {
      ...data,
      encounters: Object.fromEntries(
        Object.entries(encounters).map(([locationId, encounter]) => {
          if (!encounter || typeof encounter !== "object") {
            return [locationId, encounter];
          }

          return [
            locationId,
            {
              ...encounter,
              head: normalizePokemonOriginalReceivalStatus(encounter.head),
              body: normalizePokemonOriginalReceivalStatus(encounter.body),
            },
          ];
        }),
      ),
    };
  }

  return data;
};

const cleanupEncounterArtworkVariant = (data: MigrationData): MigrationData => {
  if (!data.encounters || typeof data.encounters !== "object") {
    return data;
  }

  return {
    ...data,
    encounters: Object.fromEntries(
      Object.entries(data.encounters).map(([locationId, encounter]) => {
        if (!encounter || typeof encounter !== "object") {
          return [locationId, encounter];
        }

        const { artworkVariant: _artworkVariant, ...cleanEncounter } =
          encounter as Record<string, unknown>;

        return [locationId, cleanEncounter];
      }),
    ),
  };
};

/**
 * Ensure required fields exist with proper types
 */
const migrateRequiredFields = (data: unknown): MigrationData => {
  const now = Date.now();

  // Handle completely malformed data
  if (!data || typeof data !== "object") {
    return {
      id: `playthrough_${now}_${Math.random().toString(36).substr(2, 9)}`,
      name: "Playthrough",
      createdAt: now,
      updatedAt: now,
      gameMode: "classic",
      version: "1.0.0",
      team: { members: Array.from({ length: 6 }, () => null) },
    };
  }

  const migrationData = data as MigrationData;

  // Helper function to safely convert to number
  const toNumber = (value: unknown, fallback: number): number => {
    if (
      typeof value === "number" &&
      !Number.isNaN(value) &&
      Number.isFinite(value)
    ) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = parseInt(value, 10);
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return fallback;
  };

  return {
    ...data,
    id:
      typeof migrationData.id === "string" && migrationData.id.length > 0
        ? migrationData.id
        : `playthrough_${now}_${Math.random().toString(36).substr(2, 9)}`,
    name:
      typeof migrationData.name === "string" && migrationData.name.length > 0
        ? migrationData.name
        : "Playthrough",
    gameMode: migrationData.gameMode ?? "classic",
    createdAt: toNumber(migrationData.createdAt, now),
    updatedAt: toNumber(migrationData.updatedAt, now),
  };
};

/**
 * Apply all migrations to a playthrough in sequence
 */
const applyPlaythroughMigrations = (data: unknown): MigrationData => {
  let migratedData = migrateRequiredFields(data);

  // Migration order is part of the persisted-data contract.
  migratedData = migrateRemixMode(migratedData);
  migratedData = migrateVersion(migratedData);
  migratedData = migrateTeamField(migratedData);
  migratedData = migrateTeamMemberSchema(migratedData);
  migratedData = migrateOriginalReceivalStatus(migratedData);
  migratedData = cleanupEncounterArtworkVariant(migratedData);
  migratedData = cleanupRemixMode(migratedData);

  return migratedData;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && Array.isArray(value) === false;

// fallow-ignore-next-line complexity -- Validates every persisted Pokemon option field before state migration.
const isPokemonOption = (value: unknown): boolean => {
  if (isRecord(value) === false) return false;

  const validStatus =
    value.status === undefined ||
    value.status === "captured" ||
    value.status === "received" ||
    value.status === "traded" ||
    value.status === "missed" ||
    value.status === "stored" ||
    value.status === "deceased";
  const validOriginalReceivalStatus =
    value.originalReceivalStatus === undefined ||
    value.originalReceivalStatus === "captured" ||
    value.originalReceivalStatus === "received" ||
    value.originalReceivalStatus === "traded";

  return (
    Number.isInteger(value.id) &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    Number.isInteger(value.nationalDexId) &&
    (value.nickname === undefined || typeof value.nickname === "string") &&
    (value.originalLocation === undefined ||
      typeof value.originalLocation === "string") &&
    validStatus &&
    validOriginalReceivalStatus &&
    (value.uid === undefined || typeof value.uid === "string")
  );
};

// fallow-ignore-next-line complexity -- Validates the complete persisted run boundary before canonical state installation.
const isValidPersistedPlaythrough = (
  playthrough: MigrationData,
): playthrough is Playthrough => {
  if (
    typeof playthrough.id !== "string" ||
    typeof playthrough.name !== "string" ||
    isGameMode(playthrough.gameMode) === false ||
    typeof playthrough.createdAt !== "number" ||
    typeof playthrough.updatedAt !== "number" ||
    typeof playthrough.version !== "string" ||
    isRecord(playthrough.team) === false ||
    Array.isArray(playthrough.team.members) === false ||
    playthrough.team.members.length !== 6 ||
    playthrough.team.members.some(
      (member) =>
        member !== null &&
        (isRecord(member) === false ||
          typeof member.headPokemonUid !== "string" ||
          typeof member.bodyPokemonUid !== "string"),
    )
  ) {
    return false;
  }

  if (
    playthrough.customLocations !== undefined &&
    (Array.isArray(playthrough.customLocations) === false ||
      playthrough.customLocations.some(
        (location) =>
          isRecord(location) === false ||
          typeof location.id !== "string" ||
          location.id.length === 0 ||
          typeof location.name !== "string" ||
          location.name.length === 0 ||
          typeof location.insertAfterLocationId !== "string" ||
          location.insertAfterLocationId.length === 0,
      ))
  ) {
    return false;
  }

  if (
    playthrough.encounters !== undefined &&
    (isRecord(playthrough.encounters) === false ||
      Object.values(playthrough.encounters).some(
        (encounter) =>
          isRecord(encounter) === false ||
          (encounter.head !== null &&
            isPokemonOption(encounter.head) === false) ||
          (encounter.body !== null &&
            isPokemonOption(encounter.body) === false) ||
          typeof encounter.isFusion !== "boolean" ||
          typeof encounter.updatedAt !== "number",
      ))
  ) {
    return false;
  }

  return true;
};

export const normalizePersistedPlaythrough = (data: unknown): Playthrough => {
  const playthrough = applyPlaythroughMigrations(data);
  if (isValidPersistedPlaythrough(playthrough) === false) {
    throw new Error("Invalid persisted playthrough");
  }

  return playthrough;
};

export const normalizeImportedPlaythrough = (data: unknown): unknown => {
  if (!data || typeof data !== "object" || !("playthrough" in data)) {
    return data;
  }

  const { playthrough } = data as { playthrough: unknown };

  if (
    !playthrough ||
    typeof playthrough !== "object" ||
    Array.isArray(playthrough)
  ) {
    return data;
  }

  return {
    ...data,
    playthrough: applyPlaythroughMigrations(playthrough),
  };
};
