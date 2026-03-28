"use client";

import clsx from "clsx";
import { useMemo } from "react";
import { getLocationsSortedWithCustom } from "@/loaders";
import { useCustomLocations, useEncounters } from "@/stores/playthroughs";

interface ProgressBarProps {
  className?: string;
}

export default function ProgressBar({ className }: ProgressBarProps) {
  const encounters = useEncounters();
  const customLocations = useCustomLocations();

  const { completedCount, totalCount, percentage } = useMemo(() => {
    const allLocations = getLocationsSortedWithCustom(customLocations);
    const total = allLocations.length;

    const completed = allLocations.filter((location) => {
      const encounter = encounters?.[location.id];
      return encounter && (encounter.head || encounter.body);
    }).length;

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      completedCount: completed,
      totalCount: total,
      percentage: percent,
    };
  }, [encounters, customLocations]);

  return (
    <div className={clsx("w-full", className)}>
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
        <span>
          {completedCount} / {totalCount} locations
        </span>
        <span className="text-gray-400 dark:text-gray-600">
          ({percentage}%)
        </span>
      </div>

      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-500 ease-out",
            "bg-gradient-to-r from-blue-500 to-blue-600",
            "dark:from-blue-400 dark:to-blue-500",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {percentage === 100 && (
        <div className="text-center mt-2">
          <span className="text-sm  text-green-600 dark:text-green-400">
            🎉 Congratulations! You&apos;ve completed all locations!
          </span>
        </div>
      )}
    </div>
  );
}
