import { generatePrefixedId } from "@/utils/id";
import { DEFAULT_NEW_PLAYTHROUGH_GAME_MODE, type Playthrough } from "./types";

const DEFAULT_PLAYTHROUGH_NAME = "Playthrough";
const DEFAULT_PLAYTHROUGH_VERSION = "1.0.0";

export const createDefaultPlaythrough = (): Playthrough => {
  const timestamp = Date.now();

  return {
    createdAt: timestamp,
    encounters: {},
    gameMode: DEFAULT_NEW_PLAYTHROUGH_GAME_MODE,
    id: generatePrefixedId("playthrough"),
    name: DEFAULT_PLAYTHROUGH_NAME,
    team: { members: Array.from({ length: 6 }, () => null) },
    updatedAt: timestamp,
    version: DEFAULT_PLAYTHROUGH_VERSION,
  };
};
