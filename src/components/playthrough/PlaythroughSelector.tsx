"use client";

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import clsx from "clsx";
import {
  Album,
  Calendar,
  ChevronDown,
  Download,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { CursorTooltip } from "@/components/cursor-tooltip";
import { usePlaythroughImportExport } from "@/hooks/usePlaythroughImportExport";
import { getSharedEventProperties } from "@/lib/analytics/playthroughEventData";
import { trackEvent } from "@/lib/analytics/trackEvent";
import {
  useActivePlaythrough,
  useAllPlaythroughs,
  useIsLoading,
} from "@/stores/playthroughs/hooks";
import { playthroughActions } from "@/stores/playthroughs/index";
import type { GameMode, Playthrough } from "@/stores/playthroughs/types";
import CreatePlaythroughModal from "./CreatePlaythroughModal";
import { ImportErrorContent } from "./import-error-content";

interface PlaythroughSelectorProps {
  className?: string;
  standalone?: boolean;
}

// Helper function to get game mode display info
const getGameModeInfo = (gameMode: GameMode) => {
  switch (gameMode) {
    case "classic":
      return null; // Don't show indicator for classic mode
    case "remix":
      return {
        className:
          "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
        label: "Remix",
      };
    case "randomized":
      return {
        className:
          "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
        label: "Random",
      };
    default:
      return null;
  }
};

export default function PlaythroughSelector({
  className,
  standalone = false,
}: PlaythroughSelectorProps) {
  const activePlaythrough = useActivePlaythrough();
  const isLoading = useIsLoading();
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [playthroughToDelete, setPlaythroughToDelete] =
    useState<Playthrough | null>(null);

  const {
    showImportError,
    setShowImportError,
    importErrorMessage,
    handleExportClick,
    handleExportKeyDown,
    handleImportClick,
  } = usePlaythroughImportExport();

  const allPlaythroughs = useAllPlaythroughs();
  const sortedPlaythroughsForRender = allPlaythroughs.toSorted(
    (a, b) => b.createdAt - a.createdAt,
  );
  const playthroughRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Initialize refs array when playthroughs change
  useEffect(() => {
    playthroughRefs.current = playthroughRefs.current.slice(
      0,
      allPlaythroughs.length,
    );
  }, [allPlaythroughs.length]);

  // Switch to a different playthrough
  const handlePlaythroughSelect = async (
    playthroughId: string,
    triggerMethod: "click" | "keyboard",
  ) => {
    try {
      await playthroughActions.setActivePlaythrough(playthroughId, {
        source_surface: "playthrough_selector",
        trigger_method: triggerMethod,
      });
    } catch (error) {
      console.error("Failed to switch playthrough:", error);
    }
  };

  // Handle delete playthrough click
  const handleDeleteClick = (playthrough: { id: string; name: string }) => {
    setPlaythroughToDelete(playthrough as Playthrough);
    setShowDeleteConfirm(true);
  };

  // Confirm delete playthrough
  const handleConfirmDelete = async () => {
    if (!playthroughToDelete) {
      return;
    }

    try {
      await playthroughActions.deletePlaythrough(playthroughToDelete.id);
      setShowDeleteConfirm(false);
      setPlaythroughToDelete(null);
    } catch (error) {
      console.error("Failed to delete playthrough:", error);
    }
  };

  // Cancel delete
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setPlaythroughToDelete(null);
  };

  const trackSelectorOpened = () => {
    if (!activePlaythrough) {
      return;
    }

    trackEvent("playthrough_selector_opened", {
      ...getSharedEventProperties(activePlaythrough),
      source_surface: "header",
    });
  };

  const handleCreateClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (activePlaythrough) {
      trackEvent("create_playthrough_modal_opened", {
        ...getSharedEventProperties(activePlaythrough),
        source_surface: "header",
      });
    }
    setShowCreateInput(true);
  };

  // Handle arrow key navigation using refs
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    e.preventDefault();

    switch (e.key) {
      case "ArrowDown": {
        const nextIndex =
          currentIndex < sortedPlaythroughsForRender.length - 1
            ? currentIndex + 1
            : 0;
        playthroughRefs.current[nextIndex]?.focus();
        break;
      }
      case "ArrowUp": {
        const prevIndex =
          currentIndex > 0
            ? currentIndex - 1
            : sortedPlaythroughsForRender.length - 1;
        playthroughRefs.current[prevIndex]?.focus();
        break;
      }
      case "Home":
        playthroughRefs.current[0]?.focus();
        break;
      case "End":
        playthroughRefs.current[
          sortedPlaythroughsForRender.length - 1
        ]?.focus();
        break;
    }
  };

  return (
    <>
      <div className={clsx("group relative w-full", className)}>
        {/* Playthrough Selector Dropdown */}
        <Popover className="relative w-full">
          {({ open }) => (
            <>
              <PopoverButton
                className={clsx(
                  "flex items-center justify-between gap-2 px-3 py-2.5 text-sm sm:gap-3 sm:px-4",
                  "bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700",
                  "border border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500",
                  standalone ? "rounded-xl" : "rounded-b-xl",
                  "transition-all duration-200 ease-out",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                  "focus-visible:border-blue-500 dark:focus-visible:border-blue-400",
                  "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100",
                  "w-full cursor-pointer font-medium backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-50",
                  "h-11",
                )}
                disabled={isLoading}
                onClick={() => {
                  if (!open) {
                    trackSelectorOpened();
                  }
                }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
                  <div className="flex size-6 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-300">
                    <Album className="size-4" />
                  </div>
                  <span className="min-w-0 truncate">
                    {activePlaythrough?.name || "Select Playthrough"}
                  </span>
                </div>
                <ChevronDown
                  className={clsx(
                    "h-4 w-4 text-gray-400 transition-transform duration-200 dark:text-gray-500",
                    open && "rotate-180",
                  )}
                />
              </PopoverButton>
              <PopoverPanel
                anchor={{ gap: "12px", to: "bottom end" }}
                className={clsx(
                  "z-[50] rounded-xl",
                  "bg-white/95 backdrop-blur-md dark:bg-gray-800/95",
                  "shadow-dropdown",
                  "border border-gray-200/50 dark:border-gray-600/50",
                  "w-80 max-w-[calc(100vw-2rem)] sm:w-96",
                  "origin-top-right",
                  "transition-opacity duration-150 data-closed:opacity-0",
                )}
                transition
              >
                {/* Current playthroughs section */}
                {allPlaythroughs.length > 0 && (
                  <>
                    <div className="flex items-center justify-between rounded-t-xl border-gray-200/50 border-b bg-gradient-to-r from-gray-50 to-gray-100/50 px-4 py-3 dark:border-gray-600/50 dark:from-gray-700/30 dark:to-gray-600/30">
                      <span className="font-semibold text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400">
                        Playthroughs
                      </span>
                      <button
                        aria-label="Import playthrough"
                        className={clsx(
                          "flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-xs",
                          "bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400",
                          "border border-gray-300 dark:border-gray-600",
                          "hover:border-blue-300 hover:bg-blue-100 hover:text-blue-700 dark:hover:border-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-300",
                          "focus:border-blue-300 focus:bg-blue-100 focus:text-blue-700 dark:focus:border-blue-600 dark:focus:bg-blue-900/30 dark:focus:text-blue-300",
                          "transition-colors duration-200",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
                          "cursor-pointer",
                        )}
                        onClick={handleImportClick}
                        title="Import playthrough from file"
                        type="button"
                      >
                        <Upload className="h-3 w-3" />
                        Import
                      </button>
                    </div>
                    {sortedPlaythroughsForRender.map((playthrough) => {
                      const gameModeInfo = getGameModeInfo(
                        playthrough.gameMode as GameMode,
                      );
                      const isActive = activePlaythrough?.id === playthrough.id;

                      return (
                        <div
                          className={clsx(
                            "group/menu-item relative",
                            "text-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100/50 dark:text-gray-100 dark:hover:from-gray-700/30 dark:hover:to-gray-600/30",
                            isActive &&
                              "bg-gradient-to-r from-blue-50 to-blue-100/50 text-blue-700 dark:from-blue-900/20 dark:to-blue-800/20 dark:text-blue-300",
                          )}
                          key={playthrough.id}
                        >
                          <button
                            aria-label={`Select playthrough: ${playthrough.name}`}
                            className={clsx(
                              "flex w-full items-center justify-between px-4 py-3.5 pr-24 text-sm",
                              "text-left transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
                              "cursor-pointer",
                            )}
                            data-playthrough-index={sortedPlaythroughsForRender.findIndex(
                              (p) => p.id === playthrough.id,
                            )}
                            onClick={() =>
                              handlePlaythroughSelect(playthrough.id, "click")
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handlePlaythroughSelect(
                                  playthrough.id,
                                  "keyboard",
                                );
                              } else if (
                                e.key === "ArrowDown" ||
                                e.key === "ArrowUp" ||
                                e.key === "Home" ||
                                e.key === "End"
                              ) {
                                const index =
                                  sortedPlaythroughsForRender.findIndex(
                                    (p) => p.id === playthrough.id,
                                  );
                                handleKeyDown(e, index);
                              }
                            }}
                            ref={(el) => {
                              const index =
                                sortedPlaythroughsForRender.findIndex(
                                  (p) => p.id === playthrough.id,
                                );
                              if (index >= 0) {
                                playthroughRefs.current[index] = el;
                              }
                            }}
                            type="button"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <div
                                className={clsx(
                                  "h-2.5 w-2.5 flex-shrink-0 rounded-full",
                                  isActive
                                    ? "bg-blue-500 shadow-sm"
                                    : "bg-gray-400 dark:bg-gray-500",
                                )}
                              />
                              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="truncate font-semibold">
                                    {playthrough.name}
                                  </span>
                                  {gameModeInfo && (
                                    <span
                                      className={clsx(
                                        "rounded-full px-2 py-1 font-medium text-xs",
                                        gameModeInfo.className,
                                      )}
                                    >
                                      {gameModeInfo.label}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-gray-500 text-xs dark:text-gray-400">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      {new Date(
                                        playthrough.createdAt,
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>
                          <div className="absolute top-1/2 right-4 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity duration-200 group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100">
                            <button
                              aria-label={`Export ${playthrough.name}`}
                              className={clsx(
                                "rounded-lg p-2 transition-colors duration-200",
                                "border border-transparent",
                                "hover:border-blue-300 hover:bg-blue-100 dark:hover:border-blue-600 dark:hover:bg-blue-900/20",
                                "focus:border-blue-300 focus:bg-blue-100 dark:focus:border-blue-600 dark:focus:bg-blue-900/20",
                                "text-gray-400 hover:text-blue-600 dark:hover:text-blue-400",
                                "focus:text-blue-600 dark:focus:text-blue-400",
                                "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
                                "cursor-pointer",
                              )}
                              onClick={(e) =>
                                handleExportClick(playthrough as Playthrough, e)
                              }
                              onKeyDown={(e) =>
                                handleExportKeyDown(
                                  playthrough as Playthrough,
                                  e,
                                )
                              }
                              tabIndex={0}
                              type="button"
                            >
                              <div className="relative z-[1000]">
                                <CursorTooltip
                                  content="Export playthrough"
                                  delay={200}
                                  placement="bottom-start"
                                >
                                  <Download className="h-4 w-4" />
                                </CursorTooltip>
                              </div>
                            </button>
                            {allPlaythroughs.length > 1 && (
                              <button
                                aria-label={`Delete ${playthrough.name}`}
                                className={clsx(
                                  "rounded-lg p-2 transition-all duration-200",
                                  "border border-transparent",
                                  "hover:border-red-300 hover:bg-red-100 dark:hover:border-red-600 dark:hover:bg-red-900/20",
                                  "focus:border-red-300 focus:bg-red-100 dark:focus:border-red-600 dark:focus:bg-red-900/20",
                                  "text-gray-400 hover:text-red-600 dark:hover:text-red-400",
                                  "focus:text-red-600 dark:focus:text-red-400",
                                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-inset",
                                  "cursor-pointer",
                                )}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteClick(playthrough);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeleteClick(playthrough);
                                  }
                                }}
                                tabIndex={0}
                                type="button"
                              >
                                <div className="relative z-[1000]">
                                  <CursorTooltip
                                    content="Delete playthrough"
                                    delay={200}
                                    placement="bottom-start"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </CursorTooltip>
                                </div>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {isLoading && (
                  <div className="px-4 py-4 text-center text-gray-500 text-sm dark:text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                      Loading playthroughs...
                    </div>
                  </div>
                )}

                {/* Create new playthrough section - Now inside the dropdown as well */}
                <div
                  className={clsx(
                    "border-gray-200/50 border-t dark:border-gray-600/50",
                    "hover:bg-green-50 dark:hover:bg-green-900/20",
                    "focus-within:bg-green-50 focus-within:outline-none focus-within:dark:bg-green-900/20",
                  )}
                >
                  <div className="relative">
                    <button
                      className={clsx(
                        "group flex w-full items-center gap-3 px-4 py-3.5 text-sm",
                        "text-gray-700 transition-all duration-200 dark:text-gray-300",
                        "cursor-pointer",
                        "rounded-b-xl",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
                        "focus-visible:bg-green-50 dark:focus-visible:bg-green-900/20",
                      )}
                      onClick={handleCreateClick}
                      type="button"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30">
                        <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="font-semibold">
                        Create New Playthrough
                      </span>
                    </button>
                  </div>
                </div>
              </PopoverPanel>
            </>
          )}
        </Popover>
      </div>

      {/* Create Playthrough Modal */}
      <CreatePlaythroughModal
        isOpen={showCreateInput}
        onClose={() => setShowCreateInput(false)}
        onCreate={async (name: string, gameMode: GameMode) => {
          const newId = playthroughActions.createPlaythrough(name, gameMode);
          await playthroughActions.setActivePlaythrough(newId, {
            source_surface: "create_playthrough_modal",
            trigger_method: "submit",
          });
        }}
      />

      {/* Delete confirmation dialog */}
      <ConfirmationDialog
        cancelText="Cancel"
        confirmText="Delete"
        isOpen={showDeleteConfirm}
        message={`Are you sure you want to delete "${playthroughToDelete?.name}"? This action cannot be undone and all progress will be lost.`}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Playthrough"
        variant="danger"
      />

      {/* Import error modal */}
      <ConfirmationDialog
        cancelText="Cancel"
        confirmText="OK"
        isOpen={showImportError}
        message=""
        onClose={() => setShowImportError(false)}
        onConfirm={() => setShowImportError(false)}
        title="Import Error"
        variant="danger"
      >
        <ImportErrorContent errorMessage={importErrorMessage} />
      </ConfirmationDialog>
    </>
  );
}
