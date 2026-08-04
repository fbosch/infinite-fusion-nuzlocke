"use client";

import GameModeToggle from "./GameModeToggle";
import PlaythroughSelector from "./PlaythroughSelector";

export default function PlaythroughMenu() {
  return (
    <div className="flex w-full flex-col lg:w-60">
      <GameModeToggle />
      <PlaythroughSelector standalone={false} />
    </div>
  );
}
