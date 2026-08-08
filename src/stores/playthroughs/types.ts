import type { CustomLocation } from "@/loaders/locations";
import type { PokemonOptionType } from "@/loaders/pokemon";

export type GameMode = "classic" | "remix" | "randomized";

export const DEFAULT_NEW_PLAYTHROUGH_GAME_MODE: GameMode = "randomized";

export interface TeamMember {
  bodyPokemonUid: string;
  headPokemonUid: string;
}

export interface Team {
  members: Array<TeamMember | null>;
}

export interface EncounterData {
  body: PokemonOptionType | null;
  head: PokemonOptionType | null;
  isFusion: boolean;
  updatedAt: number;
}

export interface Playthrough {
  createdAt: number;
  customLocations?: CustomLocation[];
  encounters?: Record<string, EncounterData>;
  gameMode: GameMode;
  id: string;
  name: string;
  team: Team;
  updatedAt: number;
  version: string;
}

export interface PlaythroughsState {
  activePlaythroughId?: string;
  isLoading: boolean;
  isSaving: boolean;
  playthroughs: Playthrough[];
}

export interface ExportedPlaythrough {
  exportedAt: string;
  playthrough: Playthrough;
  version: string;
}

export interface ImportedPlaythrough {
  exportedAt?: string;
  playthrough: Playthrough;
  version?: string;
}

export const isGameMode = (value: unknown): value is GameMode =>
  value === "classic" || value === "remix" || value === "randomized";
