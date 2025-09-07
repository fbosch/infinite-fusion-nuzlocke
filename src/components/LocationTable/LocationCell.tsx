'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { Info, CheckCircle } from 'lucide-react';
import { useEncounters } from '@/stores/playthroughs';
import { useSnapshot } from 'valtio';
import { settingsStore } from '@/stores/settings';
import { isCustomLocation } from '@/loaders';
import { PokemonSprite } from '@/components/PokemonSprite';
import type { CombinedLocation } from '@/loaders/locations';
import type { PokemonOptionSchema } from '@/loaders/pokemon';
import type { EncounterData } from '@/stores/playthroughs/types';
import { z } from 'zod';
import { CursorTooltip } from '../CursorTooltip';
import { isStarterLocation } from '../../constants/special-locations';

interface LocationCellProps {
  location: CombinedLocation;
  locationName: string;
}

type Pokemon = z.infer<typeof PokemonOptionSchema>;

export default function LocationCell({
  location,
  locationName,
}: LocationCellProps) {
  const encounters = useEncounters();
  const settings = useSnapshot(settingsStore);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);

  // Find all pokemon that originated from this location
  const locationPokemon = useMemo(() => {
    if (!encounters) return [];

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
  }, [encounters, location.id]);

  // Check if any Pokémon have been moved from their original locations
  const hasMovedPokemon = useMemo(() => {
    if (!encounters) return false;

    // Check all encounters to see if any Pokémon are not in their original location
    for (const [currentLocationId, encounter] of Object.entries(encounters) as [
      string,
      EncounterData,
    ][]) {
      // Check head Pokémon
      if (
        encounter.head?.originalLocation &&
        encounter.head.originalLocation !== currentLocationId
      ) {
        return true;
      }
      // Check body Pokémon
      if (
        encounter.body?.originalLocation &&
        encounter.body.originalLocation !== currentLocationId
      ) {
        return true;
      }
    }

    return false;
  }, [encounters]);

  // Determine if we should show detailed original encounter information
  const shouldShowOriginalEncounter =
    settings.moveEncountersBetweenLocations || hasMovedPokemon;

  const encounterUids = locationPokemon
    .map(p => p.uid)
    .filter(Boolean) as string[];
  const hasEncounter = locationPokemon.length > 0;

  // Handle hover effect on encounter Pokémon elements - only when moving is relevant
  useEffect(() => {
    // Only apply hover effects if we should show original encounter information
    if (!shouldShowOriginalEncounter) return;

    encounterUids.forEach(uid => {
      const element = document.querySelector(
        `[data-uid="${uid}"]`
      ) as HTMLElement;
      if (element) {
        const overlay = element.querySelector(
          '.location-highlight-overlay'
        ) as HTMLElement;
        if (overlay) {
          if (isTooltipHovered) {
            overlay.classList.add('opacity-100');
            overlay.classList.remove('opacity-0');
          } else {
            overlay.classList.add('opacity-0');
            overlay.classList.remove('opacity-100');
          }
        }
      }
    });
  }, [isTooltipHovered, encounterUids, shouldShowOriginalEncounter]);

  const getTooltipContent = useMemo(() => {
    // Only show detailed original encounter information if setting is enabled or Pokémon have been moved
    if (locationPokemon.length > 0 && shouldShowOriginalEncounter) {
      return (
        <div className='max-w-xs'>
          <div className='text-xs dark:text-gray-400 uppercase tracking-wide mb-2.5 font-medium'>
            Original Encounter
          </div>

          <div className='flex flex-row divide-x divide-gray-200 dark:divide-gray-600'>
            {locationPokemon.map((pokemon, index) => (
              <div key={index} className='flex items-center first:pl-0 px-2'>
                <div className='flex-shrink-0 size-9 justify-center items-center flex'>
                  <PokemonSprite pokemonId={pokemon.id} generation='gen7' />
                </div>
                <div className='flex-1 min-w-0'>
                  <span className='font-medium dark:text-white text-gray-900'>
                    {pokemon.nickname || pokemon.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <hr className='my-2 dark:border-gray-600 border-gray-200' />
          <div className='text-xs dark:text-gray-400 text-gray-400'>
            {isCustomLocation(location)
              ? `Custom Location`
              : location.description}
          </div>
        </div>
      );
    }

    // Always show basic location description as fallback
    return isCustomLocation(location)
      ? `Custom Location`
      : location.description;
  }, [locationPokemon, location, shouldShowOriginalEncounter]);

  return (
    <div className='text-gray-900 dark:text-white flex gap-x-2 items-center'>
      <CursorTooltip
        content={getTooltipContent}
        onMouseEnter={() =>
          shouldShowOriginalEncounter && setIsTooltipHovered(true)
        }
        onMouseLeave={() =>
          shouldShowOriginalEncounter && setIsTooltipHovered(false)
        }
      >
        {hasEncounter ? (
          <CheckCircle className='size-4 text-green-600 cursor-help' />
        ) : (
          <Info className='size-4 text-gray-400 dark:text-gray-600 cursor-help' />
        )}
      </CursorTooltip>
      <h2 className='text-sm truncate rounded-md focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-0.5 break-words block'>
        {isCustomLocation(location) ? (
          locationName
        ) : (
          <a
            href={
              isStarterLocation(location.id)
                ? `https://infinitefusion.fandom.com/wiki/Pallet_Town`
                : `https://infinitefusion.fandom.com/wiki/${locationName.replaceAll(' ', '_')}`
            }
            target='_blank'
            rel='noopener noreferrer'
            className='hover:underline focus:outline-none px-0.5'
          >
            {locationName}
          </a>
        )}
      </h2>
    </div>
  );
}
