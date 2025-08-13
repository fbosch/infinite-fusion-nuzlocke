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
import {
  useEncounters,
  useCustomLocations,
  playthroughActions,
} from '@/stores/playthroughs';
import { type PokemonOptionType } from '@/loaders/pokemon';
import {
  isPokemonActive,
  isPokemonDeceased,
  isPokemonStored,
  canFuse,
} from '@/utils/pokemonPredicates';
import {
  getLocationById,
  getLocationsSortedWithCustom,
} from '@/loaders/locations';
import { FusionSprite } from '@/components/PokemonSummaryCard/FusionSprite';
import { CursorTooltip } from '@/components/CursorTooltip';
import { PokemonContextMenu } from '@/components/PokemonSummaryCard/PokemonContextMenu';
import { getNicknameText } from '@/components/PokemonSummaryCard/utils';
import PokeballIcon from '@/assets/images/pokeball.svg';
import HeadIcon from '@/assets/images/head.svg';
import BodyIcon from '@/assets/images/body.svg';
import { scrollToLocationById } from '@/utils/scrollToLocation';
import { TypePills } from '@/components/TypePills';
import { useFusionTypes } from '@/hooks/useFusionTypes';

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
  onClose?: () => void;
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
  const isStoredMode = mode === 'stored';
  const headActive = isStoredMode
    ? isPokemonStored(entry.head)
    : isPokemonDeceased(entry.head);
  const bodyActive = isStoredMode
    ? isPokemonStored(entry.body)
    : isPokemonDeceased(entry.body);
  const hasAny = Boolean(headActive || bodyActive);
  const label = [
    headActive ? getPokemonLabel(entry.head) : '',
    bodyActive ? getPokemonLabel(entry.body) : '',
  ]
    .filter(Boolean)
    .join(' / ');

  // Typings for entry (single or fusion)
  const fusionTypes = useFusionTypes(
    entry.head ? { id: entry.head.id } : undefined,
    entry.body ? { id: entry.body.id } : undefined
  );

  const handleClick = () => {
    const highlightUids: string[] = [];
    if (entry.head?.uid) highlightUids.push(entry.head.uid);
    if (entry.body?.uid) highlightUids.push(entry.body.uid);

    scrollToLocationById(entry.locationId, {
      behavior: 'smooth',
      highlightUids,
      durationMs: 1200,
    });

    onClose?.();
  };

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
          'group/pc-entry relative cursor-pointer rounded-lg border border-gray-200 bg-white transition-all duration-200 hover:ring-1 dark:border-gray-700 dark:bg-gray-800',
          hoverRingClass,
          className
        )}
        onClick={handleClick}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        tabIndex={0}
        aria-label={`Scroll to ${idToName.get(entry.locationId) || 'location'} in table`}
      >
        {fusionTypes.primary && (
          <div className='absolute right-2 top-2'>
            <TypePills
              primary={fusionTypes.primary}
              secondary={fusionTypes.secondary}
              showTooltip
              size='xs'
            />
          </div>
        )}
        <div className='flex items-center gap-3 p-3'>
          <div className='flex flex-shrink-0 items-center justify-center rounded-md bg-gray-50 dark:bg-gray-700'>
            {hasAny && (
              <FusionSprite
                headPokemon={entry.head ?? null}
                bodyPokemon={entry.body ?? null}
                isFusion={Boolean(
                  currentEncounter?.isFusion && canFuse(entry.head, entry.body)
                )}
                shouldLoad
                showStatusOverlay={false}
                showTooltip={false}
              />
            )}
          </div>
          <div className='min-w-0 flex-1'>
            <div className='truncate text-sm font-medium text-gray-900 dark:text-gray-100'>
              {label || fallbackLabel}
            </div>
            <div className='truncate text-xs text-gray-500 dark:text-gray-400'>
              {idToName.get(entry.locationId) || 'Unknown Location'}
            </div>
          </div>
        </div>
        {mode === 'stored' && (
          <div className='absolute bottom-2 right-2 transition-opacity md:opacity-0 md:group-hover/pc-entry:opacity-100 md:pointer-events-none md:group-hover/pc-entry:pointer-events-auto'>
            <CursorTooltip content='Move to Team' placement='top-end'>
              <button
                type='button'
                className='inline-flex size-7 items-center justify-center rounded-md border border-transparent bg-transparent text-gray-400 transition-colors hover:border-gray-200/70 hover:bg-gray-100/50 hover:text-gray-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-500 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/40 dark:hover:border-gray-600/60 cursor-pointer'
                aria-label='Move to Team'
                onClick={async e => {
                  e.stopPropagation();
                  await playthroughActions.markEncounterAsCaptured(
                    entry.locationId
                  );
                }}
              >
                <PokeballIcon className='h-4 w-4' />
              </button>
            </CursorTooltip>
          </div>
        )}
      </li>
    </PokemonContextMenu>
  );
}

interface TeamEntryItemProps {
  entry: Entry;
  idToName: Map<string, string>;
  isOverLimit: boolean;
  onClose?: () => void;
}

function TeamEntryItem({
  entry,
  idToName,
  isOverLimit,
  onClose,
}: TeamEntryItemProps) {
  const encounters = useEncounters();
  const currentEncounter = encounters?.[entry.locationId];
  const headActive = isPokemonActive(entry.head);
  const bodyActive = isPokemonActive(entry.body);
  const hasAny = Boolean(headActive || bodyActive);
  const isFusion = Boolean(
    currentEncounter?.isFusion && canFuse(entry.head, entry.body)
  );

  // Typings for entry (single or fusion) – must run before early returns
  const fusionTypes = useFusionTypes(
    entry.head ? { id: entry.head.id } : undefined,
    entry.body ? { id: entry.body.id } : undefined
  );

  if (!hasAny) return null;

  const handleClick = () => {
    const highlightUids: string[] = [];
    if (entry.head?.uid) highlightUids.push(entry.head.uid);
    if (entry.body?.uid) highlightUids.push(entry.body.uid);

    scrollToLocationById(entry.locationId, {
      behavior: 'smooth',
      highlightUids,
      durationMs: 1200,
    });

    onClose?.();
  };

  const card = (
    <li
      key={entry.locationId}
      role='listitem'
      className={clsx(
        'group/pc-entry relative cursor-pointer rounded-lg border transition-all duration-200',
        {
          'border-red-500 bg-red-50 dark:bg-red-900/20 hover:ring-1 hover:ring-red-400/30':
            isOverLimit,
          'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:ring-1 hover:ring-blue-400/30':
            !isOverLimit,
        }
      )}
      onClick={handleClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      tabIndex={0}
      aria-label={`Scroll to ${idToName.get(entry.locationId) || 'location'} in table`}
    >
      <div className='p-4'>
        <div className='flex items-start gap-4'>
          <div
            className={clsx(
              'flex flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 p-2 dark:bg-gray-700',
              {
                'bg-red-50 dark:bg-red-900/20': isOverLimit,
              }
            )}
          >
            <FusionSprite
              headPokemon={entry.head ?? null}
              bodyPokemon={entry.body ?? null}
              shouldLoad
              className='top-1.5'
              showStatusOverlay={false}
              showTooltip={false}
            />
          </div>
          <div className='min-w-0 flex-1 space-y-2'>
            <div className='flex items-center gap-2'>
              <h3 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                {getNicknameText(entry.head, entry.body, isFusion)}
              </h3>
            </div>

            {isFusion && (
              <div className='align-center flex gap-x-3'>
                {headActive && (
                  <div className='flex items-center gap-1 text-sm'>
                    <HeadIcon className='h-4 w-4' />
                    <span className='text-gray-700 dark:text-gray-300'>
                      {entry.head?.name || 'Unknown'}
                    </span>
                  </div>
                )}
                {bodyActive && (
                  <div className='flex items-center gap-1 text-sm'>
                    <BodyIcon className='h-4 w-4' />
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
          {fusionTypes.primary && (
            <div className='ml-auto'>
              <TypePills
                primary={fusionTypes.primary}
                secondary={fusionTypes.secondary}
                showTooltip
              />
            </div>
          )}
        </div>
      </div>
      <div className='absolute bottom-2 right-2 flex gap-1.5 transition-opacity md:opacity-0 md:group-hover/pc-entry:opacity-100 md:pointer-events-none md:group-hover/pc-entry:pointer-events-auto'>
        <CursorTooltip content='Move to Box' placement='top-end'>
          <button
            type='button'
            className='inline-flex size-7 items-center justify-center rounded-md border border-transparent bg-transparent text-gray-400 transition-colors hover:border-gray-200/70 hover:bg-gray-100/50 hover:text-gray-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-500 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/40 dark:hover:border-gray-600/60 cursor-pointer'
            aria-label='Move to Box'
            onClick={async e => {
              e.stopPropagation();
              await playthroughActions.moveEncounterToBox(entry.locationId);
            }}
          >
            <Box className='h-4 w-4' />
          </button>
        </CursorTooltip>
        <CursorTooltip content='Move to Graveyard' placement='top-end'>
          <button
            type='button'
            className='inline-flex size-7 items-center justify-center rounded-md border border-transparent bg-transparent text-gray-400 transition-colors hover:border-gray-200/70 hover:bg-gray-100/50 hover:text-gray-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-500 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/40 dark:hover:border-gray-600/60 cursor-pointer'
            aria-label='Move to Graveyard'
            onClick={async e => {
              e.stopPropagation();
              await playthroughActions.markEncounterAsDeceased(
                entry.locationId
              );
            }}
          >
            <Skull className='h-4 w-4' />
          </button>
        </CursorTooltip>
      </div>
    </li>
  );

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
      {card}
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
      const headActive = isPokemonActive(data?.head);
      const bodyActive = isPokemonActive(data?.body);

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
      const headDead = isPokemonDeceased(data?.head);
      const bodyDead = isPokemonDeceased(data?.body);

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
      const headStored = isPokemonStored(data?.head);
      const bodyStored = isPokemonStored(data?.body);

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
    <Dialog open={isOpen} onClose={onClose} className='group relative z-50'>
      <DialogBackdrop
        transition
        className='fixed inset-0 bg-black/30 backdrop-blur-[2px] duration-100 ease-out data-closed:opacity-0 data-enter:opacity-100 dark:bg-black/50'
        aria-hidden='true'
      />

      <div className='fixed inset-y-0 right-0 flex w-screen items-stretch justify-end p-0'>
        <DialogPanel
          transition
          id='pokemon-pc-sheet'
          aria-labelledby='pokemon-pc-title'
          className={clsx(
            'h-full w-full max-w-lg border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800',
            'will-change-opacity transform-gpu will-change-transform',
            'transition duration-100 ease-out',
            'data-closed:translate-x-full data-closed:opacity-0 data-leave:translate-x-full',
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
                  'rounded-md p-1 transition-colors'
                )}
                aria-label='Close drawer'
              >
                <X className='h-5 w-5' />
              </button>
            </div>
          </div>

          {/* Content area: fills remaining height to allow true vertical centering */}
          <div className='flex min-h-0 flex-1 flex-col px-4 pt-2 pb-3'>
            <TabGroup
              selectedIndex={selectedIndex}
              onChange={index => onChangeTab(getTabFromIndex(index))}
            >
              <TabList className='mb-4 flex items-center gap-2'>
                <Tab
                  className={({ selected }) =>
                    clsx(
                      'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors focus:outline-none',
                      selected
                        ? 'border-gray-300 bg-white text-gray-900 shadow dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
                        : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    )
                  }
                >
                  <PokeballIcon className='h-4 w-4' />
                  <span className='font-medium'>Team</span>
                  <span className='ml-1 rounded bg-gray-200 px-1 text-[10px] text-gray-800 dark:bg-gray-600 dark:text-gray-100'>
                    {team.length}
                  </span>
                </Tab>
                <Tab
                  className={({ selected }) =>
                    clsx(
                      'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors focus:outline-none',
                      selected
                        ? 'border-gray-300 bg-white text-gray-900 shadow dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
                        : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    )
                  }
                >
                  <Box className='h-4 w-4' />
                  <span className='font-medium'>Boxed</span>
                  <span className='ml-1 rounded bg-gray-200 px-1 text-[10px] text-gray-800 dark:bg-gray-600 dark:text-gray-100'>
                    {stored.length}
                  </span>
                </Tab>
                <Tab
                  className={({ selected }) =>
                    clsx(
                      'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors focus:outline-none',
                      selected
                        ? 'border-gray-300 bg-white text-gray-900 shadow dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
                        : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    )
                  }
                >
                  <Skull className='h-4 w-4' />
                  <span className='font-medium'>Graveyard</span>
                  <span className='ml-1 rounded bg-gray-200 px-1 text-[10px] text-gray-800 dark:bg-gray-600 dark:text-gray-100'>
                    {deceased.length}
                  </span>
                </Tab>
              </TabList>

              <TabPanels className='flex min-h-0 flex-1 flex-col'>
                <TabPanel className='flex min-h-0 flex-1'>
                  {team.length === 0 ? (
                    <div
                      className='flex min-h-[60vh] w-full flex-1 flex-col items-center justify-center px-4 text-gray-600 dark:text-gray-300'
                      role='status'
                      aria-live='polite'
                    >
                      <Users
                        className='mb-3 h-10 w-10 opacity-50'
                        aria-hidden='true'
                      />
                      <p className='text-center'>No active team members.</p>
                      <p className='mt-1 text-center text-sm'>
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
                        let insertedLimitNotice = false;
                        return team.flatMap(entry => {
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

                          const nodes: React.ReactNode[] = [];
                          if (isOverLimit && !insertedLimitNotice) {
                            insertedLimitNotice = true;
                            nodes.push(
                              <li key='team-limit-divider' className='py-1'>
                                <div className='flex items-center gap-2 mb-1'>
                                  <div className='h-px flex-1 bg-gray-200 dark:bg-gray-700' />
                                  <span className='text-xs font-medium text-red-600 dark:text-red-400'>
                                    Team limit exceeded
                                  </span>
                                  <div className='h-px flex-1 bg-gray-200 dark:bg-gray-700' />
                                </div>
                              </li>
                            );
                          }

                          nodes.push(
                            <TeamEntryItem
                              key={entry.locationId}
                              entry={entry}
                              idToName={idToName}
                              isOverLimit={isOverLimit}
                              onClose={onClose}
                            />
                          );

                          return nodes;
                        });
                      })()}
                    </ul>
                  )}
                </TabPanel>
                <TabPanel className='flex min-h-0 flex-1'>
                  {stored.length === 0 ? (
                    <div
                      className='flex min-h-[60vh] w-full flex-1 flex-col items-center justify-center px-4 text-gray-600 dark:text-gray-300'
                      role='status'
                      aria-live='polite'
                    >
                      <Boxes
                        className='mb-3 h-10 w-10 opacity-50'
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
                      className='grid w-full grid-cols-1 gap-2 py-2 sm:grid-cols-2'
                    >
                      {stored.map(entry => (
                        <PCEntryItem
                          key={entry.locationId}
                          entry={entry}
                          idToName={idToName}
                          mode='stored'
                          hoverRingClass='hover:ring-blue-400/30'
                          fallbackLabel='Stored Pokémon'
                          className=''
                          onClose={onClose}
                        />
                      ))}
                    </ul>
                  )}
                </TabPanel>
                <TabPanel className='flex min-h-0 flex-1'>
                  {deceased.length === 0 ? (
                    <div
                      className='flex min-h-[60vh] w-full flex-1 flex-col items-center justify-center px-4 text-gray-600 dark:text-gray-300'
                      role='status'
                      aria-live='polite'
                    >
                      <Skull
                        className='mb-3 h-10 w-10 opacity-50'
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
                      className='grid w-full grid-cols-1 gap-2 py-2 sm:grid-cols-2'
                    >
                      {deceased.map(entry => (
                        <PCEntryItem
                          key={entry.locationId}
                          entry={entry}
                          idToName={idToName}
                          mode='graveyard'
                          hoverRingClass='hover:ring-red-400/30'
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
