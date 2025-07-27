'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { Info, CheckCircle } from 'lucide-react';
import { useEncounters } from '@/stores/playthroughs';
import { isCustomLocation } from '@/loaders';
import type { CombinedLocation } from '@/loaders/locations';
import type { PokemonOptionSchema } from '@/loaders/pokemon';
import { z } from 'zod';
import { CursorTooltip } from '../CursorTooltip';

interface LocationCellProps {
  location: CombinedLocation;
  locationName: string;
}

type Pokemon = z.infer<typeof PokemonOptionSchema>;

type EncounterResult =
  | { type: 'fusion'; head: Pokemon; body: Pokemon }
  | { type: 'single'; pokemon: Pokemon }
  | null;

type LocationEncounterInfo = {
  hasEncounter: boolean;
  originalEncounter: EncounterResult;
};

// Optimized function that combines both checks in a single iteration
const getLocationEncounterInfo = (
  locationId: string,
  encounters: ReturnType<typeof useEncounters>
): LocationEncounterInfo => {
  if (!encounters) {
    return { hasEncounter: false, originalEncounter: null };
  }

  // Single iteration through encounters to find matches
  for (const [encLocationId, encounter] of Object.entries(encounters)) {
    const headMatch = encounter.head?.originalLocation === locationId;
    const bodyMatch = encounter.body?.originalLocation === locationId;

    if (headMatch || bodyMatch) {
      // Found an encounter for this location
      let originalEncounter: EncounterResult = null;

      // Determine the encounter type
      if (headMatch && bodyMatch && encounter.head && encounter.body) {
        originalEncounter = {
          type: 'fusion' as const,
          head: encounter.head,
          body: encounter.body,
        };
      } else if (headMatch && encounter.head) {
        originalEncounter = {
          type: 'single' as const,
          pokemon: encounter.head,
        };
      } else if (bodyMatch && encounter.body) {
        originalEncounter = {
          type: 'single' as const,
          pokemon: encounter.body,
        };
      }

      return { hasEncounter: true, originalEncounter };
    }
  }

  return { hasEncounter: false, originalEncounter: null };
};

export default function LocationCell({
  location,
  locationName,
}: LocationCellProps) {
  const encounters = useEncounters();
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);

  // Memoize the expensive computation
  const { hasEncounter, originalEncounter } = useMemo(
    () => getLocationEncounterInfo(location.id, encounters),
    [location.id, encounters]
  );

  // Get all encounter UIDs for this location
  const encounterUids = useMemo(() => {
    if (!encounters || !hasEncounter) return [];

    const uids: string[] = [];

    // Find all encounters that originated from this location
    for (const [encounterId, encounter] of Object.entries(encounters)) {
      const headMatch = encounter.head?.originalLocation === location.id;
      const bodyMatch = encounter.body?.originalLocation === location.id;

      if (headMatch && encounter.head?.uid) {
        uids.push(encounter.head.uid);
      }
      if (bodyMatch && encounter.body?.uid) {
        uids.push(encounter.body.uid);
      }
    }

    return uids;
  }, [encounters, hasEncounter, location.id]);

  // Handle hover effect on encounter Pokémon elements
  useEffect(() => {
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
  }, [isTooltipHovered, encounterUids]);

  const getTooltipContent = useMemo(() => {
    if (hasEncounter && originalEncounter) {
      const nickname =
        originalEncounter.type === 'fusion'
          ? originalEncounter.head.nickname || originalEncounter.body.nickname
          : originalEncounter.pokemon.nickname;

      return (
        <div className='max-w-xs'>
          <div className='text-xs text-gray-400 uppercase tracking-wide mb-1'>
            Original Encounter
          </div>

          {originalEncounter.type === 'fusion' ? (
            // Fusion encounter display
            <div className='mb-2'>
              <div className='flex-1 min-w-0'>
                <span className='font-semibold text-white'>
                  {nickname ? `${nickname} • ` : ''}
                  <span className='text-gray-300'>
                    {originalEncounter.head.name}/{originalEncounter.body.name}
                  </span>
                </span>
              </div>
            </div>
          ) : (
            // Single Pokemon encounter display
            <div className='mb-2'>
              <div className='flex-1 min-w-0'>
                <span className='font-semibold text-white'>
                  {originalEncounter.pokemon.nickname
                    ? `${originalEncounter.pokemon.nickname} • `
                    : ''}
                  <span className='text-gray-300'>
                    {originalEncounter.pokemon.name}
                  </span>
                </span>
              </div>
            </div>
          )}
          <hr className='my-2 border-gray-600' />
          <div className='text-xs text-gray-400'>
            {isCustomLocation(location)
              ? `Custom Location`
              : location.description}
          </div>
        </div>
      );
    }

    return isCustomLocation(location)
      ? `Custom Location`
      : location.description;
  }, [hasEncounter, originalEncounter, location]);

  return (
    <tr className='font-medium text-gray-900 dark:text-white flex gap-x-2 items-center'>
      <CursorTooltip
        content={getTooltipContent}
        onMouseEnter={() => setIsTooltipHovered(true)}
        onMouseLeave={() => setIsTooltipHovered(false)}
      >
        {hasEncounter ? (
          <CheckCircle className='size-4 text-green-600 cursor-help' />
        ) : (
          <Info className='size-4 text-gray-400 dark:text-gray-600 cursor-help' />
        )}
      </CursorTooltip>
      <h2 className='text-sm'>{locationName}</h2>
    </tr>
  );
}
