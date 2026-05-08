"use client";

import { useActivePlaythrough } from "@/stores/playthroughs";
import GameModeToggle from "./GameModeToggle";
import PlaythroughSelector from "./PlaythroughSelector";

export default function PlaythroughMenu() {
  const activePlaythrough = useActivePlaythrough();

  return (
    <div className="flex w-full flex-col lg:w-60">
      {activePlaythrough && <GameModeToggle />}
      <PlaythroughSelector standalone={!activePlaythrough} />
    </div>
  );
}
