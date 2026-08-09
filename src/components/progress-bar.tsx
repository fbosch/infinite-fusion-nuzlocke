"use client";

import clsx from "clsx";
import { CircleIcon, SkullIcon } from "lucide-react";
import { type ElementType, useState } from "react";
import EscapeIcon from "@/assets/images/escape-cloud.svg";
import PokeballIcon from "@/assets/images/pokeball.svg";
import { getLocationsSortedWithCustom } from "@/loaders/locations";
import {
  type PokemonOptionType,
  PokemonStatus,
  type PokemonStatusType,
} from "@/loaders/pokemon";
import { useCustomLocations, useEncounters } from "@/stores/playthroughs/hooks";
import { CursorTooltip } from "./cursor-tooltip";

interface ProgressBarProps {
  className?: string;
}

type ProgressSegment = "captured" | "deceased" | "missed" | "unencountered";

const progressTooltipClassName = "px-2 py-1 text-xs leading-none";
const segmentOrder: ProgressSegment[] = [
  "captured",
  "deceased",
  "missed",
  "unencountered",
];
const dimNeutral = "light-dark(var(--color-gray-100), var(--color-gray-800))";
const successfulEncounterStatuses = new Set<PokemonStatusType | undefined>([
  PokemonStatus.CAPTURED,
  PokemonStatus.RECEIVED,
  PokemonStatus.TRADED,
  PokemonStatus.STORED,
]);

const segmentDetails: Record<
  ProgressSegment,
  {
    backgroundColor: string;
    dimmedBackgroundColor: string;
    icon: ElementType;
    iconClassName: string;
    label: string;
  }
> = {
  captured: {
    backgroundColor: "var(--color-emerald-600)",
    dimmedBackgroundColor: `color-mix(in oklab, var(--color-emerald-600) 25%, ${dimNeutral})`,
    icon: PokeballIcon,
    iconClassName: "text-emerald-600 dark:text-emerald-400",
    label: "Captured",
  },
  deceased: {
    backgroundColor: "var(--color-rose-600)",
    dimmedBackgroundColor: `color-mix(in oklab, var(--color-rose-600) 25%, ${dimNeutral})`,
    icon: SkullIcon,
    iconClassName: "text-rose-600 dark:text-rose-400",
    label: "Deceased",
  },
  missed: {
    backgroundColor: "var(--color-amber-600)",
    dimmedBackgroundColor: `color-mix(in oklab, var(--color-amber-600) 25%, ${dimNeutral})`,
    icon: EscapeIcon,
    iconClassName: "text-amber-600 dark:text-amber-400",
    label: "Missed",
  },
  unencountered: {
    backgroundColor: "light-dark(var(--color-gray-300), var(--color-gray-700))",
    dimmedBackgroundColor: `color-mix(in oklab, light-dark(var(--color-gray-300), var(--color-gray-700)) 45%, ${dimNeutral})`,
    icon: CircleIcon,
    iconClassName: "text-gray-500 dark:text-gray-400",
    label: "Unencountered",
  },
};

interface ProgressCounts {
  captured: number;
  deceased: number;
  missed: number;
  total: number;
}

function getEncounterProgressSegment(
  head: PokemonOptionType | null | undefined,
  body: PokemonOptionType | null | undefined,
): Exclude<ProgressSegment, "unencountered"> | null {
  if (!(head || body)) {
    return null;
  }

  const statuses = [head?.status, body?.status];
  if (statuses.includes(PokemonStatus.MISSED)) {
    return "missed";
  }

  if (statuses.includes(PokemonStatus.DECEASED)) {
    return "deceased";
  }

  return statuses.some((status) => successfulEncounterStatuses.has(status))
    ? "captured"
    : null;
}

function getProgressCounts(
  encounters: ReturnType<typeof useEncounters>,
  customLocations: ReturnType<typeof useCustomLocations>,
): ProgressCounts {
  const locations = getLocationsSortedWithCustom(customLocations);
  const counts: ProgressCounts = {
    captured: 0,
    deceased: 0,
    missed: 0,
    total: locations.length,
  };

  for (const location of locations) {
    const encounter = encounters?.[location.id];
    const segment = getEncounterProgressSegment(
      encounter?.head,
      encounter?.body,
    );
    if (segment === null) {
      continue;
    }

    counts[segment] += 1;
  }

  return counts;
}

function ProgressBarSegment({
  count,
  hoveredSegment,
  segment,
  totalCount,
  onMouseEnter,
  onMouseLeave,
}: {
  count: number;
  hoveredSegment: ProgressSegment | null;
  segment: ProgressSegment;
  totalCount: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const {
    backgroundColor,
    dimmedBackgroundColor,
    icon: Icon,
    iconClassName,
    label,
  } = segmentDetails[segment];
  const isHovered = hoveredSegment === segment;
  const shouldDim =
    hoveredSegment !== null && hoveredSegment !== "unencountered";
  const width = totalCount > 0 ? (count / totalCount) * 100 : 0;

  return (
    <CursorTooltip
      className={progressTooltipClassName}
      content={
        <span className="inline-flex items-center gap-1.5 leading-none">
          <Icon className={`h-4 w-4 shrink-0 ${iconClassName}`} />
          <span>{label}</span>
          <span className="tabular-nums">{count}</span>
        </span>
      }
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      placement="bottom"
      tooltipId="encounter-progress-bar"
    >
      <div className="relative h-full" style={{ width: `${width}%` }}>
        <div
          className="absolute top-1/2 right-0 left-0 h-0.5 origin-center -translate-y-1/2 transition-[background-color,transform] duration-150 ease-out"
          style={{
            backgroundColor:
              shouldDim && !isHovered ? dimmedBackgroundColor : backgroundColor,
            transform: `translateY(-50%) scaleY(${hoveredSegment ? 7 : 1})`,
          }}
        />
      </div>
    </CursorTooltip>
  );
}

export default function ProgressBar({ className }: ProgressBarProps) {
  const encounters = useEncounters();
  const customLocations = useCustomLocations();
  const [hoveredSegment, setHoveredSegment] = useState<ProgressSegment | null>(
    null,
  );

  const handleMouseLeave = () => setHoveredSegment(null);
  const segmentMouseEnterHandlers: Record<ProgressSegment, () => void> = {
    captured: () => setHoveredSegment("captured"),
    deceased: () => setHoveredSegment("deceased"),
    missed: () => setHoveredSegment("missed"),
    unencountered: () => setHoveredSegment("unencountered"),
  };

  const {
    captured,
    deceased,
    missed,
    total: totalCount,
  } = getProgressCounts(encounters, customLocations);

  const completedCount = captured + deceased + missed;
  const unencounteredCount = Math.max(totalCount - completedCount, 0);
  const counts: Record<ProgressSegment, number> = {
    captured,
    deceased,
    missed,
    unencountered: unencounteredCount,
  };

  return (
    <div
      aria-label={`Encounter progress: ${captured} captured, ${deceased} deceased, ${missed} missed, ${unencounteredCount} unencountered`}
      className={clsx(
        "group relative h-0.5 w-full overflow-visible",
        className,
      )}
      role="img"
    >
      <div className="group/bar absolute top-1/2 right-0 left-0 flex h-10 -translate-y-1/2 overflow-visible">
        {segmentOrder.map((segment) => (
          <ProgressBarSegment
            count={counts[segment]}
            hoveredSegment={hoveredSegment}
            key={segment}
            onMouseEnter={segmentMouseEnterHandlers[segment]}
            onMouseLeave={handleMouseLeave}
            segment={segment}
            totalCount={totalCount}
          />
        ))}
      </div>
    </div>
  );
}
