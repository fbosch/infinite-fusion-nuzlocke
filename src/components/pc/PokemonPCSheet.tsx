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
import { Skull, X, Boxes, Box } from 'lucide-react';
import { useEncounters, useCustomLocations } from '@/stores/playthroughs';
import { PokemonStatus, type PokemonOptionType } from '@/loaders/pokemon';
import {
  getLocationById,
  getLocationsSortedWithCustom,
} from '@/loaders/locations';
import { FusionSprite } from '@/components/PokemonSummaryCard/FusionSprite';
import { usePreferredVariant } from '@/hooks/usePreferredVariant';

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

interface PCEntryItemProps {
  entry: Entry;
  idToName: Map<string, string>;
  mode: 'stored' | 'graveyard';
  hoverRingClass: string; // e.g., 'hover:ring-blue-400/60'
  fallbackLabel: string; // e.g., 'Stored Pokémon'
  className?: string; // extra classes like size-35 for specific lists
  onClose: () => void;
}

function PCEntryItem({
  entry,
  idToName,
  mode,
  hoverRingClass,
  fallbackLabel,
  className,
  onClose,
}: PCEntryItemProps) {
  const encounters = useEncounters();
  const currentEncounter = encounters?.[entry.locationId];
  const isFusion = currentEncounter?.isFusion || false;

  // Get preferred variant from cache, with encounter variant as fallback
  const artworkVariant = usePreferredVariant(
    entry.head,
    entry.body,
    isFusion,
    currentEncounter?.artworkVariant
  );

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

  const handleClick = () => {
    // Close the sheet
    onClose();

    // Scroll to the Pokemon location after a short delay to ensure the sheet is closed
    setTimeout(() => {
      const element = document.querySelector(
        `[data-location-id="${entry.locationId}"]`
      );
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });

        // Determine which combobox(es) to highlight based on the active Pokemon and fusion state
        const comboboxIds: string[] = [];
        if (isFusion) {
          // Fusion encounter - use head/body comboboxes
          if (headActive && bodyActive) {
            // Both head and body are active - highlight both comboboxes
            comboboxIds.push(
              `${entry.locationId}-head`,
              `${entry.locationId}-body`
            );
          } else if (headActive) {
            comboboxIds.push(`${entry.locationId}-head`);
          } else if (bodyActive) {
            comboboxIds.push(`${entry.locationId}-body`);
          }
        } else {
          // Single encounter - always use single combobox
          comboboxIds.push(`${entry.locationId}-single`);
        }

        // Highlight all relevant comboboxes
        comboboxIds.forEach(comboboxId => {
          const overlay = document.querySelector(
            `.location-highlight-overlay[data-combobox-id="${comboboxId}"]`
          );
          if (overlay) {
            // Show the highlight overlay
            overlay.classList.add('opacity-100');
            overlay.classList.remove('opacity-0');

            // Remove highlight after 2 seconds
            setTimeout(() => {
              overlay.classList.add('opacity-0');
              overlay.classList.remove('opacity-100');
            }, 2000);
          }
        });
      }
    }, 100);
  };

  return (
    <li
      key={entry.locationId}
      role='listitem'
      className={clsx(
        'relative rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:ring-2 transition-all duration-200 cursor-pointer',
        hoverRingClass,
        className
      )}
      onClick={handleClick}
    >
      <div className='flex items-center gap-3 p-3'>
        <div className='flex-shrink-0 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-md'>
          {hasAny && (
            <FusionSprite
              headPokemon={entry.head ?? null}
              bodyPokemon={entry.body ?? null}
              artworkVariant={artworkVariant}
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
          head: headDead ? (data?.head ?? null) : null,
          body: bodyDead ? (data?.body ?? null) : null,
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
          head: headStored ? (data?.head ?? null) : null,
          body: bodyStored ? (data?.body ?? null) : null,
        });
      }
    });

    return entries;
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
            <TabGroup
              selectedIndex={selectedIndex}
              onChange={index => onChangeTab(index === 0 ? 'box' : 'graveyard')}
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
                  <Boxes className='h-4 w-4' />
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
                  {stored.length === 0 ? (
                    <div
                      className='w-full flex-1 flex flex-col items-center justify-center text-gray-600 dark:text-gray-300 px-4 min-h-[60vh]'
                      role='status'
                      aria-live='polite'
                    >
                      <Box
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
                          onClose={onClose}
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
                          onClose={onClose}
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
