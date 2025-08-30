import { z } from 'zod';
import { PokemonOptionSchema } from '@/loaders/pokemon';
import { CustomLocationSchema } from '@/loaders/locations';

// Game mode enum schema
export const GameModeSchema = z.enum(['classic', 'remix', 'randomized']);

export type GameMode = z.infer<typeof GameModeSchema>;

// Team member schema - represents a single team member
export const TeamMemberSchema = z.object({
  headPokemonUid: z.string(), // Reference to head Pokémon by UID
  bodyPokemonUid: z.string(), // Reference to body Pokémon by UID
});

export type TeamMember = z.infer<typeof TeamMemberSchema>;

// Team schema - represents the complete team
export const TeamSchema = z.object({
  members: z.array(TeamMemberSchema.nullable()).length(6), // Fixed size 6, null for empty slots
});

export type Team = z.infer<typeof TeamSchema>;

export const EncounterDataSchema = z
  .object({
    head: PokemonOptionSchema.nullable(),
    body: PokemonOptionSchema.nullable(),
    isFusion: z.boolean(),
    updatedAt: z.number(),
    // Keep artworkVariant for backward compatibility during migration
    artworkVariant: z.string().optional(),
  })
  .transform(data => {
    // Migration logic: remove artworkVariant field if it exists
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { artworkVariant, ...cleanData } = data;
    return cleanData;
  });

export type EncounterData = z.infer<typeof EncounterDataSchema>;

// Zod schema for a single playthrough
export const PlaythroughSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    customLocations: z.array(CustomLocationSchema).optional(),
    encounters: z.record(z.string(), EncounterDataSchema).optional(),
    team: TeamSchema.default({
      members: Array.from({ length: 6 }, () => null),
    }), // Fixed size 6 with null values
    gameMode: GameModeSchema.default('classic'),
    // Keep remixMode for backward compatibility during migration
    remixMode: z.boolean().optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
    version: z.string().default('1.0.0'),
  })
  .transform(data => {
    // Migration logic: if remixMode is provided and gameMode is default, use it to set gameMode
    if (data.remixMode !== undefined && data.gameMode === 'classic') {
      const migratedData = {
        ...data,
        gameMode: data.remixMode ? 'remix' : ('classic' as const),
      };
      // Remove remixMode field after migration
      const { remixMode, ...cleanData } = migratedData;
      return cleanData;
    }
    // Remove remixMode field even if no migration was needed
    if (data.remixMode !== undefined) {
      const { remixMode, ...cleanData } = data;
      return cleanData;
    }
    return data;
  });

// Zod schema for the playthroughs store
export const PlaythroughsSchema = z.object({
  playthroughs: z.array(PlaythroughSchema),
  activePlaythroughId: z.string().optional(),
});

export type Playthrough = z.infer<typeof PlaythroughSchema>;
export type PlaythroughsState = z.infer<typeof PlaythroughsSchema> & {
  isLoading: boolean;
  isSaving: boolean;
};

// Schema for exported playthrough data
export const ExportedPlaythroughSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  playthrough: PlaythroughSchema,
});

export type ExportedPlaythrough = z.infer<typeof ExportedPlaythroughSchema>;

// Schema for importing playthrough data with migration support
export const ImportedPlaythroughSchema = z.object({
  version: z.string().optional(),
  exportedAt: z.string().optional(),
  playthrough: PlaythroughSchema,
});

export type ImportedPlaythrough = z.infer<typeof ImportedPlaythroughSchema>;

// Helper type for creating export data from a Playthrough
export type ExportablePlaythrough = {
  readonly id: string;
  readonly name: string;
  readonly gameMode: GameMode;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly version: string;
  readonly customLocations?: readonly {
    readonly id: string;
    readonly name: string;
    readonly insertAfterLocationId: string;
  }[];
  readonly encounters?: Record<string, EncounterData>;
  readonly team: Team; // NEW: Include team in exports
};
