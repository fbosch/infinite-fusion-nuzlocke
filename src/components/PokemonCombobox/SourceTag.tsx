"use client";

import clsx from "clsx";
import {
  ArrowUpDown,
  Egg,
  Fish,
  Gift,
  LocateFixed,
  Mountain,
  Pickaxe,
  Radar,
  Scroll,
  Waves,
} from "lucide-react";
import type React from "react";
import LegendaryIcon from "@/assets/images/legendary.svg";
import NestIcon from "@/assets/images/nest.svg";
import PokeballIcon from "@/assets/images/pokeball.svg";
import WildIcon from "@/assets/images/tall-grass.svg";
import { isStarterLocation } from "@/constants/special-locations";
import { EncounterSource } from "@/types/encounters";

interface SourceTagProps {
  locationId: string | undefined;
  sources: EncounterSource[];
}

export function SourceTag({ sources, locationId }: SourceTagProps) {
  if (!sources.length) {
    return null;
  }

  // Handle starter location special case
  if (isStarterLocation(locationId)) {
    return (
      <span
        className={clsx(
          "flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-medium text-xs leading-none",
          "border border-blue-200/60 bg-blue-50 text-blue-700 transition-[padding,gap,color,background-color,border-color] duration-200 hover:bg-blue-100 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/70",
          "font-medium group-hover:gap-2 group-hover:px-2",
        )}
        title="Starter"
      >
        <span className="hidden group-hover:inline">Starter</span>
        <PokeballIcon className="size-3" />
      </span>
    );
  }

  // For multiple sources, show them as separate tags or combined
  if (sources.length === 1) {
    const config = tagConfig[sources[0]];
    return (
      <span
        className={clsx(
          "flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-medium text-xs leading-none",
          "transition-[padding,gap,color,background-color,border-color] duration-200",
          config.className,
          "group-hover:gap-2 group-hover:px-2",
        )}
        title={config.text}
      >
        <span className="hidden group-hover:inline">{config.text}</span>
        {config.icon}
      </span>
    );
  }

  // Multiple sources - show as combined tag with multiple icons
  return (
    <div className="flex items-center gap-1">
      {sources.map((source) => {
        const config = tagConfig[source];
        return (
          <span
            className={clsx(
              "flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-medium text-xs leading-none",
              "transition-[padding,gap,color,background-color,border-color] duration-200",
              config.className,
              "group-hover:gap-2 group-hover:px-2",
            )}
            key={source}
            title={config.text}
          >
            <span className="hidden group-hover:inline">{config.text}</span>
            {config.icon}
          </span>
        );
      })}
    </div>
  );
}

SourceTag.displayName = "SourceTag";

const tagConfig: Record<
  EncounterSource,
  { text: string; className: string; icon: React.ReactNode; tooltip?: string }
> = {
  [EncounterSource.WILD]: {
    className:
      "text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200/60 dark:border-green-700/40 hover:bg-green-100 dark:hover:bg-green-900/70 font-medium",
    icon: <WildIcon className="size-3" />,
    text: "Wild",
  },
  [EncounterSource.GRASS]: {
    className:
      "text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200/60 dark:border-green-700/40 hover:bg-green-100 dark:hover:bg-green-900/70",
    icon: <WildIcon className="size-3" />,
    text: "Grass",
  },
  [EncounterSource.SURF]: {
    className:
      "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-700/40 hover:bg-blue-100 dark:hover:bg-blue-900/70",
    icon: <Waves className="size-3" />,
    text: "Surf",
  },
  [EncounterSource.FISHING]: {
    className:
      "text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20 border border-teal-200/60 dark:border-teal-700/40 hover:bg-teal-100 dark:hover:bg-teal-900/70",
    icon: <Fish className="size-3" />,
    text: "Fish",
  },
  [EncounterSource.GIFT]: {
    className:
      "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200/60 dark:border-red-700/40 hover:bg-red-100 dark:hover:bg-red-900/70",
    icon: <Gift className="size-3" />,
    text: "Gift",
  },
  [EncounterSource.TRADE]: {
    className:
      "text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 border border-orange-200/60 dark:border-orange-700/40 hover:bg-orange-100 dark:hover:bg-orange-900/70",
    icon: <ArrowUpDown className="size-3" />,
    text: "Trade",
  },
  [EncounterSource.NEST]: {
    className:
      "text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200/60 dark:border-yellow-700/40 hover:bg-yellow-100 dark:hover:bg-yellow-900/70",
    icon: <NestIcon className="size-3" />,
    text: "Nest",
  },
  [EncounterSource.EGG]: {
    className:
      "text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200/60 dark:border-cyan-700/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/70",
    icon: <Egg className="size-3" />,
    text: "Egg",
  },
  [EncounterSource.QUEST]: {
    className:
      "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-700/40 hover:bg-blue-100 dark:hover:bg-blue-900/70",
    icon: <Scroll className="size-3" />,
    text: "Quest",
  },
  [EncounterSource.STATIC]: {
    className:
      "text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/20 border border-gray-200/60 dark:border-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-900/70",
    icon: <LocateFixed className="size-3" />,
    text: "Static",
  },
  [EncounterSource.CAVE]: {
    className:
      "text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-900/20 border border-stone-200/60 dark:border-stone-700/40 hover:bg-stone-100 dark:hover:bg-stone-900/70",
    icon: <Mountain className="size-3" />,
    text: "Cave",
    tooltip: "Found in caves and underground areas",
  },
  [EncounterSource.ROCK_SMASH]: {
    className:
      "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/40 hover:bg-amber-100 dark:hover:bg-amber-900/70",
    icon: <Pickaxe className="size-3" />,
    text: "Rock Smash",
    tooltip: "Found by breaking rocks with Rock Smash",
  },
  [EncounterSource.POKERADAR]: {
    className:
      "text-lime-700 dark:text-lime-300 bg-lime-50 dark:bg-lime-900/20 border border-lime-200/60 dark:border-lime-700/40 hover:bg-lime-100 dark:hover:bg-lime-900/70",
    icon: <Radar className="size-3" />,
    text: "Pokéradar",
  },
  [EncounterSource.LEGENDARY]: {
    className:
      "text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 border border-purple-200/60 dark:border-purple-700/40 hover:bg-purple-100 dark:hover:bg-purple-900/70",
    icon: <LegendaryIcon className="size-3" />,
    text: "Legendary",
  },
};
