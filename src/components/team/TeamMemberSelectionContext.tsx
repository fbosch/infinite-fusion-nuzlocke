'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useMemo,
  useCallback,
} from 'react';
import { type PokemonOptionType } from '@/loaders/pokemon';
import { useActivePlaythrough } from '@/stores/playthroughs';
import { useEncounters } from '@/stores/playthroughs/hooks';
import { PokemonStatus } from '@/loaders/pokemon';
import {
  findPokemonWithLocation,
  getAllPokemonWithLocations,
} from '@/utils/encounter-utils';
import { playthroughActions } from '@/stores/playthroughs';

// Action types
type TeamMemberSelectionAction =
  | {
      type: 'SET_SELECTED_HEAD';
      payload: { pokemon: PokemonOptionType; locationId: string } | null;
    }
  | {
      type: 'SET_SELECTED_BODY';
      payload: { pokemon: PokemonOptionType; locationId: string } | null;
    }
  | { type: 'SET_ACTIVE_SLOT'; payload: 'head' | 'body' | null }
  | { type: 'SET_HAS_MANUALLY_SELECTED_SLOT'; payload: boolean }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_NICKNAME'; payload: string }
  | { type: 'SET_PREVIEW_NICKNAME'; payload: string }
  | {
      type: 'SET_AVAILABLE_POKEMON';
      payload: Array<{ pokemon: PokemonOptionType; locationId: string }>;
    }
  | { type: 'RESET_STATE' }
  | {
      type: 'INITIALIZE_FROM_EXISTING';
      payload: {
        headPokemon: PokemonOptionType | null;
        bodyPokemon: PokemonOptionType | null;
        headLocationId: string | null;
        bodyLocationId: string | null;
      };
    };

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

// Initial state
const initialState: TeamMemberSelectionState = {
  selectedHead: null,
  selectedBody: null,
  activeSlot: 'head',
  hasManuallySelectedSlot: false,
  searchQuery: '',
  nickname: '',
  previewNickname: '',
  availablePokemon: [],
  canUpdateTeam: true,
  hasSelection: false,
};

// Reducer function
function teamMemberSelectionReducer(
  state: TeamMemberSelectionState,
  action: TeamMemberSelectionAction
): TeamMemberSelectionState {
  switch (action.type) {
    case 'SET_SELECTED_HEAD':
      return { ...state, selectedHead: action.payload };
    case 'SET_SELECTED_BODY':
      return { ...state, selectedBody: action.payload };
    case 'SET_ACTIVE_SLOT':
      return { ...state, activeSlot: action.payload };
    case 'SET_HAS_MANUALLY_SELECTED_SLOT':
      return { ...state, hasManuallySelectedSlot: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_NICKNAME':
      return { ...state, nickname: action.payload };
    case 'SET_PREVIEW_NICKNAME':
      return { ...state, previewNickname: action.payload };
    case 'RESET_STATE':
      return { ...initialState, activeSlot: 'head' };
    case 'SET_AVAILABLE_POKEMON':
      return { ...state, availablePokemon: action.payload };
    case 'INITIALIZE_FROM_EXISTING':
      const { headPokemon, bodyPokemon, headLocationId, bodyLocationId } =
        action.payload;

      let updatedState = { ...state };

      if (headPokemon && headLocationId) {
        updatedState = {
          ...updatedState,
          selectedHead: { pokemon: headPokemon, locationId: headLocationId },
        };
        // Always prioritize head Pokémon's nickname
        if (headPokemon.nickname) {
          updatedState = {
            ...updatedState,
            nickname: headPokemon.nickname,
            previewNickname: headPokemon.nickname,
          };
        }
      }

      if (bodyPokemon && bodyLocationId) {
        updatedState = {
          ...updatedState,
          selectedBody: { pokemon: bodyPokemon, locationId: bodyLocationId },
        };
        // Only set body Pokémon's nickname if head Pokémon doesn't have one
        if (bodyPokemon.nickname && !headPokemon?.nickname) {
          updatedState = {
            ...updatedState,
            nickname: bodyPokemon.nickname,
            previewNickname: bodyPokemon.nickname,
          };
        }
      }

      return updatedState;
    default:
      return state;
  }
}

// Create separate contexts for state and dispatch to optimize re-renders
const TeamMemberSelectionStateContext =
  createContext<TeamMemberSelectionState | null>(null);
const TeamMemberSelectionDispatchContext =
  createContext<TeamMemberSelectionActions | null>(null);

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
  onClose: () => void;
}

export function TeamMemberSelectionProvider({
  children,
  position,
  existingTeamMember,
  onSelect,
  onClose,
}: TeamMemberSelectionProviderProps) {
  const activePlaythrough = useActivePlaythrough();
  const encounters = useEncounters();

  // Use reducer instead of multiple useState calls
  const [state, dispatch] = useReducer(
    teamMemberSelectionReducer,
    initialState
  );
  const {
    selectedHead,
    selectedBody,
    activeSlot,
    hasManuallySelectedSlot,
    searchQuery,
    nickname,
    previewNickname,
  } = state;

  // Auto-switch to head selection mode when both slots are empty, but only if no manual selection was made
  useEffect(() => {
    if (
      !selectedHead &&
      !selectedBody &&
      !activeSlot &&
      !hasManuallySelectedSlot
    ) {
      dispatch({ type: 'SET_ACTIVE_SLOT', payload: 'head' });
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

      // Use dispatch to initialize state
      dispatch({
        type: 'INITIALIZE_FROM_EXISTING',
        payload: { headPokemon, bodyPokemon, headLocationId, bodyLocationId },
      });

      // Set active slot based on existing Pokémon (only if no manual selection)
      if (!hasManuallySelectedSlot) {
        const hasHead = !!existingTeamMember.headPokemon;
        const hasBody = !!existingTeamMember.bodyPokemon;

        if (hasHead && hasBody) {
          dispatch({ type: 'SET_ACTIVE_SLOT', payload: null });
        } else if (hasHead) {
          dispatch({ type: 'SET_ACTIVE_SLOT', payload: 'body' });
        } else if (hasBody) {
          dispatch({ type: 'SET_ACTIVE_SLOT', payload: 'body' });
        }
      }
    }
  }, [existingTeamMember, encounters, hasManuallySelectedSlot]);

  // Get all available Pokémon from encounters, filtering out those already in use by other team members
  const allAvailablePokemon = useMemo(() => {
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
    return allPokemon.filter(
      ({ pokemon }) =>
        pokemon.status &&
        pokemon.status !== PokemonStatus.MISSED &&
        pokemon.status !== PokemonStatus.DECEASED &&
        pokemon.uid &&
        !usedPokemonUids.has(pokemon.uid)
    );
  }, [encounters, activePlaythrough?.team, position, existingTeamMember]);

  // Update availablePokemon in state when the base list changes (not when search changes)
  useEffect(() => {
    dispatch({ type: 'SET_AVAILABLE_POKEMON', payload: allAvailablePokemon });
  }, [allAvailablePokemon, dispatch]);

  // Computed values
  const canUpdateTeam: boolean =
    !!(selectedHead || selectedBody) || (!selectedHead && !selectedBody);

  const hasSelection = !!(selectedHead || selectedBody);

  // Business logic actions
  const handleSlotSelect = useCallback(
    (slot: 'head' | 'body') => {
      dispatch({ type: 'SET_ACTIVE_SLOT', payload: slot });
      dispatch({ type: 'SET_HAS_MANUALLY_SELECTED_SLOT', payload: true });
    },
    [dispatch]
  );

  const handlePokemonSelect = useCallback(
    (pokemon: PokemonOptionType, locationId: string) => {
      const isSelectedHead = selectedHead?.pokemon?.uid === pokemon.uid;
      const isSelectedBody = selectedBody?.pokemon?.uid === pokemon.uid;

      // Handle unselecting
      if (isSelectedHead) {
        dispatch({ type: 'SET_SELECTED_HEAD', payload: null });
        // If we're removing the head Pokémon, set active slot to head so user can select a new one
        dispatch({ type: 'SET_ACTIVE_SLOT', payload: 'head' });
        // Clear nickname when head Pokémon is removed
        dispatch({ type: 'SET_NICKNAME', payload: '' });
        dispatch({ type: 'SET_PREVIEW_NICKNAME', payload: '' });
        return;
      }
      if (isSelectedBody) {
        dispatch({ type: 'SET_SELECTED_BODY', payload: null });
        // If we're removing the body Pokémon, set active slot to body so user can select a new one
        dispatch({ type: 'SET_ACTIVE_SLOT', payload: 'body' });
        // Clear nickname when body Pokémon is removed
        dispatch({ type: 'SET_NICKNAME', payload: '' });
        dispatch({ type: 'SET_PREVIEW_NICKNAME', payload: '' });
        return;
      }

      // Handle selecting
      const slot = activeSlot;

      if (slot === 'head') {
        dispatch({
          type: 'SET_SELECTED_HEAD',
          payload: { pokemon, locationId },
        });
        // Automatically move to body slot only if it's empty
        if (!selectedBody) {
          dispatch({ type: 'SET_ACTIVE_SLOT', payload: 'body' });
        }
      } else if (slot === 'body') {
        dispatch({
          type: 'SET_SELECTED_BODY',
          payload: { pokemon, locationId },
        });
        // Keep the same slot active so user can continue selecting in the same slot if needed
        dispatch({ type: 'SET_ACTIVE_SLOT', payload: 'body' });
      }

      // Set nickname from the selected Pokémon
      if (pokemon.nickname) {
        dispatch({ type: 'SET_NICKNAME', payload: pokemon.nickname });
        dispatch({ type: 'SET_PREVIEW_NICKNAME', payload: pokemon.nickname });
      } else {
        dispatch({ type: 'SET_NICKNAME', payload: '' });
        dispatch({ type: 'SET_PREVIEW_NICKNAME', payload: '' });
      }
    },
    [dispatch, selectedHead, selectedBody, activeSlot]
  );

  const handleRemoveHeadPokemon = useCallback(() => {
    dispatch({ type: 'SET_SELECTED_HEAD', payload: null });
    // When removing head Pokémon, automatically switch to head slot for new selection
    dispatch({ type: 'SET_ACTIVE_SLOT', payload: 'head' });
    dispatch({ type: 'SET_NICKNAME', payload: '' });
    dispatch({ type: 'SET_PREVIEW_NICKNAME', payload: '' });
  }, [dispatch]);

  const handleRemoveBodyPokemon = useCallback(() => {
    dispatch({ type: 'SET_SELECTED_BODY', payload: null });
    // When removing body Pokémon, automatically switch to body slot for new selection
    dispatch({ type: 'SET_ACTIVE_SLOT', payload: 'body' });
    dispatch({ type: 'SET_NICKNAME', payload: '' });
    dispatch({ type: 'SET_PREVIEW_NICKNAME', payload: '' });
  }, [dispatch]);

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
  }, [dispatch]);

  const handleUpdateTeamMember = useCallback(async () => {
    const headPokemon = selectedHead?.pokemon;
    const bodyPokemon = selectedBody?.pokemon;

    // Update the nickname for the Pokémon that needs it
    if (nickname) {
      console.log('Updating nickname:', {
        nickname,
        headPokemon: headPokemon?.nickname,
        bodyPokemon: bodyPokemon?.nickname,
        headLocationId: selectedHead?.locationId,
        bodyLocationId: selectedBody?.locationId,
      });

      // Update the head Pokémon's nickname (regardless of where it is in the encounter table)
      if (headPokemon && headPokemon.uid && nickname !== headPokemon.nickname) {
        console.log('Updating head Pokémon nickname');
        await playthroughActions.updatePokemonByUID(headPokemon.uid, {
          nickname: nickname || undefined,
        });
      }

      // If only body Pokémon is selected (no head), update body instead
      if (
        !headPokemon &&
        bodyPokemon &&
        bodyPokemon.uid &&
        nickname !== bodyPokemon.nickname
      ) {
        console.log('Updating body Pokémon nickname');
        await playthroughActions.updatePokemonByUID(bodyPokemon.uid, {
          nickname: nickname || undefined,
        });
      }
    }

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
  }, [selectedHead, selectedBody, nickname, onSelect, onClose]);

  const handleClearTeamMember = useCallback(() => {
    // Clear the team member by passing null for both
    onSelect(null, null);
    onClose();
  }, [onSelect, onClose]);

  // Memoize the state value to prevent unnecessary re-renders
  const stateValue = useMemo(
    () => ({
      selectedHead,
      selectedBody,
      activeSlot,
      hasManuallySelectedSlot,
      searchQuery,
      nickname,
      previewNickname,
      availablePokemon: allAvailablePokemon,
      canUpdateTeam,
      hasSelection,
    }),
    [
      selectedHead,
      selectedBody,
      activeSlot,
      hasManuallySelectedSlot,
      searchQuery,
      nickname,
      previewNickname,
      allAvailablePokemon,
      canUpdateTeam,
      hasSelection,
    ]
  );

  // Create memoized action functions to prevent recreation on every render
  const setSelectedHead = useCallback(
    (payload: { pokemon: PokemonOptionType; locationId: string } | null) =>
      dispatch({ type: 'SET_SELECTED_HEAD', payload }),
    [dispatch]
  );
  const setSelectedBody = useCallback(
    (payload: { pokemon: PokemonOptionType; locationId: string } | null) =>
      dispatch({ type: 'SET_SELECTED_BODY', payload }),
    [dispatch]
  );
  const setActiveSlot = useCallback(
    (payload: 'head' | 'body' | null) =>
      dispatch({ type: 'SET_ACTIVE_SLOT', payload }),
    [dispatch]
  );
  const setHasManuallySelectedSlot = useCallback(
    (payload: boolean) =>
      dispatch({ type: 'SET_HAS_MANUALLY_SELECTED_SLOT', payload }),
    [dispatch]
  );
  const setSearchQuery = useCallback(
    (payload: string) => dispatch({ type: 'SET_SEARCH_QUERY', payload }),
    [dispatch]
  );
  const setNickname = useCallback(
    (payload: string) => dispatch({ type: 'SET_NICKNAME', payload }),
    [dispatch]
  );
  const setPreviewNickname = useCallback(
    (payload: string) => dispatch({ type: 'SET_PREVIEW_NICKNAME', payload }),
    [dispatch]
  );

  // Memoize the actions to prevent recreation on every render
  const actionsValue = useMemo(
    () => ({
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
    }),
    [
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
    ]
  );

  return (
    <TeamMemberSelectionStateContext.Provider value={stateValue}>
      <TeamMemberSelectionDispatchContext.Provider value={actionsValue}>
        {children}
      </TeamMemberSelectionDispatchContext.Provider>
    </TeamMemberSelectionStateContext.Provider>
  );
}

// Custom hooks for consuming the separate contexts
export function useTeamMemberSelectionState() {
  const context = useContext(TeamMemberSelectionStateContext);
  if (!context) {
    throw new Error(
      'useTeamMemberSelectionState must be used within a TeamMemberSelectionProvider'
    );
  }
  return context;
}

export function useTeamMemberSelectionActions() {
  const context = useContext(TeamMemberSelectionDispatchContext);
  if (!context) {
    throw new Error(
      'useTeamMemberSelectionActions must be used within a TeamMemberSelectionProvider'
    );
  }
  return context;
}

// Legacy hook for backward compatibility
export function useTeamMemberSelection() {
  const state = useTeamMemberSelectionState();
  const actions = useTeamMemberSelectionActions();
  return { state, actions };
}
