"use client";

import clsx from "clsx";
import React, { useOptimistic, useTransition } from "react";
import {
  type GameMode,
  playthroughActions,
  useActivePlaythrough,
  useGameMode,
} from "@/stores/playthroughs";

const GameModeToggle = function GameModeToggle() {
  const activePlaythrough = useActivePlaythrough();
  const actualGameMode = useGameMode();
  const [isPending, startTransition] = useTransition();

  // React 19's useOptimistic hook for instant UI updates
  const [optimisticMode, setOptimisticMode] = useOptimistic(
    actualGameMode,
    (_currentState, newMode: GameMode) => newMode,
  );

  const handleModeSelect = React.useCallback(
    (targetMode: GameMode) => {
      if (!activePlaythrough || isPending || optimisticMode === targetMode)
        return;

      startTransition(() => {
        // Optimistic update - instant UI response
        setOptimisticMode(targetMode);

        // Actual state update
        playthroughActions.setGameMode(targetMode);
      });
    },
    [activePlaythrough, optimisticMode, isPending, setOptimisticMode],
  );

  return (
    <div className="flex w-full items-center">
      <fieldset
        className={clsx(
          "relative grid w-full grid-cols-3 items-center rounded-t-xl bg-white p-0.5 dark:bg-gray-800 sm:p-1",
          "border-b-0 border border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500",
          "font-medium backdrop-blur-sm",
          "h-12 sm:h-[44px]",
          "transition-all duration-200 ease-out",
          !activePlaythrough && "opacity-50",
        )}
        disabled={!activePlaythrough}
        aria-describedby={
          !activePlaythrough ? "game-mode-toggle-disabled-help" : undefined
        }
      >
        <legend className="sr-only">Game Mode Selection</legend>

        <button
          type="button"
          onClick={() => handleModeSelect("classic")}
          disabled={!activePlaythrough}
          className={clsx(
            "relative z-10 h-10 min-w-0 rounded-lg border border-transparent px-2 py-2 text-center text-sm sm:h-[36px] sm:px-3",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
            "focus-visible:border-blue-500 dark:focus-visible:border-blue-400",
            optimisticMode === "classic"
              ? "border-gray-200 bg-gray-50 text-gray-900 shadow-elevation-1 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
            activePlaythrough &&
              "cursor-pointer transition-colors duration-200",
          )}
          aria-pressed={optimisticMode === "classic"}
          aria-label={`Switch to Classic mode${optimisticMode === "classic" ? " (currently selected)" : ""}`}
        >
          Classic
        </button>

        <button
          type="button"
          onClick={() => handleModeSelect("remix")}
          disabled={!activePlaythrough}
          className={clsx(
            "relative z-10 h-10 min-w-0 rounded-lg border border-transparent px-2 py-2 text-center text-sm sm:h-[36px] sm:px-3",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
            "focus-visible:border-blue-500 dark:focus-visible:border-blue-400",
            optimisticMode === "remix"
              ? "border-purple-200 bg-purple-50 text-purple-700 shadow-elevation-1 dark:border-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
            activePlaythrough &&
              "cursor-pointer transition-colors duration-200",
          )}
          aria-pressed={optimisticMode === "remix"}
          aria-label={`Switch to Remix mode${optimisticMode === "remix" ? " (currently selected)" : ""}`}
        >
          Remix
        </button>

        <button
          type="button"
          onClick={() => handleModeSelect("randomized")}
          disabled={!activePlaythrough}
          className={clsx(
            "relative z-10 h-10 min-w-0 rounded-lg border border-transparent px-2 py-2 text-center text-sm sm:h-[36px] sm:px-3",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
            "focus-visible:border-blue-500 dark:focus-visible:border-blue-400",
            optimisticMode === "randomized"
              ? "border-orange-200 bg-orange-50 text-orange-700 shadow-elevation-1 dark:border-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
            activePlaythrough &&
              "cursor-pointer transition-colors duration-200",
          )}
          aria-pressed={optimisticMode === "randomized"}
          aria-label={`Switch to Randomized mode${optimisticMode === "randomized" ? " (currently selected)" : ""}`}
        >
          Random
        </button>

        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {activePlaythrough &&
            `Game mode: ${optimisticMode}${isPending ? " (updating...)" : ""}`}
        </div>
      </fieldset>
    </div>
  );
};

export default GameModeToggle;
