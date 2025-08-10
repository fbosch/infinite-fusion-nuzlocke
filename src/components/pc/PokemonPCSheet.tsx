'use client';

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from '@headlessui/react';
import clsx from 'clsx';
import { Skull, X, Boxes, Box, Users } from 'lucide-react';
import { useEncounters, useCustomLocations } from '@/stores/playthroughs';
import { PokemonStatus, type PokemonOptionType } from '@/loaders/pokemon';
import {
  getLocationById,
  getLocationsSortedWithCustom,
} from '@/loaders/locations';
import { FusionSprite } from '@/components/PokemonSummaryCard/FusionSprite';
import { PokemonContextMenu } from '@/components/PokemonSummaryCard/PokemonContextMenu';
import { getNicknameText } from '@/components/PokemonSummaryCard/utils';
import PokeballIcon from '@/assets/images/pokeball.svg';
import HeadIcon from '@/assets/images/head.svg';
import BodyIcon from '@/assets/images/body.svg';

export interface PokemonPCSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'team' | 'box' | 'graveyard';
  onChangeTab: (tab: 'team' | 'box' | 'graveyard') => void;
}

type Entry = {
  locationId: string;
  locationName: string;
  head: PokemonOptionType | null;
  body: PokemonOptionType | null;
};

function getPokemonLabel(p: PokemonOptionType | null | undefined): string {
  if (!p) return '';
  return p.nickname || p.name;
}

interface PCEntryItemProps {
  entry: Entry;
  idToName: Map<string, string>;
  mode: 'stored' | 'graveyard';
  hoverRingClass: string; // e.g., 'hover:ring-blue-400/60'
  fallbackLabel: string; // e.g., 'Stored Pokémon'
  className?: string; // extra classes like size-35 for specific lists
}

function PCEntryItem({
  entry,
  idToName,
  mode,
  hoverRingClass,
  fallbackLabel,
  className,
}: PCEntryItemProps) {
  const encounters = useEncounters();
  const currentEncounter = encounters?.[entry.locationId];
  const isFusion = currentEncounter?.isFusion || false;

  const isStoredMode = mode === 'stored';
  const headActive = isStoredMode
    ? entry.head?.status === PokemonStatus.STORED
    : entry.head?.status === PokemonStatus.DECEASED;
  const bodyActive = isStoredMode
    ? entry.body?.status === PokemonStatus.STORED
    : entry.body?.status === PokemonStatus.DECEASED;
  const hasAny = Boolean(headActive || bodyActive);
  const label = [
    headActive ? getPokemonLabel(entry.head) : '',
    bodyActive ? getPokemonLabel(entry.body) : '',
  ]
    .filter(Boolean)
    .join(' / ');

  return (
    <PokemonContextMenu
      locationId={entry.locationId}
      encounterData={{
        head: entry.head,
        body: entry.body,
        isFusion: currentEncounter?.isFusion || false,
      }}
      shouldLoad={true}
    >
      <li
        key={entry.locationId}
        role='listitem'
        className={clsx(
          'relative rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:ring-2 transition-all duration-200 cursor-pointer',
          hoverRingClass,
          className
        )}
      >
        <div className='flex items-center gap-3 p-3'>
          <div className='flex-shrink-0 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-md'>
            {hasAny && (
              <FusionSprite
                headPokemon={entry.head ?? null}
                bodyPokemon={entry.body ?? null}
                shouldLoad
                showStatusOverlay={false}
                showTooltip={false}
              />
            )}
          </div>
          <div className='flex-1 min-w-0'>
            <div className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>
              {label || fallbackLabel}
            </div>
            <div className='text-xs text-gray-500 dark:text-gray-400 truncate'>
              {idToName.get(entry.locationId) || 'Unknown Location'}
            </div>
          </div>
        </div>
      </li>
    </PokemonContextMenu>
  );
}

interface TeamEntryItemProps {
  entry: Entry;
  idToName: Map<string, string>;
  isOverLimit: boolean;
}

function TeamEntryItem({ entry, idToName, isOverLimit }: TeamEntryItemProps) {
  const encounters = useEncounters();
  const currentEncounter = encounters?.[entry.locationId];
  const headActive =
    entry.head?.status === PokemonStatus.CAPTURED ||
    entry.head?.status === PokemonStatus.RECEIVED ||
    entry.head?.status === PokemonStatus.TRADED;
  const bodyActive =
    entry.body?.status === PokemonStatus.CAPTURED ||
    entry.body?.status === PokemonStatus.RECEIVED ||
    entry.body?.status === PokemonStatus.TRADED;
  const hasAny = Boolean(headActive || bodyActive);
  const isFusion =
    (currentEncounter?.isFusion && headActive && bodyActive) || false;

  if (!hasAny) return null;

  return (
    <PokemonContextMenu
      locationId={entry.locationId}
      encounterData={{
        head: entry.head,
        body: entry.body,
        isFusion: currentEncounter?.isFusion || false,
      }}
      shouldLoad={true}
    >
      <li
        key={entry.locationId}
        role='listitem'
        className={clsx(
          'relative rounded-lg border transition-all duration-200 cursor-pointer',
          {
            'border-red-500 bg-red-50 dark:bg-red-900/20 hover:ring-2 hover:ring-red-400/60':
              isOverLimit,
            'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:ring-2 hover:ring-green-400/60':
              !isOverLimit,
          }
        )}
      >
        <div className='p-4'>
          <div className='flex items-start gap-4'>
            <div className='flex-shrink-0 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg p-2'>
              <FusionSprite
                headPokemon={entry.head ?? null}
                bodyPokemon={entry.body ?? null}
                shouldLoad
                className='top-1.5'
                showStatusOverlay={false}
                showTooltip={false}
              />
            </div>
            <div className='flex-1 min-w-0 space-y-2'>
              <div className='flex items-center gap-2'>
                <h3 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                  {getNicknameText(entry.head, entry.body, isFusion)}
                </h3>
              </div>

              {isFusion && (
                <div className='flex align-center gap-x-3'>
                  {headActive && (
                    <div className='flex items-center gap-1 text-sm'>
                      <HeadIcon className='w-4 h-4' />
                      <span className='text-gray-700 dark:text-gray-300'>
                        {entry.head?.name || 'Unknown'}
                      </span>
                    </div>
                  )}
                  {bodyActive && (
                    <div className='flex items-center gap-1 text-sm'>
                      <BodyIcon className='w-4 h-4' />
                      <span className='text-gray-700 dark:text-gray-300'>
                        {entry.body?.name || 'Unknown'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className='text-xs text-gray-500 dark:text-gray-400'>
                {idToName.get(entry.locationId) || 'Unknown Location'}
              </div>
            </div>
          </div>
        </div>
      </li>
    </PokemonContextMenu>
  );
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

  const team: Entry[] = useMemo(() => {
    const entries: Entry[] = [];

    Object.entries(encounters || {}).forEach(([locationId, data]) => {
      const headActive =
        data?.head?.status === PokemonStatus.CAPTURED ||
        data?.head?.status === PokemonStatus.RECEIVED ||
        data?.head?.status === PokemonStatus.TRADED;
      const bodyActive =
        data?.body?.status === PokemonStatus.CAPTURED ||
        data?.body?.status === PokemonStatus.RECEIVED ||
        data?.body?.status === PokemonStatus.TRADED;

      if (headActive || bodyActive) {
        entries.push({
          locationId,
          locationName:
            idToName.get(locationId) ||
            getLocationById(locationId)?.name ||
            'Unknown Location',
          head: headActive ? data?.head || null : null,
          body: bodyActive ? data?.body || null : null,
        });
      }
    });

    return entries;
  }, [encounters, idToName]);

  const deceased: Entry[] = useMemo(() => {
    const entries: Entry[] = [];

    Object.entries(encounters || {}).forEach(([locationId, data]) => {
      const headDead = data?.head?.status === PokemonStatus.DECEASED;
      const bodyDead = data?.body?.status === PokemonStatus.DECEASED;

      if (headDead || bodyDead) {
        entries.push({
          locationId,
          locationName:
            idToName.get(locationId) ||
            getLocationById(locationId)?.name ||
            'Unknown Location',
          head: headDead ? data?.head || null : null,
          body: bodyDead ? data?.body || null : null,
        });
      }
    });

    return entries;
  }, [encounters, idToName]);

  const stored: Entry[] = useMemo(() => {
    const entries: Entry[] = [];

    Object.entries(encounters || {}).forEach(([locationId, data]) => {
      const headStored = data?.head?.status === PokemonStatus.STORED;
      const bodyStored = data?.body?.status === PokemonStatus.STORED;

      if (headStored || bodyStored) {
        entries.push({
          locationId,
          locationName:
            idToName.get(locationId) ||
            getLocationById(locationId)?.name ||
            'Unknown Location',
          head: headStored ? data?.head || null : null,
          body: bodyStored ? data?.body || null : null,
        });
      }
    });

    return entries;
  }, [encounters, idToName]);

  const getSelectedIndex = (tab: 'team' | 'box' | 'graveyard') => {
    switch (tab) {
      case 'team':
        return 0;
      case 'box':
        return 1;
      case 'graveyard':
        return 2;
      default:
        return 0;
    }
  };

  const getTabFromIndex = (index: number): 'team' | 'box' | 'graveyard' => {
    switch (index) {
      case 0:
        return 'team';
      case 1:
        return 'box';
      case 2:
        return 'graveyard';
      default:
        return 'team';
    }
  };

  const selectedIndex = getSelectedIndex(activeTab);

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
            <TabGroup
              selectedIndex={selectedIndex}
              onChange={index => onChangeTab(getTabFromIndex(index))}
            >
              <TabList className='flex items-center gap-2 mb-4'>
                <Tab
                  className={({ selected }) =>
                    clsx(
                      'px-3 py-1.5 text-sm inline-flex items-center gap-2 rounded-md border transition-colors focus:outline-none cursor-pointer',
                      selected
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 shadow'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                    )
                  }
                >
                  <PokeballIcon className='h-4 w-4' />
                  <span className='font-medium'>Team</span>
                  <span className='ml-1 text-[10px] px-1 rounded bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100'>
                    {team.length}
                  </span>
                </Tab>
                <Tab
                  className={({ selected }) =>
                    clsx(
                      'px-3 py-1.5 text-sm inline-flex items-center gap-2 rounded-md border transition-colors focus:outline-none cursor-pointer',
                      selected
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 shadow'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                    )
                  }
                >
                  <Box className='h-4 w-4' />
                  <span className='font-medium'>Boxed</span>
                  <span className='ml-1 text-[10px] px-1 rounded bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100'>
                    {stored.length}
                  </span>
                </Tab>
                <Tab
                  className={({ selected }) =>
                    clsx(
                      'px-3 py-1.5 text-sm inline-flex items-center gap-2 rounded-md border transition-colors focus:outline-none cursor-pointer',
                      selected
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 shadow'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                    )
                  }
                >
                  <Skull className='h-4 w-4' />
                  <span className='font-medium'>Graveyard</span>
                  <span className='ml-1 text-[10px] px-1 rounded bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100'>
                    {deceased.length}
                  </span>
                </Tab>
              </TabList>

              <TabPanels className='flex-1 min-h-0 flex flex-col'>
                <TabPanel className='flex-1 min-h-0 flex'>
                  {team.length === 0 ? (
                    <div
                      className='w-full flex-1 flex flex-col items-center justify-center text-gray-600 dark:text-gray-300 px-4 min-h-[60vh]'
                      role='status'
                      aria-live='polite'
                    >
                      <Users
                        className='h-10 w-10 opacity-50 mb-3'
                        aria-hidden='true'
                      />
                      <p className='text-center'>No active team members.</p>
                      <p className='text-center text-sm mt-1'>
                        Catch Pokémon or receive them as gifts to build your
                        team.
                      </p>
                    </div>
                  ) : (
                    <ul
                      role='list'
                      aria-label='Active team members list'
                      className='w-full space-y-3 py-2'
                    >
                      {(() => {
                        let pokemonCount = 0;
                        return team.map(entry => {
                          // For fusions, count as 1 Pokémon; for non-fusions, count head and body separately
                          const currentEncounter =
                            encounters?.[entry.locationId];
                          const isFusion =
                            currentEncounter?.isFusion &&
                            entry.head &&
                            entry.body;

                          const entryPokemonCount = isFusion
                            ? 1
                            : (entry.head ? 1 : 0) + (entry.body ? 1 : 0);

                          // Check if this entry or any previous entries exceed 6
                          pokemonCount += entryPokemonCount;
                          const isOverLimit = pokemonCount > 6;

                          return (
                            <TeamEntryItem
                              key={entry.locationId}
                              entry={entry}
                              idToName={idToName}
                              isOverLimit={isOverLimit}
                            />
                          );
                        });
                      })()}
                    </ul>
                  )}
                </TabPanel>
                <TabPanel className='flex-1 min-h-0 flex'>
                  {stored.length === 0 ? (
                    <div
                      className='w-full flex-1 flex flex-col items-center justify-center text-gray-600 dark:text-gray-300 px-4 min-h-[60vh]'
                      role='status'
                      aria-live='polite'
                    >
                      <Boxes
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
                      aria-label='Stored Pokémon list'
                      className='w-full grid grid-cols-1 sm:grid-cols-2 gap-2 py-2'
                    >
                      {stored.map(entry => (
                        <PCEntryItem
                          key={entry.locationId}
                          entry={entry}
                          idToName={idToName}
                          mode='stored'
                          hoverRingClass='hover:ring-blue-400/60'
                          fallbackLabel='Stored Pokémon'
                          className=''
                        />
                      ))}
                    </ul>
                  )}
                </TabPanel>
                <TabPanel className='flex-1 min-h-0 flex'>
                  {deceased.length === 0 ? (
                    <div
                      className='w-full flex-1 flex flex-col items-center justify-center text-gray-600 dark:text-gray-300 px-4 min-h-[60vh]'
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
                      aria-label='Fainted Pokémon list'
                      className='w-full grid grid-cols-1 sm:grid-cols-2 gap-2 py-2'
                    >
                      {deceased.map(entry => (
                        <PCEntryItem
                          key={entry.locationId}
                          entry={entry}
                          idToName={idToName}
                          mode='graveyard'
                          hoverRingClass='hover:ring-red-400/60'
                          fallbackLabel='Fainted Pokémon'
                          className=''
                        />
                      ))}
                    </ul>
                  )}
                </TabPanel>
              </TabPanels>
            </TabGroup>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
