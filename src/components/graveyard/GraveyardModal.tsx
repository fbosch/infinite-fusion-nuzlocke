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
import { getLocationById } from '@/loaders/locations';
import { FusionSprite } from '@/components/PokemonSummaryCard/FusionSprite';

interface GraveyardModalProps {
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

export default function GraveyardModal({
  isOpen,
  onClose,
}: GraveyardModalProps) {
  const encounters = useEncounters();

  const deceased: DeceasedEntry[] = useMemo(() => {
    return Object.entries(encounters || {})
      .filter(([, data]) => {
        const headDead = data?.head?.status === PokemonStatus.DECEASED;
        const bodyDead = data?.body?.status === PokemonStatus.DECEASED;
        return headDead || bodyDead;
      })
      .map(([locationId, data]) => ({
        locationId,
        locationName: getLocationById(locationId)?.name || 'Unknown Location',
        head: data?.head ?? null,
        body: data?.body ?? null,
      }));
  }, [encounters]);

  const hasAny = deceased.length > 0;

  return (
    <Dialog open={isOpen} onClose={onClose} className='relative z-50 group'>
      <DialogBackdrop
        transition
        className='fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[2px] data-closed:opacity-0 data-enter:opacity-100'
        aria-hidden='true'
      />
      <div className='fixed inset-0 flex w-screen items-center justify-center p-4'>
        <DialogPanel
          transition
          aria-labelledby='graveyard-title'
          className={clsx(
            'w-full max-w-4xl max-h-[80vh] space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col',
            'transition duration-150 ease-out data-closed:opacity-0 data-closed:scale-98'
          )}
        >
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Skull
                className='h-5 w-5 text-gray-900 dark:text-gray-100'
                aria-hidden='true'
              />
              <DialogTitle
                id='graveyard-title'
                className='text-xl font-semibold text-gray-900 dark:text-white'
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
              className='flex flex-col items-center justify-center flex-1 text-gray-600 dark:text-gray-300'
              role='status'
              aria-live='polite'
            >
              <Skull className='h-10 w-10 opacity-50 mb-3' aria-hidden='true' />
              <p className='text-center'>
                No fallen Pokémon. Keep it that way!
              </p>
            </div>
          ) : (
            <div className='overflow-auto -m-2 p-2'>
              <ul
                role='list'
                className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
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
                      className='rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60 p-3 flex items-center gap-3'
                    >
                      <div className='shrink-0 group'>
                        <FusionSprite
                          locationId={entry.locationId}
                          size='lg'
                          shouldLoad
                          showStatusOverlay={false}
                        />
                      </div>
                      <div className='min-w-0'>
                        <div className='text-gray-900 dark:text-gray-100 font-medium truncate'>
                          {label || 'Fainted Pokémon'}
                        </div>
                        <div className='text-xs text-gray-600 dark:text-gray-400 truncate'>
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
