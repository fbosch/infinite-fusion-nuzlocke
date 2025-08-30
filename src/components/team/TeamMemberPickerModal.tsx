'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogBackdrop,
} from '@headlessui/react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { useActivePlaythrough } from '@/stores/playthroughs';
import { useEncounters } from '@/stores/playthroughs/hooks';
import { type PokemonOptionType, PokemonStatus } from '@/loaders/pokemon';
import { TeamMemberSelectionPanel } from './TeamMemberSelectionPanel';
import { TeamMemberPreviewPanel } from './TeamMemberPreviewPanel';
import {
  findPokemonWithLocation,
  getAllPokemonWithLocations,
} from '@/utils/encounter-utils';

interface TeamMemberPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (
    headPokemon: PokemonOptionType | null,
    bodyPokemon: PokemonOptionType | null
  ) => void;
  position: number;
  existingTeamMember?: {
    position: number;
    isEmpty: boolean;
    location?: string;
    headPokemon?: PokemonOptionType | null;
    bodyPokemon?: PokemonOptionType | null;
    isFusion?: boolean;
  } | null;
}

export default function TeamMemberPickerModal({
  isOpen,
  onClose,
  onSelect,
  position,
  existingTeamMember,
}: TeamMemberPickerModalProps) {
  const activePlaythrough = useActivePlaythrough();
  const encounters = useEncounters();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHead, setSelectedHead] = useState<{
    pokemon: PokemonOptionType;
    locationId: string;
  } | null>(null);
  const [selectedBody, setSelectedBody] = useState<{
    pokemon: PokemonOptionType;
    locationId: string;
  } | null>(null);
  const [activeSlot, setActiveSlot] = useState<'head' | 'body' | null>('head');
  const [hasManuallySelectedSlot, setHasManuallySelectedSlot] = useState(false);
  const [nickname, setNickname] = useState('');
  const [previewNickname, setPreviewNickname] = useState('');

  // Auto-switch to head selection mode when both slots are empty, but only if no manual selection was made
  useEffect(() => {
    if (
      !selectedHead &&
      !selectedBody &&
      !activeSlot &&
      !hasManuallySelectedSlot
    ) {
      setActiveSlot('head');
    }
  }, [selectedHead, selectedBody, hasManuallySelectedSlot, activeSlot]); // Respect manual slot selection

  // Pre-populate selections when editing existing team member
  useEffect(() => {
    if (existingTeamMember && !existingTeamMember.isEmpty && encounters) {
      // Find the existing Pokémon directly from encounters by UID
      let headPokemon: PokemonOptionType | null = null;
      let bodyPokemon: PokemonOptionType | null = null;
      let headLocationId: string | null = null;
      let bodyLocationId: string | null = null;

      // Find existing Pokémon using utility function
      if (existingTeamMember.headPokemon?.uid) {
        const found = findPokemonWithLocation(
          encounters,
          existingTeamMember.headPokemon.uid
        );
        if (found) {
          headPokemon = found.pokemon;
          headLocationId = found.locationId;
        }
      }

      if (existingTeamMember.bodyPokemon?.uid) {
        const found = findPokemonWithLocation(
          encounters,
          existingTeamMember.bodyPokemon.uid
        );
        if (found) {
          bodyPokemon = found.pokemon;
          bodyLocationId = found.locationId;
        }
      }

      if (headPokemon && headLocationId) {
        setSelectedHead({
          pokemon: headPokemon,
          locationId: headLocationId,
        });
        // Set nickname from head Pokémon or clear if no body Pokémon
        if (headPokemon.nickname) {
          setNickname(headPokemon.nickname);
          setPreviewNickname(headPokemon.nickname);
        } else if (!bodyPokemon) {
          setNickname('');
          setPreviewNickname('');
        }
      }

      if (bodyPokemon && bodyLocationId) {
        setSelectedBody({
          pokemon: bodyPokemon,
          locationId: bodyLocationId,
        });

        // Set the nickname from the body Pokémon
        if (bodyPokemon.nickname) {
          setNickname(bodyPokemon.nickname);
          setPreviewNickname(bodyPokemon.nickname);
        } else if (!headPokemon) {
          // Only clear nickname if there's no head Pokémon
          setNickname('');
          setPreviewNickname('');
        }
      }

      // Set active slot based on existing Pokémon (only if no manual selection)
      if (!hasManuallySelectedSlot) {
        const hasHead = !!existingTeamMember.headPokemon;
        const hasBody = !!existingTeamMember.bodyPokemon;

        if (hasHead && hasBody) {
          setActiveSlot(null);
        } else if (hasHead) {
          setActiveSlot('body');
        } else if (hasBody) {
          setActiveSlot('body');
        }
      }
    }
  }, [existingTeamMember, encounters, hasManuallySelectedSlot]);

  // Get all available Pokémon from encounters, filtering out those already in use by other team members
  const availablePokemon = useMemo(() => {
    if (!encounters || !activePlaythrough?.team) return [];

    // Get all Pokémon UIDs that are currently in use by other team members
    const usedPokemonUids = new Set<string>();
    activePlaythrough.team.members.forEach((member, index) => {
      // Skip the current position being edited
      if (index === position) return;

      if (member) {
        // Add both head and body Pokémon UIDs to the used set
        if (member.headPokemonUid) usedPokemonUids.add(member.headPokemonUid);
        if (member.bodyPokemonUid) usedPokemonUids.add(member.bodyPokemonUid);
      }
    });

    // If we're editing an existing team member, allow the current Pokémon to be selected again
    if (existingTeamMember && !existingTeamMember.isEmpty) {
      if (existingTeamMember.headPokemon?.uid) {
        usedPokemonUids.delete(existingTeamMember.headPokemon.uid);
      }
      if (existingTeamMember.bodyPokemon?.uid) {
        usedPokemonUids.delete(existingTeamMember.bodyPokemon.uid);
      }
    }

    // Get all Pokémon and filter by status and availability
    const allPokemon = getAllPokemonWithLocations(encounters);
    const pokemon = allPokemon.filter(
      ({ pokemon }) =>
        pokemon.status &&
        pokemon.status !== PokemonStatus.MISSED &&
        pokemon.status !== PokemonStatus.DECEASED &&
        pokemon.uid &&
        !usedPokemonUids.has(pokemon.uid)
    );

    if (!searchQuery.trim()) return pokemon;

    const query = searchQuery.toLowerCase();
    return pokemon.filter(
      p =>
        p.pokemon.name.toLowerCase().includes(query) ||
        p.pokemon.nickname?.toLowerCase().includes(query)
    );
  }, [
    encounters,
    searchQuery,
    activePlaythrough?.team,
    position,
    existingTeamMember,
  ]);

  const handleSlotSelect = (slot: 'head' | 'body') => {
    setActiveSlot(slot);
    setHasManuallySelectedSlot(true);
  };

  const handlePokemonSelect = (
    pokemon: PokemonOptionType,
    locationId: string
  ) => {
    const isSelectedHead = selectedHead?.pokemon?.uid === pokemon.uid;
    const isSelectedBody = selectedBody?.pokemon?.uid === pokemon.uid;

    // Handle unselecting
    if (isSelectedHead) {
      setSelectedHead(null);
      // If we're removing the head Pokémon, set active slot to head so user can select a new one
      setActiveSlot('head');
      // Clear nickname when head Pokémon is removed
      setNickname('');
      setPreviewNickname('');
      return;
    }
    if (isSelectedBody) {
      setSelectedBody(null);
      // If we're removing the body Pokémon, set active slot to body so user can select a new one
      setActiveSlot('body');
      // Clear nickname when body Pokémon is removed
      setNickname('');
      setPreviewNickname('');
      return;
    }

    // Handle selecting
    const slot = activeSlot;

    if (slot === 'head') {
      setSelectedHead({ pokemon, locationId });
      setActiveSlot('body');
    } else if (slot === 'body') {
      setSelectedBody({ pokemon, locationId });
      setActiveSlot('body');
    }

    // Set nickname from the selected Pokémon
    if (pokemon.nickname) {
      setNickname(pokemon.nickname);
      setPreviewNickname(pokemon.nickname);
    } else {
      setNickname('');
      setPreviewNickname('');
    }
  };

  const handleUpdateTeamMember = async () => {
    const headPokemon = selectedHead?.pokemon;
    const bodyPokemon = selectedBody?.pokemon;

    // If both are empty, this functions the same as clearing
    if (!headPokemon && !bodyPokemon) {
      // Pass null for both to indicate clearing the team member
      onSelect(null, null);
      onClose();
      return;
    }

    // For single Pokémon selections (non-fused), we need to handle this properly
    // If only one Pokémon is selected, we should still allow the update
    // The parent component will handle whether it's a fusion or single Pokémon
    if (headPokemon && !bodyPokemon) {
      // Single Pokémon selected as head - this is valid for non-fused Pokémon
      onSelect(headPokemon, null);
      onClose();
      return;
    }

    if (!headPokemon && bodyPokemon) {
      // Single Pokémon selected as body - this is valid for non-fused Pokémon
      onSelect(null, bodyPokemon);
      onClose();
      return;
    }

    // Both Pokémon selected - this is a fusion
    if (headPokemon && bodyPokemon) {
      onSelect(headPokemon, bodyPokemon);
      onClose();
      return;
    }

    // Fallback - shouldn't reach here but just in case
    onSelect(null, null);
    onClose();
  };

  const handleClearTeamMember = () => {
    // Clear the team member by passing null for both
    onSelect(null, null);
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedHead(null);
    setSelectedBody(null);
    setActiveSlot('head');
    setHasManuallySelectedSlot(false);
    setNickname('');
    setPreviewNickname('');
    onClose();
  };

  const canUpdateTeam: boolean =
    !!(selectedHead || selectedBody) || (!selectedHead && !selectedBody);

  const hasSelection = !!(selectedHead || selectedBody);

  if (!activePlaythrough) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} className='relative z-50 group'>
      <DialogBackdrop
        transition
        className='fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[2px] data-closed:opacity-0 data-enter:opacity-100'
        aria-hidden='true'
      />

      <div className='fixed inset-0 flex w-screen items-center justify-center p-2 sm:p-4'>
        <DialogPanel
          transition
          className={clsx(
            'w-full max-w-6xl max-h-[90vh] sm:max-h-[80vh] space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8 flex flex-col',
            'transition duration-150 ease-out data-closed:opacity-0 data-closed:scale-98'
          )}
        >
          <div className='flex items-center justify-between'>
            <DialogTitle className='text-2xl font-semibold text-gray-900 dark:text-white'>
              Select Pokémon for Team Slot {position + 1}
            </DialogTitle>
            <button
              onClick={handleClose}
              className={clsx(
                'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2',
                'p-1 rounded-md transition-colors cursor-pointer'
              )}
              aria-label='Close modal'
            >
              <X className='h-5 w-5' />
            </button>
          </div>

          <div className='flex flex-col lg:flex-row gap-6 flex-1 min-h-0'>
            <TeamMemberSelectionPanel
              selectedHead={selectedHead}
              selectedBody={selectedBody}
              activeSlot={activeSlot}
              searchQuery={searchQuery}
              availablePokemon={availablePokemon}
              onSlotSelect={handleSlotSelect}
              onRemoveHeadPokemon={() => setSelectedHead(null)}
              onRemoveBodyPokemon={() => setSelectedBody(null)}
              onSearchChange={setSearchQuery}
              onPokemonSelect={handlePokemonSelect}
            />

            <div className='hidden lg:block w-px bg-gray-200 dark:bg-gray-600'></div>

            <TeamMemberPreviewPanel
              selectedHead={selectedHead}
              selectedBody={selectedBody}
              nickname={nickname}
              previewNickname={previewNickname}
              canUpdateTeam={canUpdateTeam}
              hasSelection={hasSelection}
              onNicknameChange={setNickname}
              onNicknameBlur={() => setPreviewNickname(nickname)}
              onUpdate={handleUpdateTeamMember}
              onClear={handleClearTeamMember}
            />
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
