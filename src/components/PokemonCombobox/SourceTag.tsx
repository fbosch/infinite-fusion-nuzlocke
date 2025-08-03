'use client';

import React from 'react';
import {
  ArrowUpDown,
  Gift,
  Egg,
  Scroll,
  LocateFixed,
  Fish,
  Waves,
  Mountain,
  Pickaxe,
  Radar,
} from 'lucide-react';
import clsx from 'clsx';
import { EncounterSource } from '@/loaders/encounters';
import WildIcon from '@/assets/images/tall-grass.svg';
import PokeballIcon from '@/assets/images/pokeball.svg';
import NestIcon from '@/assets/images/nest.svg';
import LegendaryIcon from '@/assets/images/legendary.svg';
import { isStarterLocation } from '@/constants/special-locations';

interface SourceTagProps {
  sources: EncounterSource[];
  locationId: string | undefined;
}

export function SourceTag({ sources, locationId }: SourceTagProps) {
  if (!sources.length) return null;

  // Handle starter location special case
  if (isStarterLocation(locationId)) {
    return (
      <span
        className={clsx(
          'text-xs px-1.5 py-0.5 rounded-sm font-medium leading-none flex items-center gap-1',
          'transition-all duration-200 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-700/40 hover:bg-blue-100 dark:hover:bg-blue-900/70',
          'group-hover:px-2 group-hover:gap-2 font-medium'
        )}
        title='Starter'
      >
        <span className='hidden group-hover:inline transition-all duration-200'>
          Starter
        </span>
        <PokeballIcon className='size-3' />
      </span>
    );
  }

  // For multiple sources, show them as separate tags or combined
  if (sources.length === 1) {
    const config = tagConfig[sources[0]];
    return (
      <span
        className={clsx(
          'text-xs px-1.5 py-0.5 rounded-sm font-medium leading-none flex items-center gap-1',
          'transition-all duration-200',
          config.className,
          'group-hover:px-2 group-hover:gap-2'
        )}
        title={config.text}
      >
        <span className='hidden group-hover:inline transition-all duration-200'>
          {config.text}
        </span>
        {config.icon}
      </span>
    );
  }

  // Multiple sources - show as combined tag with multiple icons
  return (
    <div className='flex items-center gap-1'>
      {sources.map(source => {
        const config = tagConfig[source];
        return (
          <span
            key={source}
            className={clsx(
              'text-xs px-1.5 py-0.5 rounded-sm font-medium leading-none flex items-center gap-1',
              'transition-all duration-200',
              config.className,
              'group-hover:px-2 group-hover:gap-2'
            )}
            title={config.text}
          >
            <span className='hidden group-hover:inline transition-all duration-200'>
              {config.text}
            </span>
            {config.icon}
          </span>
        );
      })}
    </div>
  );
}

SourceTag.displayName = 'SourceTag';

const tagConfig: Record<
  EncounterSource,
  { text: string; className: string; icon: React.ReactNode; tooltip?: string }
> = {
  [EncounterSource.WILD]: {
    text: 'Wild',
    className:
      'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200/60 dark:border-green-700/40 hover:bg-green-100 dark:hover:bg-green-900/70 font-medium',
    icon: <WildIcon className='size-3' />,
  },
  [EncounterSource.GRASS]: {
    text: 'Grass',
    className:
      'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200/60 dark:border-green-700/40 hover:bg-green-100 dark:hover:bg-green-900/70',
    icon: <WildIcon className='size-3' />,
  },
  [EncounterSource.SURF]: {
    text: 'Surf',
    className:
      'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-700/40 hover:bg-blue-100 dark:hover:bg-blue-900/70',
    icon: <Waves className='size-3' />,
  },
  [EncounterSource.FISHING]: {
    text: 'Fish',
    className:
      'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20 border border-teal-200/60 dark:border-teal-700/40 hover:bg-teal-100 dark:hover:bg-teal-900/70',
    icon: <Fish className='size-3' />,
  },
  [EncounterSource.GIFT]: {
    text: 'Gift',
    className:
      'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200/60 dark:border-red-700/40 hover:bg-red-100 dark:hover:bg-red-900/70',
    icon: <Gift className='size-3' />,
  },
  [EncounterSource.TRADE]: {
    text: 'Trade',
    className:
      'text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 border border-orange-200/60 dark:border-orange-700/40 hover:bg-orange-100 dark:hover:bg-orange-900/70',
    icon: <ArrowUpDown className='size-3' />,
  },
  [EncounterSource.NEST]: {
    text: 'Nest',
    className:
      'text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200/60 dark:border-yellow-700/40 hover:bg-yellow-100 dark:hover:bg-yellow-900/70',
    icon: <NestIcon className='size-3' />,
  },
  [EncounterSource.EGG]: {
    text: 'Egg',
    className:
      'text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200/60 dark:border-cyan-700/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/70',
    icon: <Egg className='size-3' />,
  },
  [EncounterSource.QUEST]: {
    text: 'Quest',
    className:
      'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-700/40 hover:bg-blue-100 dark:hover:bg-blue-900/70',
    icon: <Scroll className='size-3' />,
  },
  [EncounterSource.STATIC]: {
    text: 'Static',
    className:
      'text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/20 border border-gray-200/60 dark:border-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-900/70',
    icon: <LocateFixed className='size-3' />,
  },
  [EncounterSource.CAVE]: {
    text: 'Cave',
    className:
      'text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-900/20 border border-stone-200/60 dark:border-stone-700/40 hover:bg-stone-100 dark:hover:bg-stone-900/70',
    icon: <Mountain className='size-3' />,
    tooltip: 'Found in caves and underground areas',
  },
  [EncounterSource.ROCK_SMASH]: {
    text: 'Rock Smash',
    className:
      'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/40 hover:bg-amber-100 dark:hover:bg-amber-900/70',
    icon: <Pickaxe className='size-3' />,
    tooltip: 'Found by breaking rocks with Rock Smash',
  },
  [EncounterSource.POKERADAR]: {
    text: 'Pokéradar',
    className:
      'text-lime-700 dark:text-lime-300 bg-lime-50 dark:bg-lime-900/20 border border-lime-200/60 dark:border-lime-700/40 hover:bg-lime-100 dark:hover:bg-lime-900/70',
    icon: <Radar className='size-3' />,
  },
  [EncounterSource.LEGENDARY]: {
    text: 'Legendary',
    className:
      'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 border border-purple-200/60 dark:border-purple-700/40 hover:bg-purple-100 dark:hover:bg-purple-900/70',
    icon: <LegendaryIcon className='size-3' />,
  },
};
