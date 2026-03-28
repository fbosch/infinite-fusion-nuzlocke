import { generatePrefixedId } from "@/utils/id";
import type { Playthrough } from "./types";

const DEFAULT_PLAYTHROUGH_NAME = "Nuzlocke";
const DEFAULT_GAME_MODE = "classic" as const;
const DEFAULT_PLAYTHROUGH_VERSION = "1.0.0";

export const createDefaultPlaythrough = (): Playthrough => {
  const timestamp = Date.now();

  return {
    id: generatePrefixedId("playthrough"),
    name: DEFAULT_PLAYTHROUGH_NAME,
    encounters: {},
    team: { members: Array.from({ length: 6 }, () => null) },
    gameMode: DEFAULT_GAME_MODE,
    version: DEFAULT_PLAYTHROUGH_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};
