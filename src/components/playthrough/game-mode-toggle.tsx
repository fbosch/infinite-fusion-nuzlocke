"use client";

import clsx from "clsx";
import { type MouseEvent, useOptimistic, useTransition } from "react";
import { useActivePlaythrough, useGameMode } from "@/stores/playthroughs/hooks";
import { playthroughActions } from "@/stores/playthroughs/index";
import type { GameMode } from "@/stores/playthroughs/types";

const gameModeOptions: Array<{
  ariaLabel: string;
  label: string;
  mode: GameMode;
  selectedClass: string;
}> = [
  {
    ariaLabel: "Classic",
    label: "Classic",
    mode: "classic",
    selectedClass: "text-gray-900 dark:text-gray-100",
  },
  {
    ariaLabel: "Remix",
    label: "Remix",
    mode: "remix",
    selectedClass: "text-purple-700 dark:text-purple-300",
  },
  {
    ariaLabel: "Randomized",
    label: "Random",
    mode: "randomized",
    selectedClass: "text-orange-700 dark:text-orange-300",
  },
];

const backgroundPositions: Record<GameMode, string> = {
  classic: "translate-x-0",
  randomized: "translate-x-[200%]",
  remix: "translate-x-full",
};

const GameModeToggle = function GameModeToggle() {
  const activePlaythrough = useActivePlaythrough();
  const actualGameMode = useGameMode();
  const [isPending, startTransition] = useTransition();

  // React 19's useOptimistic hook for instant UI updates
  const [optimisticMode, setOptimisticMode] = useOptimistic(
    actualGameMode,
    (_currentState, newMode: GameMode) => newMode,
  );

  const handleModeSelect = (
    targetMode: GameMode,
    triggerMethod: "click" | "keyboard",
  ) => {
    if (!activePlaythrough || isPending || optimisticMode === targetMode) {
      return;
    }

    startTransition(() => {
      // Optimistic update - instant UI response
      setOptimisticMode(targetMode);

      // Actual state update
      playthroughActions.setGameMode(targetMode, {
        source_surface: "game_mode_toggle",
        trigger_method: triggerMethod,
      });
    });
  };

  const handleModeClick = (event: MouseEvent<HTMLButtonElement>) => {
    handleModeSelect(
      event.currentTarget.value as GameMode,
      event.detail === 0 ? "keyboard" : "click",
    );
  };

  return (
    <div className="flex w-full items-center">
      <fieldset
        aria-describedby={
          activePlaythrough ? undefined : "game-mode-toggle-disabled-help"
        }
        className={clsx(
          "relative grid w-full grid-cols-3 items-center rounded-t-xl bg-white p-0.5 sm:p-1 dark:bg-gray-800",
          "border border-gray-200 border-b-0 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500",
          "font-medium backdrop-blur-sm",
          "h-12 sm:h-[44px]",
          "transition-all duration-200 ease-out",
          !activePlaythrough && "opacity-50",
        )}
        disabled={!activePlaythrough}
      >
        <legend className="sr-only">Game Mode Selection</legend>

        {activePlaythrough && (
          <div
            aria-hidden="true"
            className={clsx(
              "absolute inset-y-1 left-0.5 w-[calc((100%-0.25rem)/3)] rounded-lg border border-gray-200 bg-gray-50 shadow-elevation-1 transition-transform duration-200 ease-out sm:left-1 sm:w-[calc((100%-0.5rem)/3)] dark:border-gray-500 dark:bg-gray-700",
              backgroundPositions[optimisticMode],
            )}
          />
        )}

        {gameModeOptions.map(({ ariaLabel, label, mode, selectedClass }) => (
          <button
            aria-label={`Switch to ${ariaLabel} mode${optimisticMode === mode ? " (currently selected)" : ""}`}
            aria-pressed={optimisticMode === mode}
            className={clsx(
              "relative z-10 h-10 min-w-0 rounded-lg border border-transparent px-2 py-2 text-center text-sm sm:h-[36px] sm:px-3",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              "focus-visible:border-blue-500 dark:focus-visible:border-blue-400",
              optimisticMode === mode
                ? selectedClass
                : "text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300",
              activePlaythrough &&
                "cursor-pointer transition-colors duration-200",
            )}
            disabled={!activePlaythrough}
            key={mode}
            onClick={handleModeClick}
            type="button"
            value={mode}
          >
            {label}
          </button>
        ))}

        <div
          aria-atomic="true"
          aria-live="polite"
          className="sr-only"
          role="status"
        >
          {activePlaythrough &&
            `Game mode: ${optimisticMode}${isPending ? " (updating...)" : ""}`}
        </div>
      </fieldset>
    </div>
  );
};

export default GameModeToggle;
