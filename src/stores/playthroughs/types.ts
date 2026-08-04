import type { CustomLocation } from "@/loaders/locations";
import type { PokemonOptionType } from "@/loaders/pokemon";

export type GameMode = "classic" | "remix" | "randomized";

export const DEFAULT_NEW_PLAYTHROUGH_GAME_MODE: GameMode = "randomized";

export type TeamMember = {
  headPokemonUid: string;
  bodyPokemonUid: string;
};

export type Team = { members: Array<TeamMember | null> };

export type EncounterData = {
  head: PokemonOptionType | null;
  body: PokemonOptionType | null;
  isFusion: boolean;
  updatedAt: number;
};

export type Playthrough = {
  id: string;
  name: string;
  customLocations?: CustomLocation[];
  encounters?: Record<string, EncounterData>;
  team: Team;
  gameMode: GameMode;
  createdAt: number;
  updatedAt: number;
  version: string;
};

export type PlaythroughsState = {
  playthroughs: Playthrough[];
  activePlaythroughId?: string;
  isLoading: boolean;
  isSaving: boolean;
};

export type ExportedPlaythrough = {
  version: string;
  exportedAt: string;
  playthrough: Playthrough;
};

export type ImportedPlaythrough = {
  version?: string;
  exportedAt?: string;
  playthrough: Playthrough;
};

export const isGameMode = (value: unknown): value is GameMode =>
  value === "classic" || value === "remix" || value === "randomized";
