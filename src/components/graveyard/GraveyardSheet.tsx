'use client';

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import clsx from 'clsx';
import { Skull, X } from 'lucide-react';
import { useEncounters } from '@/stores/playthroughs';
import { PokemonStatus, type PokemonOptionType } from '@/loaders/pokemon';
import {
  getLocationById,
  getLocationsSortedWithCustom,
} from '@/loaders/locations';
import { useCustomLocations } from '@/stores/playthroughs';
import { FusionSprite } from '@/components/PokemonSummaryCard/FusionSprite';

interface GraveyardSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

type DeceasedEntry = {
  locationId: string;
  locationName: string;
  head: PokemonOptionType | null | undefined;
  body: PokemonOptionType | null | undefined;
};

function getPokemonLabel(p: PokemonOptionType | null | undefined): string {
  if (!p) return '';
  return p.nickname || p.name;
}

export default function GraveyardSheet({
  isOpen,
  onClose,
}: GraveyardSheetProps) {
  const encounters = useEncounters();
  const customLocations = useCustomLocations();
  const mergedLocations = useMemo(
    () => getLocationsSortedWithCustom(customLocations),
    [customLocations]
  );
  const idToName = useMemo(() => {
    const map = new Map<string, string>();
    for (const loc of mergedLocations) map.set(loc.id, loc.name);
    return map;
  }, [mergedLocations]);

  const deceased: DeceasedEntry[] = useMemo(() => {
    return Object.entries(encounters || {})
      .filter(([, data]) => {
        const headDead = data?.head?.status === PokemonStatus.DECEASED;
        const bodyDead = data?.body?.status === PokemonStatus.DECEASED;
        return headDead || bodyDead;
      })
      .map(([locationId, data]) => ({
        locationId,
        locationName:
          idToName.get(locationId) ||
          getLocationById(locationId)?.name ||
          'Unknown Location',
        head: data?.head ?? null,
        body: data?.body ?? null,
      }));
  }, [encounters, idToName]);

  const hasAny = deceased.length > 0;

  return (
    <Dialog open={isOpen} onClose={onClose} className='relative z-50 group'>
      <DialogBackdrop
        transition
        className='fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[2px] data-closed:opacity-0 data-enter:opacity-100 duration-100 ease-out'
        aria-hidden='true'
      />

      <div className='fixed inset-y-0 right-0 flex w-screen items-stretch justify-end p-0'>
        <DialogPanel
          transition
          id='graveyard-sheet'
          aria-labelledby='graveyard-title'
          className={clsx(
            'h-full w-full max-w-lg bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl',
            'transform-gpu will-change-transform will-change-opacity',
            'transition duration-100 ease-out',
            // Quick fade + slide-in from the side (no scale)
            'data-closed:opacity-0',
            'data-closed:translate-x-full data-leave:translate-x-full',
            'flex flex-col'
          )}
        >
          <div className='flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700'>
            <div className='flex items-center gap-2'>
              <Skull
                className='h-5 w-5 text-gray-900 dark:text-gray-100'
                aria-hidden='true'
              />
              <DialogTitle
                id='graveyard-title'
                className='text-base font-semibold text-gray-900 dark:text-white'
              >
                Graveyard{hasAny ? ` (${deceased.length})` : ''}
              </DialogTitle>
            </div>
            <button
              onClick={onClose}
              className={clsx(
                'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2',
                'p-1 rounded-md transition-colors cursor-pointer'
              )}
              aria-label='Close graveyard'
            >
              <X className='h-5 w-5' />
            </button>
          </div>

          {!hasAny ? (
            <div
              className='flex flex-col items-center justify-center flex-1 text-gray-600 dark:text-gray-300 px-4'
              role='status'
              aria-live='polite'
            >
              <Skull className='h-10 w-10 opacity-50 mb-3' aria-hidden='true' />
              <p className='text-center'>
                No fallen Pokémon. Keep it that way!
              </p>
            </div>
          ) : (
            <div className='flex-1 overflow-auto p-3'>
              <ul
                role='list'
                className='grid grid-cols-2 sm:grid-cols-3 gap-2 content-start'
              >
                {deceased.map(entry => {
                  const headDead =
                    entry.head?.status === PokemonStatus.DECEASED;
                  const bodyDead =
                    entry.body?.status === PokemonStatus.DECEASED;
                  const labelParts = [
                    headDead ? getPokemonLabel(entry.head) : '',
                    bodyDead ? getPokemonLabel(entry.body) : '',
                  ].filter(Boolean);
                  const label = labelParts.join(' / ');

                  return (
                    <li
                      key={entry.locationId}
                      className='relative pt-4.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-2 flex flex-col items-center gap-1 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                    >
                      <FusionSprite
                        locationId={entry.locationId}
                        size='lg'
                        shouldLoad
                        className='pt-2'
                        showStatusOverlay={false}
                        showTooltip={false}
                      />
                      <div className='w-full min-w-0 text-center'>
                        <div className='text-gray-900 dark:text-gray-100 text-xs font-medium truncate'>
                          {label || 'Fainted Pokémon'}
                        </div>
                        <div className='text-[10px] text-gray-600 dark:text-gray-400 truncate'>
                          {entry.locationName}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
