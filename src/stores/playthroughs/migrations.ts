import type { GameMode } from './types';

/**
 * Migration data type for playthrough migrations
 */
export interface MigrationData {
  id: string;
  name: string;
  customLocations?: unknown[];
  encounters?: Record<string, unknown>;
  team?: unknown;
  gameMode?: GameMode;
  remixMode?: boolean;
  createdAt: number;
  updatedAt: number;
  version?: string;
  [key: string]: unknown;
}

/**
 * Migrate remixMode to gameMode field
 */
export function migrateRemixMode(data: MigrationData): MigrationData {
  if (data.remixMode !== undefined && data.gameMode === 'classic') {
    return {
      ...data,
      gameMode: data.remixMode ? 'remix' : 'classic',
      remixMode: undefined, // Remove the old field
      version: '1.0.0',
    };
  }
  return data;
}

/**
 * Ensure team field exists with default empty team
 */
export function migrateTeamField(data: MigrationData): MigrationData {
  let team = data.team;

  if (!team) {
    // No team field exists, create default
    team = { members: Array.from({ length: 6 }, () => null) };
  } else if (team && typeof team === 'object' && 'members' in team) {
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
    } else if (typeof members === 'object' && members !== null) {
      // Members is a record/object, convert to array format
      const fixedMembers = new Array(6).fill(null);
      Object.entries(members as Record<string, unknown>).forEach(
        ([key, member]) => {
          const index = parseInt(key, 10);
          if (index >= 0 && index < 6 && member !== null) {
            fixedMembers[index] = member;
          }
        }
      );
      team = { members: fixedMembers };
    } else {
      // Invalid members structure, reset to default
      team = { members: Array.from({ length: 6 }, () => null) };
    }
  } else {
    // Invalid team structure, reset to default
    team = { members: Array.from({ length: 6 }, () => null) };
  }

  return { ...data, team };
}

/**
 * Ensure version field exists with default
 */
export function migrateVersion(data: MigrationData): MigrationData {
  if (data.version === undefined) {
    return { ...data, version: '1.0.0' };
  }
  return data;
}

/**
 * Clean up old remixMode field
 */
export function cleanupRemixMode(data: MigrationData): MigrationData {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { remixMode, ...cleanData } = data;
  return cleanData;
}

/**
 * Migrate team member schema from encounter IDs to Pokémon UIDs
 */
export function migrateTeamMemberSchema(data: MigrationData): MigrationData {
  if (data.team && typeof data.team === 'object' && 'members' in data.team) {
    const team = data.team as Record<string, unknown>;
    const members = team.members;
    
    if (Array.isArray(members)) {
      const migratedMembers = members.map((member: unknown) => {
        if (member && typeof member === 'object') {
          // Check if this is the old format with encounter IDs
          if ('headEncounterId' in member || 'bodyEncounterId' in member) {
            // Convert to new format - for now, we'll set empty UIDs
            // since we can't reliably reconstruct the old UIDs
            return {
              headPokemonUid: '',
              bodyPokemonUid: '',
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
}

/**
 * Apply all migrations to a playthrough in sequence
 */
export function migratePlaythrough(data: MigrationData): MigrationData {
  let migratedData = data;

  // Apply migrations in order
  migratedData = migrateRemixMode(migratedData);
  migratedData = migrateVersion(migratedData);
  migratedData = migrateTeamField(migratedData);
  migratedData = migrateTeamMemberSchema(migratedData);
  migratedData = cleanupRemixMode(migratedData);

  return migratedData;
}
