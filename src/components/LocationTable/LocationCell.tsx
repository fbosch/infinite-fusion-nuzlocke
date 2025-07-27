'use client';

import React from 'react';
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

// Helper function to check if a location has been used for any encounters (Nuzlocke rule: one catch per route)
const hasLocationEncounter = (
  locationId: string,
  encounters: ReturnType<typeof useEncounters>
): boolean => {
  if (!encounters) return false;

  // Check all encounters across all locations
  for (const [encLocationId, encounter] of Object.entries(encounters)) {
    // Check head pokemon
    if (encounter.head?.originalLocation === locationId) {
      return true;
    }

    // Check body pokemon
    if (encounter.body?.originalLocation === locationId) {
      return true;
    }
  }

  return false;
};

// Helper function to find the Pokemon originally encountered at this location
const getOriginalEncounter = (
  locationId: string,
  encounters: ReturnType<typeof useEncounters>
): EncounterResult => {
  if (!encounters) return null;

  // Check all encounters across all locations
  for (const [encLocationId, encounter] of Object.entries(encounters)) {
    const headMatch = encounter.head?.originalLocation === locationId;
    const bodyMatch = encounter.body?.originalLocation === locationId;

    // If both head and body match the location, it was a fusion encounter
    if (headMatch && bodyMatch && encounter.head && encounter.body) {
      return {
        type: 'fusion' as const,
        head: encounter.head,
        body: encounter.body,
      };
    }

    // If only head matches
    if (headMatch && encounter.head) {
      return {
        type: 'single' as const,
        pokemon: encounter.head,
      };
    }

    // If only body matches
    if (bodyMatch && encounter.body) {
      return {
        type: 'single' as const,
        pokemon: encounter.body,
      };
    }
  }

  return null;
};

export default function LocationCell({
  location,
  locationName,
}: LocationCellProps) {
  const encounters = useEncounters();
  const hasEncounter = hasLocationEncounter(location.id, encounters);
  const originalEncounter = getOriginalEncounter(location.id, encounters);

  const getTooltipContent = () => {
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
  };

  return (
    <span className='font-medium text-gray-900 dark:text-white flex gap-x-2 items-center'>
      <CursorTooltip content={getTooltipContent()}>
        {hasEncounter ? (
          <CheckCircle className='size-4 text-green-600 cursor-help' />
        ) : (
          <Info className='size-4 text-gray-400 dark:text-gray-600 cursor-help' />
        )}
      </CursorTooltip>
      <h2 className='text-sm'>{locationName}</h2>
    </span>
  );
}
