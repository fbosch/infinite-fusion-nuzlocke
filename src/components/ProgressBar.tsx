"use client";

import clsx from "clsx";
import {
  CheckCircleIcon,
  CircleIcon,
  SkullIcon,
  XCircleIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { getLocationsSortedWithCustom } from "@/loaders";
import { PokemonStatus } from "@/loaders/pokemon";
import { useCustomLocations, useEncounters } from "@/stores/playthroughs";
import { CursorTooltip } from "./CursorTooltip";

interface ProgressBarProps {
  className?: string;
}

type ProgressSegment = "captured" | "deceased" | "missed" | "unencountered";

const progressTooltipClassName = "px-2 py-1 text-xs leading-none";

export default function ProgressBar({ className }: ProgressBarProps) {
  const encounters = useEncounters();
  const customLocations = useCustomLocations();
  const [hoveredSegment, setHoveredSegment] = useState<ProgressSegment | null>(
    null,
  );

  const { capturedCount, deceasedCount, missedCount, totalCount } =
    useMemo(() => {
      const allLocations = getLocationsSortedWithCustom(customLocations);
      const total = allLocations.length;

      let captured = 0;
      let deceased = 0;
      let missed = 0;

      for (const location of allLocations) {
        const encounter = encounters?.[location.id];
        if (!encounter || (!encounter.head && !encounter.body)) {
          continue;
        }

        const statuses = [encounter.head?.status, encounter.body?.status];
        const hasMissed = statuses.includes(PokemonStatus.MISSED);
        const hasDeceased = statuses.includes(PokemonStatus.DECEASED);
        const hasSuccessfulEncounter = statuses.some(
          (status) =>
            status === PokemonStatus.CAPTURED ||
            status === PokemonStatus.RECEIVED ||
            status === PokemonStatus.TRADED ||
            status === PokemonStatus.STORED,
        );

        if (hasMissed) {
          missed += 1;
          continue;
        }

        if (hasDeceased) {
          deceased += 1;
          continue;
        }

        if (hasSuccessfulEncounter) {
          captured += 1;
        }
      }

      return {
        capturedCount: captured,
        deceasedCount: deceased,
        missedCount: missed,
        totalCount: total,
      };
    }, [encounters, customLocations]);

  const completedCount = capturedCount + deceasedCount + missedCount;
  const unencounteredCount = Math.max(totalCount - completedCount, 0);
  const capturedWidth = totalCount > 0 ? (capturedCount / totalCount) * 100 : 0;
  const deceasedWidth = totalCount > 0 ? (deceasedCount / totalCount) * 100 : 0;
  const missedWidth = totalCount > 0 ? (missedCount / totalCount) * 100 : 0;
  const unencounteredWidth =
    totalCount > 0 ? (unencounteredCount / totalCount) * 100 : 0;

  const shouldDimOthers =
    hoveredSegment === "captured" ||
    hoveredSegment === "deceased" ||
    hoveredSegment === "missed";

  const getBg = (segment: ProgressSegment): string => {
    const dimNeutral =
      "light-dark(var(--color-gray-100), var(--color-gray-800))";
    const isHovered = hoveredSegment === segment;
    if (!shouldDimOthers || isHovered) {
      if (segment === "captured") return "var(--color-emerald-600)";
      if (segment === "deceased") return "var(--color-rose-600)";
      if (segment === "missed") return "var(--color-amber-600)";
      return "light-dark(var(--color-gray-300), var(--color-gray-700))";
    }

    if (segment === "captured") {
      return `color-mix(in oklab, var(--color-emerald-600) 25%, ${dimNeutral})`;
    }
    if (segment === "deceased") {
      return `color-mix(in oklab, var(--color-rose-600) 25%, ${dimNeutral})`;
    }
    if (segment === "missed") {
      return `color-mix(in oklab, var(--color-amber-600) 25%, ${dimNeutral})`;
    }
    return `color-mix(in oklab, light-dark(var(--color-gray-300), var(--color-gray-700)) 45%, ${dimNeutral})`;
  };

  return (
    <div
      className={clsx(
        "group relative w-full h-0.5 overflow-visible",
        className,
      )}
      role="img"
      aria-label={`Encounter progress: ${capturedCount} captured, ${deceasedCount} deceased, ${missedCount} missed, ${unencounteredCount} unencountered`}
    >
      <div className="group/bar absolute left-0 right-0 top-1/2 flex h-10 -translate-y-1/2 overflow-visible">
        <CursorTooltip
          content={
            <span className="inline-flex items-center gap-1.5 leading-none">
              <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Captured</span>
              <span className="tabular-nums">{capturedCount}</span>
            </span>
          }
          placement="bottom"
          tooltipId="encounter-progress-bar"
          className={progressTooltipClassName}
          onMouseEnter={() => setHoveredSegment("captured")}
          onMouseLeave={() => setHoveredSegment(null)}
        >
          <div
            className="relative h-full"
            style={{ width: `${capturedWidth}%` }}
          >
            <div
              className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 origin-center transition-[background-color,transform] duration-150 ease-out"
              style={{
                backgroundColor: getBg("captured"),
                transform: `translateY(-50%) scaleY(${hoveredSegment ? 7 : 1})`,
              }}
            />
          </div>
        </CursorTooltip>
        <CursorTooltip
          content={
            <span className="inline-flex items-center gap-1.5 leading-none">
              <SkullIcon className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>Deceased</span>
              <span className="tabular-nums">{deceasedCount}</span>
            </span>
          }
          placement="bottom"
          tooltipId="encounter-progress-bar"
          className={progressTooltipClassName}
          onMouseEnter={() => setHoveredSegment("deceased")}
          onMouseLeave={() => setHoveredSegment(null)}
        >
          <div
            className="relative h-full"
            style={{ width: `${deceasedWidth}%` }}
          >
            <div
              className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 origin-center transition-[background-color,transform] duration-150 ease-out"
              style={{
                backgroundColor: getBg("deceased"),
                transform: `translateY(-50%) scaleY(${hoveredSegment ? 7 : 1})`,
              }}
            />
          </div>
        </CursorTooltip>
        <CursorTooltip
          content={
            <span className="inline-flex items-center gap-1.5 leading-none">
              <XCircleIcon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Missed</span>
              <span className="tabular-nums">{missedCount}</span>
            </span>
          }
          placement="bottom"
          tooltipId="encounter-progress-bar"
          className={progressTooltipClassName}
          onMouseEnter={() => setHoveredSegment("missed")}
          onMouseLeave={() => setHoveredSegment(null)}
        >
          <div className="relative h-full" style={{ width: `${missedWidth}%` }}>
            <div
              className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 origin-center transition-[background-color,transform] duration-150 ease-out"
              style={{
                backgroundColor: getBg("missed"),
                transform: `translateY(-50%) scaleY(${hoveredSegment ? 7 : 1})`,
              }}
            />
          </div>
        </CursorTooltip>
        <CursorTooltip
          content={
            <span className="inline-flex items-center gap-1.5 leading-none">
              <CircleIcon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <span>Unencountered</span>
              <span className="tabular-nums">{unencounteredCount}</span>
            </span>
          }
          placement="bottom"
          tooltipId="encounter-progress-bar"
          className={progressTooltipClassName}
          onMouseEnter={() => setHoveredSegment("unencountered")}
          onMouseLeave={() => setHoveredSegment(null)}
        >
          <div
            className="relative h-full"
            style={{ width: `${unencounteredWidth}%` }}
          >
            <div
              className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 origin-center transition-[background-color,transform] duration-150 ease-out"
              style={{
                backgroundColor: getBg("unencountered"),
                transform: `translateY(-50%) scaleY(${hoveredSegment ? 7 : 1})`,
              }}
            />
          </div>
        </CursorTooltip>
      </div>
    </div>
  );
}
