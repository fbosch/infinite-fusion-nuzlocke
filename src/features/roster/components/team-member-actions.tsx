"use client";

import clsx from "clsx";

interface TeamMemberActionsProps {
  canUpdateTeam: boolean;
  hasSelection: boolean;
  onClear: () => void;
  onUpdate: () => void;
}

export function TeamMemberActions({
  canUpdateTeam,
  hasSelection,
  onUpdate,
  onClear,
}: TeamMemberActionsProps) {
  return (
    <div className="space-y-3">
      <button
        className={clsx(
          "w-full rounded-lg border px-4 py-3 font-medium shadow-sm transition-all duration-200",
          canUpdateTeam
            ? "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800 hover:shadow-md dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:border-blue-700 dark:hover:bg-blue-900/50 dark:hover:text-blue-200"
            : "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-500",
        )}
        disabled={!canUpdateTeam}
        onClick={onUpdate}
        type="button"
      >
        Update
      </button>

      <button
        className={clsx(
          "w-full rounded-lg px-4 py-3 font-medium transition-all duration-200",
          hasSelection
            ? "bg-white text-gray-500 hover:bg-red-50 hover:text-red-700 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-red-950/50 dark:hover:text-red-300"
            : "cursor-not-allowed bg-gray-50 text-gray-400 dark:bg-gray-800/50 dark:text-gray-500",
        )}
        disabled={!hasSelection}
        onClick={onClear}
        type="button"
      >
        Clear
      </button>
    </div>
  );
}
