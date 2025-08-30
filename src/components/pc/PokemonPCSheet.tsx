'use client';

import React, { useMemo, useState } from 'react';
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
  useActivePlaythrough,
} from '@/stores/playthroughs';
import { isPokemonDeceased, isPokemonStored } from '@/utils/pokemonPredicates';
import { scrollToLocationById } from '@/utils/scrollToLocation';
import {
  getLocationById,
  getLocationsSortedWithCustom,
} from '@/loaders/locations';
import { findPokemonByUid } from '@/utils/encounter-utils';
import { playthroughActions } from '@/stores/playthroughs';

import PCEntryItem from './PCEntryItem';
import type { PokemonOptionType } from '@/loaders/pokemon';
import TeamEntryItem from './TeamEntryItem';
import { GraveyardGridItem } from './GraveyardGridItem';
import TeamMemberPickerModal from '../team/TeamMemberPickerModal';

export interface PokemonPCSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'team' | 'box' | 'graveyard';
  onChangeTab: (tab: 'team' | 'box' | 'graveyard') => void;
}

import type { PCEntry as Entry } from './types';

export default function PokemonPCSheet({
  isOpen,
  onClose,
  activeTab,
  onChangeTab,
}: PokemonPCSheetProps) {
  const activePlaythrough = useActivePlaythrough();
  const encounters = useEncounters();
  const customLocations = useCustomLocations();

  // State for team member picker modal
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const mergedLocations = useMemo(
    () => getLocationsSortedWithCustom(customLocations),
    [customLocations]
  );
  const idToName = useMemo(() => {
    const map = new Map<string, string>();
    for (const loc of mergedLocations) map.set(loc.id, loc.name);
    return map;
  }, [mergedLocations]);

  // Handlers for team member picker modal
  const handleTeamMemberClick = (
    position: number,
    _existingTeamMember: {
      position: number;
      isEmpty: boolean;
      headPokemon: PokemonOptionType | null;
      bodyPokemon: PokemonOptionType | null;
      isFusion: boolean;
    }
  ) => {
    setSelectedPosition(position);
    setPickerModalOpen(true);
  };

  const handleClosePickerModal = () => {
    setPickerModalOpen(false);
    setSelectedPosition(null);
  };

  const handlePokemonSelect = async (
    headPokemon: PokemonOptionType | null,
    bodyPokemon: PokemonOptionType | null
  ) => {
    if (selectedPosition === null) return;



    // Create team member references
    const headRef = headPokemon ? { uid: headPokemon.uid! } : null;
    const bodyRef = bodyPokemon ? { uid: bodyPokemon.uid! } : null;

    const success = await playthroughActions.updateTeamMember(
      selectedPosition,
      headRef,
      bodyRef
    );

    if (!success) {
      console.error(
        'Failed to update team member at position:',
        selectedPosition
      );
      return;
    }

    handleClosePickerModal();
  };

  const team: Entry[] = useMemo(() => {
    if (!activePlaythrough?.team) return [];

    return activePlaythrough.team.members.map((member, index) => {
      console.log(`Building team slot ${index}:`, member);

      if (!member) {
        console.log(`Slot ${index} is null member`);
        return {
          locationId: `team-slot-${index}`,
          locationName: `Team Slot ${index + 1}`,
          head: null,
          body: null,
          position: index,
        };
      }

      const headPokemon = member.headPokemonUid
        ? findPokemonByUid(encounters, member.headPokemonUid)
        : null;
      const bodyPokemon = member.bodyPokemonUid
        ? findPokemonByUid(encounters, member.bodyPokemonUid)
        : null;

      // A slot is empty only if both UIDs are empty strings
      if (!member.headPokemonUid && !member.bodyPokemonUid) {
        return {
          locationId: `team-slot-${index}`,
          locationName: `Team Slot ${index + 1}`,
          head: null,
          body: null,
          position: index,
        };
      }

      // Get location from the head Pokémon's original location, fallback to body if head doesn't exist
      const location = getLocationById(
        headPokemon?.originalLocation || bodyPokemon?.originalLocation || ''
      );

      // Determine fusion state: true if both Pokémon exist and can form a fusion
      const isFusion = Boolean(headPokemon && bodyPokemon);

      return {
        locationId: `team-slot-${index}`,
        locationName: location?.name || 'Unknown Location',
        head: headPokemon,
        body: bodyPokemon,
        position: index,
        isFusion,
      };
    });
  }, [activePlaythrough?.team, encounters, activePlaythrough?.updatedAt]);

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
  }, [encounters, idToName, activePlaythrough?.updatedAt]);

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
  }, [encounters, idToName, activePlaythrough?.updatedAt]);

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
        className='fixed inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 ease-out data-closed:opacity-0 data-enter:opacity-100 dark:bg-black/30'
        aria-hidden='true'
      />

      <div className='fixed inset-y-0 right-0 flex w-screen items-stretch justify-end p-0'>
        <DialogPanel
          transition
          id='pokemon-pc-sheet'
          aria-labelledby='pokemon-pc-title'
          className={clsx(
            'h-full w-full max-w-lg border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800',
            'transform-gpu will-change-transform',
            'transition-all duration-200 ease-out',
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
                  'rounded-md p-1 transition-colors cursor-pointer'
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
              <TabList className='mb-4 flex w-full items-center gap-2 flex-1'>
                <Tab
                  className={({ selected }) =>
                    clsx(
                      'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors focus:outline-none flex-1',
                      selected
                        ? 'border-gray-300 bg-white text-gray-900 shadow dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
                        : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    )
                  }
                >
                  <Users className='h-4 w-4' />
                  <span className='font-medium flex-1'>Team</span>
                  <span className='ml-1 rounded bg-gray-200 px-1 text-[10px] text-gray-800 dark:bg-gray-600 dark:text-gray-100'>
                    {team.filter(entry => entry.head || entry.body).length}/6
                  </span>
                </Tab>
                <Tab
                  className={({ selected }) =>
                    clsx(
                      'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors focus:outline-none flex-1',
                      selected
                        ? 'border-gray-300 bg-white text-gray-900 shadow dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
                        : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    )
                  }
                >
                  <Box className='h-4 w-4' />
                  <span className='font-medium flex-1'>Box</span>
                  <span className='ml-1 rounded bg-gray-200 px-1 text-[10px] text-gray-800 dark:bg-gray-600 dark:text-gray-100'>
                    {stored.length}
                  </span>
                </Tab>
                <Tab
                  className={({ selected }) =>
                    clsx(
                      'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors focus:outline-none flex-1',
                      selected
                        ? 'border-gray-300 bg-white text-gray-900 shadow dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
                        : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    )
                  }
                >
                  <Skull className='h-4 w-4' />
                  <span className='font-medium flex-1'>Graveyard</span>
                  <span className='ml-1 rounded bg-gray-200 px-1 text-[10px] text-gray-800 dark:bg-gray-600 dark:text-gray-100'>
                    {deceased.length}
                  </span>
                </Tab>
              </TabList>

              <TabPanels className='flex min-h-0 flex-1 flex-col'>
                <TabPanel className='flex min-h-0 flex-1'>
                  <ul
                    role='list'
                    aria-label='Team members list'
                    className='w-full space-y-3 py-2 max-h-[calc(100dvh-6.5rem)] overflow-y-auto'
                  >
                    {team.map(entry => (
                      <TeamEntryItem
                        key={entry.locationId}
                        entry={entry}
                        idToName={idToName}
                        onClose={onClose}
                        onTeamMemberClick={handleTeamMemberClick}
                      />
                    ))}
                  </ul>
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
                      <p className='text-center'>No Pokémon in your box.</p>
                    </div>
                  ) : (
                    <ul
                      role='list'
                      aria-label='Boxed Pokémon list'
                      className='grid content-start w-full grid-cols-1 gap-2 py-2 sm:grid-cols-2 h-[calc(100dvh-6.5rem)] overflow-y-auto'
                    >
                      {stored.map(entry => (
                        <PCEntryItem
                          key={entry.locationId}
                          entry={entry}
                          idToName={idToName}
                          mode='stored'
                          hoverRingClass='hover:ring-blue-400/30'
                          fallbackLabel='Boxed Pokémon'
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
                    <div className='w-full py-2 h-[calc(100dvh-6.5rem)] overflow-y-auto'>
                      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3'>
                        {deceased.map(entry => (
                          <GraveyardGridItem
                            key={entry.locationId}
                            entry={entry}
                            onLocationClick={locationId => {
                              // Scroll to location in the encounter table
                              const highlightUids: string[] = [];
                              if (entry.head?.uid)
                                highlightUids.push(entry.head.uid);
                              if (entry.body?.uid)
                                highlightUids.push(entry.body.uid);

                              scrollToLocationById(locationId, {
                                behavior: 'smooth',
                                highlightUids,
                                durationMs: 1200,
                              });

                              onClose();
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </TabPanel>
              </TabPanels>
            </TabGroup>
          </div>
        </DialogPanel>
      </div>

      {/* Team Member Picker Modal */}
      <TeamMemberPickerModal
        key={`team-member-picker-${selectedPosition}`}
        isOpen={pickerModalOpen}
        onClose={handleClosePickerModal}
        onSelect={handlePokemonSelect}
        position={selectedPosition || 0}
        existingTeamMember={
          selectedPosition !== null
            ? {
                position: selectedPosition,
                isEmpty: false,
                headPokemon: team[selectedPosition]?.head || null,
                bodyPokemon: team[selectedPosition]?.body || null,
                isFusion: team[selectedPosition]?.isFusion || false,
              }
            : null
        }
      />
    </Dialog>
  );
}
