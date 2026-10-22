"use client";

import { CheckCircle, Info } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { EncounterData } from "@/features/playthroughs";
import { useEncounters } from "@/features/playthroughs";
import type { PokemonOptionType } from "@/features/pokemon";
import { PokemonSprite } from "@/features/pokemon";
import { CursorTooltip } from "@/shared/ui/cursor-tooltip";
import { useEncounterConfiguration } from "@/shared/ui/encounter-configuration";
import type { CombinedLocation } from "../../data/locations";
import { isCustomLocation } from "../../data/locations";
import { isStarterLocation } from "../../model/special-locations";

interface LocationCellProps {
  location: CombinedLocation;
  locationName: string;
}

type Pokemon = PokemonOptionType;

function getLocationPokemonKey(pokemon: Pokemon): string {
  if (pokemon.uid) {
    return pokemon.uid;
  }

  return `${pokemon.id}-${pokemon.name}-${pokemon.originalLocation ?? "unknown"}`;
}

export default function LocationCell({
  location,
  locationName,
}: LocationCellProps) {
  const encounters = useEncounters();
  const { moveEncountersBetweenLocations } = useEncounterConfiguration();
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);

  // Find all pokemon that originated from this location
  const locationPokemon = (() => {
    if (!encounters) {
      return [];
    }

    const pokemon: Pokemon[] = [];

    // Go through all encounters and find pokemon from this location
    for (const encounter of Object.values(encounters) as EncounterData[]) {
      if (encounter.head?.originalLocation === location.id) {
        pokemon.push(encounter.head);
      }
      if (encounter.body?.originalLocation === location.id) {
        pokemon.push(encounter.body);
      }
    }

    return pokemon;
  })();

  const shouldShowOriginalEncounter = moveEncountersBetweenLocations;

  const handleTooltipMouseEnter = useCallback(() => {
    if (shouldShowOriginalEncounter) {
      setIsTooltipHovered(true);
    }
  }, [shouldShowOriginalEncounter]);

  const handleTooltipMouseLeave = useCallback(() => {
    if (shouldShowOriginalEncounter) {
      setIsTooltipHovered(false);
    }
  }, [shouldShowOriginalEncounter]);

  const encounterUids = locationPokemon.flatMap((pokemon) =>
    pokemon.uid ? [pokemon.uid] : [],
  );
  const hasEncounter = locationPokemon.length > 0;

  // Handle hover effect on encounter Pokémon elements - only when moving is relevant
  useEffect(() => {
    // Only apply hover effects if we should show original encounter information
    if (!shouldShowOriginalEncounter) {
      return;
    }

    for (const uid of encounterUids) {
      const element = document.querySelector(
        `[data-uid="${uid}"]`,
      ) as HTMLElement;
      if (element) {
        const overlay = element.querySelector(
          ".location-highlight-overlay",
        ) as HTMLElement;
        if (overlay) {
          if (isTooltipHovered) {
            overlay.classList.add("opacity-100");
            overlay.classList.remove("opacity-0");
          } else {
            overlay.classList.add("opacity-0");
            overlay.classList.remove("opacity-100");
          }
        }
      }
    }
  }, [isTooltipHovered, encounterUids, shouldShowOriginalEncounter]);

  const getTooltipContent = (() => {
    if (locationPokemon.length > 0 && shouldShowOriginalEncounter) {
      return (
        <div className="max-w-xs">
          <div className="mb-2.5 font-medium text-xs uppercase tracking-wide dark:text-gray-400">
            Original Encounter
          </div>

          <div className="flex flex-row divide-x divide-gray-200 dark:divide-gray-600">
            {locationPokemon.map((pokemon) => (
              <div
                className="flex items-center px-2 first:pl-0"
                key={getLocationPokemonKey(pokemon)}
              >
                <div className="flex size-9 flex-shrink-0 items-center justify-center">
                  <PokemonSprite generation="gen7" pokemonId={pokemon.id} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {pokemon.nickname || pokemon.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <hr className="my-2 border-gray-200 dark:border-gray-600" />
          <div className="text-gray-400 text-xs dark:text-gray-400">
            {isCustomLocation(location)
              ? "Custom Location"
              : location.description}
          </div>
        </div>
      );
    }

    // Always show basic location description as fallback
    return isCustomLocation(location)
      ? "Custom Location"
      : location.description;
  })();

  return (
    <div className="flex items-center gap-x-2 text-gray-900 dark:text-white">
      <CursorTooltip
        content={getTooltipContent}
        delay={300}
        onMouseEnter={handleTooltipMouseEnter}
        onMouseLeave={handleTooltipMouseLeave}
      >
        {hasEncounter ? (
          <CheckCircle className="size-4 cursor-help text-green-600" />
        ) : (
          <Info className="size-4 cursor-help text-gray-400 dark:text-gray-600" />
        )}
      </CursorTooltip>
      <h2 className="block truncate break-words rounded-md text-sm focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-0.5">
        {isCustomLocation(location) ? (
          locationName
        ) : (
          <a
            className="px-0.5 hover:underline focus:outline-none"
            href={
              isStarterLocation(location.id)
                ? "https://infinitefusion.fandom.com/wiki/Pallet_Town"
                : `https://infinitefusion.fandom.com/wiki/${locationName.replaceAll(" ", "_")}`
            }
            rel="noopener noreferrer"
            target="_blank"
          >
            {locationName}
          </a>
        )}
      </h2>
    </div>
  );
}
