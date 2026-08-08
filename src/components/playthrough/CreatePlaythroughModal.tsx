"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import clsx from "clsx";
import { HelpCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CursorTooltip } from "@/components/CursorTooltip";
import {
  DEFAULT_NEW_PLAYTHROUGH_GAME_MODE,
  type GameMode,
} from "@/stores/playthroughs/types";

interface CreatePlaythroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, gameMode: GameMode) => Promise<void>;
}

export default function CreatePlaythroughModal({
  isOpen,
  onClose,
  onCreate,
}: CreatePlaythroughModalProps) {
  const [newPlaythroughName, setNewPlaythroughName] = useState("");
  const [selectedGameModeOverride, setSelectedGameModeOverride] =
    useState<GameMode | null>(null);
  const playthroughNameInputRef = useRef<HTMLInputElement>(null);
  const selectedGameMode =
    selectedGameModeOverride ?? DEFAULT_NEW_PLAYTHROUGH_GAME_MODE;

  useEffect(() => {
    if (isOpen === false) {
      return;
    }

    playthroughNameInputRef.current?.focus();
  }, [isOpen]);

  const handleClose = () => {
    setNewPlaythroughName("");
    setSelectedGameModeOverride(null);
    onClose();
  };

  // Create a new playthrough
  const handleCreatePlaythrough = async () => {
    const name = newPlaythroughName.trim();
    if (!name) {
      return;
    }

    try {
      await onCreate(name, selectedGameMode);
      handleClose();
    } catch (error) {
      console.error("Failed to create playthrough:", error);
    }
  };

  return (
    <Dialog
      className="group relative z-[70]"
      onClose={handleClose}
      open={isOpen}
    >
      <DialogBackdrop
        aria-hidden="true"
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] data-closed:opacity-0 data-enter:opacity-100 dark:bg-black/50"
        transition
      />

      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel
          className={clsx(
            "w-full max-w-md space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800",
            "transition duration-150 ease-out data-closed:scale-98 data-closed:opacity-0",
          )}
          transition
        >
          <div className="flex items-center justify-between">
            <DialogTitle className="font-semibold text-gray-900 text-xl dark:text-white">
              Create New Playthrough
            </DialogTitle>
            <button
              aria-label="Close modal"
              className={clsx(
                "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2",
                "cursor-pointer rounded-md p-1 transition-colors",
              )}
              onClick={handleClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label
                className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300"
                htmlFor="playthrough-name"
              >
                Playthrough Name
              </label>
              <input
                autoComplete="off"
                className={clsx(
                  "w-full px-3 py-2.5 text-sm",
                  "rounded-lg border border-gray-300 dark:border-gray-600",
                  "bg-white text-gray-900 dark:bg-gray-700 dark:text-white",
                  "placeholder-gray-500 dark:placeholder-gray-400",
                  "focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500",
                  "transition-all duration-200",
                )}
                id="playthrough-name"
                maxLength={50}
                onChange={(e) => setNewPlaythroughName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreatePlaythrough();
                  }
                }}
                placeholder="Enter a memorable name"
                ref={playthroughNameInputRef}
                spellCheck={false}
                type="text"
                value={newPlaythroughName}
              />
            </div>

            <fieldset>
              <legend className="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300">
                <span className="flex items-center gap-2">
                  <span>Game Mode</span>
                  <CursorTooltip
                    content={
                      <div className="max-w-sm gap-y-4 space-y-2 divide-y divide-gray-200 font-normal text-sm leading-5 dark:divide-gray-600">
                        <div>
                          <strong className="text-gray-900 dark:text-gray-100">
                            Classic
                          </strong>
                          <p className="my-2">
                            Uses the standard encounter tables and route data.
                            The tracker will show traditional Pokémon encounters
                            for each route and location.
                          </p>
                        </div>
                        <div>
                          <strong className="text-purple-700 dark:text-purple-300">
                            Remix
                          </strong>
                          <p className="my-2">
                            Uses modified encounter tables with different
                            Pokémon availability per route. The tracker will
                            show updated encounters that include more diverse
                            Pokémon in early game areas.
                          </p>
                        </div>
                        <div>
                          <strong className="text-orange-700 dark:text-orange-300">
                            Random
                          </strong>
                          <p className="my-2">
                            Uses randomized encounters where any Pokémon can
                            appear in any location.
                          </p>
                        </div>
                        <div className="pt-2">
                          <p className="text-gray-600 italic dark:text-gray-400">
                            You can change the game mode at any time during your
                            playthrough.
                          </p>
                        </div>
                      </div>
                    }
                    delay={300}
                    placement="bottom-start"
                  >
                    <span className="inline-flex h-4 w-4 cursor-help text-gray-400 dark:text-gray-500">
                      <HelpCircle className="h-4 w-4" />
                    </span>
                  </CursorTooltip>
                </span>
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {(["classic", "remix", "randomized"] as const).map((mode) => (
                  <button
                    className={clsx(
                      "rounded-lg border px-3 py-2.5 font-medium text-sm transition-all duration-200",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                      selectedGameMode === mode
                        ? mode === "classic"
                          ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                          : mode === "remix"
                            ? "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300"
                            : "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600",
                    )}
                    key={mode}
                    onClick={() => setSelectedGameModeOverride(mode)}
                    type="button"
                  >
                    {mode === "classic" && "Classic"}
                    {mode === "remix" && "Remix"}
                    {mode === "randomized" && "Randomized"}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              className={clsx(
                "flex-1 px-4 py-2.5 font-medium text-sm",
                "rounded-lg border border-gray-300 dark:border-gray-600",
                "bg-white text-gray-700 dark:bg-gray-700 dark:text-gray-300",
                "transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-600",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2",
              )}
              onClick={handleClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className={clsx(
                "flex-1 rounded-lg px-4 py-2.5 font-medium text-sm text-white",
                "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800",
                "shadow-sm transition-all duration-200 hover:shadow-md",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-green-600 disabled:hover:to-green-800",
                "cursor-pointer",
              )}
              disabled={!newPlaythroughName.trim()}
              onClick={handleCreatePlaythrough}
              type="button"
            >
              Create Playthrough
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
