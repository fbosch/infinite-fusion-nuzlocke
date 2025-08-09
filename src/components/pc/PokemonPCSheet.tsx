'use client';

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Tab,
} from '@headlessui/react';
import clsx from 'clsx';
import { Skull, X, Computer } from 'lucide-react';
import { useEncounters, useCustomLocations } from '@/stores/playthroughs';
import { PokemonStatus, type PokemonOptionType } from '@/loaders/pokemon';
import {
  getLocationById,
  getLocationsSortedWithCustom,
} from '@/loaders/locations';
import { FusionSprite } from '@/components/PokemonSummaryCard/FusionSprite';

export interface PokemonPCSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'box' | 'graveyard';
  onChangeTab: (tab: 'box' | 'graveyard') => void;
}

type Entry = {
  locationId: string;
  locationName: string;
  head: PokemonOptionType | null | undefined;
  body: PokemonOptionType | null | undefined;
};

function getPokemonLabel(p: PokemonOptionType | null | undefined): string {
  if (!p) return '';
  return p.nickname || p.name;
}

export default function PokemonPCSheet({
  isOpen,
  onClose,
  activeTab,
  onChangeTab,
}: PokemonPCSheetProps) {
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

  const deceased: Entry[] = useMemo(() => {
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

  const stored: Entry[] = useMemo(() => {
    return Object.entries(encounters || {})
      .filter(([, data]) => {
        const headStored = data?.head?.status === PokemonStatus.STORED;
        const bodyStored = data?.body?.status === PokemonStatus.STORED;
        return headStored || bodyStored;
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

  const selectedIndex = activeTab === 'box' ? 0 : 1;

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
          id='pokemon-pc-sheet'
          aria-labelledby='pokemon-pc-title'
          className={clsx(
            'h-full w-full max-w-lg bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl',
            'transform-gpu will-change-transform will-change-opacity',
            'transition duration-100 ease-out',
            'data-closed:opacity-0 data-closed:translate-x-full data-leave:translate-x-full',
            'flex flex-col'
          )}
        >
          <div className='px-4 py-2.5'>
            <div className='flex items-center justify-between'>
              <DialogTitle
                id='pokemon-pc-title'
                className='text-sm font-semibold text-gray-900 dark:text-white'
              >
                Pokémon PC
              </DialogTitle>
              <button
                onClick={onClose}
                className={clsx(
                  'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2',
                  'p-1 rounded-md transition-colors cursor-pointer'
                )}
                aria-label='Close drawer'
              >
                <X className='h-5 w-5' />
              </button>
            </div>
          </div>

          {/* Content area: fills remaining height to allow true vertical centering */}
          <div className='flex-1 flex flex-col px-4 pt-2 pb-3 min-h-0'>
            <Tab.Group
              selectedIndex={selectedIndex}
              onChange={index => onChangeTab(index === 0 ? 'box' : 'graveyard')}
            >
              <Tab.List className='inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 p-1'>
                <Tab
                  className={({ selected }) =>
                    clsx(
                      'px-3 py-1.5 text-sm inline-flex items-center gap-1.5 cursor-pointer transition-colors focus:outline-none rounded',
                      selected
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    )
                  }
                >
                  <Computer className='h-4 w-4' />
                  Box
                  <span className='ml-1 text-[10px] px-1 rounded bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-100'>
                    {stored.length}
                  </span>
                </Tab>
                <Tab
                  className={({ selected }) =>
                    clsx(
                      'px-3 py-1.5 text-sm inline-flex items-center gap-1.5 cursor-pointer transition-colors focus:outline-none rounded',
                      selected
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    )
                  }
                >
                  <Skull className='h-4 w-4' />
                  Graveyard
                  <span className='ml-1 text-[10px] px-1 rounded bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-100'>
                    {deceased.length}
                  </span>
                </Tab>
              </Tab.List>

              <Tab.Panels className='flex-1 min-h-0 flex flex-col'>
                <Tab.Panel className='flex-1 min-h-0'>
                  {stored.length === 0 ? (
                    <div
                      className='w-full h-full grid place-items-center text-gray-600 dark:text-gray-300 px-4'
                      role='status'
                      aria-live='polite'
                    >
                      <Computer
                        className='h-10 w-10 opacity-50 mb-3'
                        aria-hidden='true'
                      />
                      <p className='text-center'>
                        No stored Pokémon in your box.
                      </p>
                    </div>
                  ) : (
                    <ul
                      role='list'
                      className='w-full grid grid-cols-2 sm:grid-cols-3 gap-2 content-start'
                    >
                      {stored.map(entry => {
                        const headActive =
                          entry.head?.status === PokemonStatus.STORED;
                        const bodyActive =
                          entry.body?.status === PokemonStatus.STORED;
                        const label = [
                          headActive ? getPokemonLabel(entry.head) : '',
                          bodyActive ? getPokemonLabel(entry.body) : '',
                        ]
                          .filter(Boolean)
                          .join(' / ');
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
                                {label || 'Stored Pokémon'}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Tab.Panel>
                <Tab.Panel className='flex-1 min-h-0'>
                  {deceased.length === 0 ? (
                    <div
                      className='w-full h-full grid place-items-center text-gray-600 dark:text-gray-300 px-4'
                      role='status'
                      aria-live='polite'
                    >
                      <Skull
                        className='h-10 w-10 opacity-50 mb-3'
                        aria-hidden='true'
                      />
                      <p className='text-center'>
                        No fallen Pokémon. Keep it that way!
                      </p>
                    </div>
                  ) : (
                    <ul
                      role='list'
                      className='w-full grid grid-cols-2 sm:grid-cols-3 gap-2 content-start'
                    >
                      {deceased.map(entry => {
                        const headActive =
                          entry.head?.status === PokemonStatus.DECEASED;
                        const bodyActive =
                          entry.body?.status === PokemonStatus.DECEASED;
                        const label = [
                          headActive ? getPokemonLabel(entry.head) : '',
                          bodyActive ? getPokemonLabel(entry.body) : '',
                        ]
                          .filter(Boolean)
                          .join(' / ');
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
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
