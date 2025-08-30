'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { type PokemonOptionType } from '@/loaders/pokemon';
import { useActivePlaythrough } from '@/stores/playthroughs';
import { useEncounters } from '@/stores/playthroughs/hooks';
import { PokemonStatus } from '@/loaders/pokemon';
import {
  findPokemonWithLocation,
  getAllPokemonWithLocations,
} from '@/utils/encounter-utils';

interface TeamMemberSelectionState {
  // Pokemon selection state
  selectedHead: {
    pokemon: PokemonOptionType;
    locationId: string;
  } | null;
  selectedBody: {
    pokemon: PokemonOptionType;
    locationId: string;
  } | null;
  activeSlot: 'head' | 'body' | null;
  hasManuallySelectedSlot: boolean;

  // UI state
  searchQuery: string;
  nickname: string;
  previewNickname: string;

  // Computed values
  availablePokemon: Array<{
    pokemon: PokemonOptionType;
    locationId: string;
  }>;
  canUpdateTeam: boolean;
  hasSelection: boolean;
}

interface TeamMemberSelectionActions {
  // Pokemon selection actions
  setSelectedHead: (
    selection: { pokemon: PokemonOptionType; locationId: string } | null
  ) => void;
  setSelectedBody: (
    selection: { pokemon: PokemonOptionType; locationId: string } | null
  ) => void;
  setActiveSlot: (slot: 'head' | 'body' | null) => void;
  setHasManuallySelectedSlot: (value: boolean) => void;

  // UI actions
  setSearchQuery: (query: string) => void;
  setNickname: (nickname: string) => void;
  setPreviewNickname: (nickname: string) => void;

  // Business logic actions
  handleSlotSelect: (slot: 'head' | 'body') => void;
  handlePokemonSelect: (pokemon: PokemonOptionType, locationId: string) => void;
  handleRemoveHeadPokemon: () => void;
  handleRemoveBodyPokemon: () => void;
  resetState: () => void;

  // Team member actions
  handleUpdateTeamMember: () => void;
  handleClearTeamMember: () => void;
}

interface TeamMemberSelectionContextValue {
  state: TeamMemberSelectionState;
  actions: TeamMemberSelectionActions;
}

const TeamMemberSelectionContext =
  createContext<TeamMemberSelectionContextValue | null>(null);

interface TeamMemberSelectionProviderProps {
  children: React.ReactNode;
  position: number;
  existingTeamMember?: {
    position: number;
    isEmpty: boolean;
    location?: string;
    headPokemon?: PokemonOptionType | null;
    bodyPokemon?: PokemonOptionType | null;
    isFusion?: boolean;
  } | null;
  onSelect: (
    headPokemon: PokemonOptionType | null,
    bodyPokemon: PokemonOptionType | null
  ) => void;
}

export function TeamMemberSelectionProvider({
  children,
  position,
  existingTeamMember,
  onSelect,
}: TeamMemberSelectionProviderProps) {
  const activePlaythrough = useActivePlaythrough();
  const encounters = useEncounters();

  // Pokemon selection state
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

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
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
  }, [selectedHead, selectedBody, hasManuallySelectedSlot, activeSlot]);

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
  const availablePokemon = React.useMemo(() => {
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

  // Computed values
  const canUpdateTeam: boolean =
    !!(selectedHead || selectedBody) || (!selectedHead && !selectedBody);

  const hasSelection = !!(selectedHead || selectedBody);

  // Business logic actions
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

  const handleRemoveHeadPokemon = () => {
    setSelectedHead(null);
    setActiveSlot('head');
    setNickname('');
    setPreviewNickname('');
  };

  const handleRemoveBodyPokemon = () => {
    setSelectedBody(null);
    setActiveSlot('body');
    setNickname('');
    setPreviewNickname('');
  };

  const resetState = () => {
    setSearchQuery('');
    setSelectedHead(null);
    setSelectedBody(null);
    setActiveSlot('head');
    setHasManuallySelectedSlot(false);
    setNickname('');
    setPreviewNickname('');
  };

  const handleUpdateTeamMember = () => {
    const headPokemon = selectedHead?.pokemon;
    const bodyPokemon = selectedBody?.pokemon;

    // If both are empty, this functions the same as clearing
    if (!headPokemon && !bodyPokemon) {
      // Pass null for both to indicate clearing the team member
      onSelect(null, null);
      return;
    }

    // For single Pokémon selections (non-fused), we need to handle this properly
    // If only one Pokémon is selected, we should still allow the update
    // The parent component will handle whether it's a fusion or single Pokémon
    if (headPokemon && !bodyPokemon) {
      // Single Pokémon selected as head - this is valid for non-fused Pokémon
      onSelect(headPokemon, null);
      return;
    }

    if (!headPokemon && bodyPokemon) {
      // Single Pokémon selected as body - this is valid for non-fused Pokémon
      onSelect(null, bodyPokemon);
      return;
    }

    // Both Pokémon selected - this is a fusion
    if (headPokemon && bodyPokemon) {
      onSelect(headPokemon, bodyPokemon);
      return;
    }

    // Fallback - shouldn't reach here but just in case
    onSelect(null, null);
  };

  const handleClearTeamMember = () => {
    // Clear the team member by passing null for both
    onSelect(null, null);
  };

  const value: TeamMemberSelectionContextValue = {
    state: {
      selectedHead,
      selectedBody,
      activeSlot,
      hasManuallySelectedSlot,
      searchQuery,
      nickname,
      previewNickname,
      availablePokemon,
      canUpdateTeam,
      hasSelection,
    },
    actions: {
      setSelectedHead,
      setSelectedBody,
      setActiveSlot,
      setHasManuallySelectedSlot,
      setSearchQuery,
      setNickname,
      setPreviewNickname,
      handleSlotSelect,
      handlePokemonSelect,
      handleRemoveHeadPokemon,
      handleRemoveBodyPokemon,
      resetState,
      handleUpdateTeamMember,
      handleClearTeamMember,
    },
  };

  return (
    <TeamMemberSelectionContext.Provider value={value}>
      {children}
    </TeamMemberSelectionContext.Provider>
  );
}

export function useTeamMemberSelection() {
  const context = useContext(TeamMemberSelectionContext);
  if (!context) {
    throw new Error(
      'useTeamMemberSelection must be used within a TeamMemberSelectionProvider'
    );
  }
  return context;
}
