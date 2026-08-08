"use client";

import GameModeToggle from "./game-mode-toggle";
import PlaythroughSelector from "./playthrough-selector";

export default function PlaythroughMenu() {
  return (
    <div className="flex w-full flex-col lg:w-60">
      <GameModeToggle />
      <PlaythroughSelector standalone={false} />
    </div>
  );
}
