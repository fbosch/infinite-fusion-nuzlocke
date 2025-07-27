'use client';

import React, { useMemo, useEffect, useState } from 'react';
import Image from 'next/image';
import { Info, CheckCircle } from 'lucide-react';
import { useEncounters } from '@/stores/playthroughs';
import { isCustomLocation } from '@/loaders';
import { getPokemonSpriteUrlFromOption } from '@/components/PokemonCombobox/PokemonCombobox';
import type { CombinedLocation } from '@/loaders/locations';
import type { PokemonOptionSchema } from '@/loaders/pokemon';
import { z } from 'zod';
import { CursorTooltip } from '../CursorTooltip';

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
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);

  // Find all pokemon that originated from this location
  const locationPokemon = useMemo(() => {
    if (!encounters) return [];

    const pokemon: Pokemon[] = [];

    // Go through all encounters and find pokemon from this location
    for (const encounter of Object.values(encounters)) {
      if (encounter.head?.originalLocation === location.id) {
        pokemon.push(encounter.head);
      }
      if (encounter.body?.originalLocation === location.id) {
        pokemon.push(encounter.body);
      }
    }

    return pokemon;
  }, [encounters, location.id]);

  const encounterUids = locationPokemon
    .map(p => p.uid)
    .filter(Boolean) as string[];
  const hasEncounter = locationPokemon.length > 0;

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
    if (locationPokemon.length > 0) {
      return (
        <div className='max-w-xs'>
          <div className='text-xs dark:text-gray-400 uppercase tracking-wide mb-2'>
            Original Encounter
          </div>

          {locationPokemon.map((pokemon, index) => (
            <div key={index} className='mb-3 flex items-center gap-2'>
              <div className='flex-shrink-0'>
                <Image
                  src={getPokemonSpriteUrlFromOption(pokemon)}
                  alt={pokemon.name}
                  width={20}
                  height={20}
                  className='scale-170 image-render-high-quality'
                  loading='lazy'
                  unoptimized
                  decoding='async'
                />
              </div>
              <div className='flex-1 min-w-0'>
                <span className='font-semibold dark:text-white text-gray-900'>
                  {pokemon.nickname ? `${pokemon.nickname} • ` : ''}
                  <span className='dark:text-gray-300 text-gray-700'>
                    {pokemon.name}
                  </span>
                </span>
              </div>
            </div>
          ))}

          <hr className='my-2 dark:border-gray-600 border-gray-200' />
          <div className='text-xs dark:text-gray-400 text-gray-400'>
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
  }, [locationPokemon, location]);

  return (
    <div className='font-semibold text-gray-900 dark:text-white flex gap-x-2 items-center'>
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
    </div>
  );
}
