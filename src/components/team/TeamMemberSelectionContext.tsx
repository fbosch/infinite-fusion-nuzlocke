"use client";

import type React from "react";
import { createContext, useContext, useEffect, useReducer } from "react";
import type { PokemonOptionType } from "@/loaders/pokemon";
import {
  useActivePlaythrough,
  useEncounters,
} from "@/stores/playthroughs/hooks";
import { playthroughActions } from "@/stores/playthroughs/index";
import {
  findPokemonWithLocation,
  getAllPokemonWithLocations,
} from "@/utils/encounter-utils";
import {
  filterAvailableTeamPokemon,
  getTeamNicknameUpdate,
  getTeamSelectionNickname,
  initializeExistingTeamMemberSelection,
  selectTeamPokemon,
  type TeamPokemonSelection,
  type TeamSelectionSlot,
} from "./teamMemberSelectionDomain";

// Action types
type TeamMemberSelectionAction =
  | {
      type: "SET_SELECTED_HEAD";
      payload: TeamPokemonSelection | null;
    }
  | {
      type: "SET_SELECTED_BODY";
      payload: TeamPokemonSelection | null;
    }
  | { type: "SET_ACTIVE_SLOT"; payload: TeamSelectionSlot | null }
  | { type: "SET_HAS_MANUALLY_SELECTED_SLOT"; payload: boolean }
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | { type: "SET_NICKNAME"; payload: string }
  | { type: "SET_PREVIEW_NICKNAME"; payload: string }
  | {
      type: "APPLY_POKEMON_SELECTION";
      payload: { pokemon: PokemonOptionType; locationId: string };
    }
  | { type: "RESET_STATE" }
  | {
      type: "INITIALIZE_FROM_EXISTING";
      payload: ReturnType<typeof initializeExistingTeamMemberSelection>;
    };

interface TeamMemberSelectionState {
  activeSlot: TeamSelectionSlot | null;

  // Computed values
  availablePokemon: TeamPokemonSelection[];
  canUpdateTeam: boolean;
  hasManuallySelectedSlot: boolean;
  hasSelection: boolean;
  nickname: string;
  previewNickname: string;

  // UI state
  searchQuery: string;
  selectedBody: TeamPokemonSelection | null;
  // Pokemon selection state
  selectedHead: TeamPokemonSelection | null;
}

type TeamMemberSelectionReducerState = Omit<
  TeamMemberSelectionState,
  "availablePokemon" | "canUpdateTeam" | "hasSelection"
>;

interface TeamMemberSelectionActions {
  handleClearTeamMember: () => Promise<void>;
  handlePokemonSelect: (pokemon: PokemonOptionType, locationId: string) => void;
  handleRemoveBodyPokemon: () => void;
  handleRemoveHeadPokemon: () => void;

  // Business logic actions
  handleSlotSelect: (slot: "head" | "body") => void;

  // Team member actions
  handleUpdateTeamMember: () => Promise<void>;
  resetState: () => void;
  setActiveSlot: (slot: TeamSelectionSlot | null) => void;
  setHasManuallySelectedSlot: (value: boolean) => void;
  setNickname: (nickname: string) => void;
  setPreviewNickname: (nickname: string) => void;

  // UI actions
  setSearchQuery: (query: string) => void;
  setSelectedBody: (selection: TeamPokemonSelection | null) => void;
  // Pokemon selection actions
  setSelectedHead: (selection: TeamPokemonSelection | null) => void;
}

// Initial state
const initialState: TeamMemberSelectionReducerState = {
  activeSlot: "head",
  hasManuallySelectedSlot: false,
  nickname: "",
  previewNickname: "",
  searchQuery: "",
  selectedBody: null,
  selectedHead: null,
};

// Reducer function
function teamMemberSelectionReducer(
  state: TeamMemberSelectionReducerState,
  action: TeamMemberSelectionAction,
): TeamMemberSelectionReducerState {
  switch (action.type) {
    case "SET_SELECTED_HEAD":
      return { ...state, selectedHead: action.payload };
    case "SET_SELECTED_BODY":
      return { ...state, selectedBody: action.payload };
    case "SET_ACTIVE_SLOT":
      return { ...state, activeSlot: action.payload };
    case "SET_HAS_MANUALLY_SELECTED_SLOT":
      return { ...state, hasManuallySelectedSlot: action.payload };
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.payload };
    case "SET_NICKNAME":
      return { ...state, nickname: action.payload };
    case "SET_PREVIEW_NICKNAME":
      return { ...state, previewNickname: action.payload };
    case "RESET_STATE":
      return { ...initialState, activeSlot: "head" };
    case "APPLY_POKEMON_SELECTION":
      return {
        ...state,
        ...selectTeamPokemon({
          activeSlot: state.activeSlot,
          locationId: action.payload.locationId,
          nickname: state.nickname,
          pokemon: action.payload.pokemon,
          previewNickname: state.previewNickname,
          selectedBody: state.selectedBody,
          selectedHead: state.selectedHead,
        }),
      };
    case "INITIALIZE_FROM_EXISTING":
      return {
        ...state,
        nickname: action.payload.nickname,
        previewNickname: action.payload.previewNickname,
        selectedBody: action.payload.selectedBody,
        selectedHead: action.payload.selectedHead,
      };
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
  existingTeamMember?: {
    position: number;
    isEmpty: boolean;
    location?: string;
    headPokemon?: PokemonOptionType | null;
    bodyPokemon?: PokemonOptionType | null;
    isFusion?: boolean;
  } | null;
  onClose: () => void;
  onSelect: (
    headPokemon: PokemonOptionType | null,
    bodyPokemon: PokemonOptionType | null,
  ) => Promise<boolean>;
  position: number;
}

function useTeamSelectionEffects({
  state,
  dispatch,
  existingTeamMember,
  encounters,
}: {
  state: TeamMemberSelectionReducerState;
  dispatch: React.Dispatch<TeamMemberSelectionAction>;
  existingTeamMember: TeamMemberSelectionProviderProps["existingTeamMember"];
  encounters: ReturnType<typeof useEncounters>;
}) {
  const { selectedHead, selectedBody, activeSlot, hasManuallySelectedSlot } =
    state;

  useEffect(() => {
    if (
      !(selectedHead || selectedBody || activeSlot || hasManuallySelectedSlot)
    ) {
      dispatch({ payload: "head", type: "SET_ACTIVE_SLOT" });
    }
  }, [
    selectedHead,
    selectedBody,
    activeSlot,
    hasManuallySelectedSlot,
    dispatch,
  ]);

  useEffect(() => {
    const nickname = getTeamSelectionNickname(
      selectedHead?.pokemon,
      selectedBody?.pokemon,
    );
    dispatch({ payload: nickname, type: "SET_NICKNAME" });
    dispatch({ payload: nickname, type: "SET_PREVIEW_NICKNAME" });
  }, [selectedHead, selectedBody, dispatch]);

  useEffect(() => {
    if (!existingTeamMember || existingTeamMember.isEmpty || !encounters) {
      return;
    }

    const selection = initializeExistingTeamMemberSelection(
      existingTeamMember,
      (uid) => findPokemonWithLocation(encounters, uid),
    );
    dispatch({ payload: selection, type: "INITIALIZE_FROM_EXISTING" });
  }, [existingTeamMember, encounters, dispatch]);

  useEffect(() => {
    if (!existingTeamMember || existingTeamMember.isEmpty || !encounters) {
      return;
    }

    const selection = initializeExistingTeamMemberSelection(
      existingTeamMember,
      (uid) => findPokemonWithLocation(encounters, uid),
    );
    if (
      !hasManuallySelectedSlot &&
      selection.suggestedActiveSlot !== undefined
    ) {
      dispatch({
        payload: selection.suggestedActiveSlot,
        type: "SET_ACTIVE_SLOT",
      });
    }
  }, [existingTeamMember, encounters, hasManuallySelectedSlot, dispatch]);
}

function useTeamMemberSelectionActionValue({
  dispatch,
  selectedHead,
  selectedBody,
  nickname,
  onSelect,
  onClose,
}: {
  dispatch: React.Dispatch<TeamMemberSelectionAction>;
  selectedHead: TeamPokemonSelection | null;
  selectedBody: TeamPokemonSelection | null;
  nickname: string;
  onSelect: TeamMemberSelectionProviderProps["onSelect"];
  onClose: TeamMemberSelectionProviderProps["onClose"];
}) {
  "use memo";

  const setSelectedHead = (payload: TeamPokemonSelection | null) =>
    dispatch({ payload, type: "SET_SELECTED_HEAD" });
  const setSelectedBody = (payload: TeamPokemonSelection | null) =>
    dispatch({ payload, type: "SET_SELECTED_BODY" });
  const setActiveSlot = (payload: TeamSelectionSlot | null) =>
    dispatch({ payload, type: "SET_ACTIVE_SLOT" });
  const setHasManuallySelectedSlot = (payload: boolean) =>
    dispatch({ payload, type: "SET_HAS_MANUALLY_SELECTED_SLOT" });
  const setSearchQuery = (payload: string) =>
    dispatch({ payload, type: "SET_SEARCH_QUERY" });
  const setNickname = (payload: string) =>
    dispatch({ payload, type: "SET_NICKNAME" });
  const setPreviewNickname = (payload: string) =>
    dispatch({ payload, type: "SET_PREVIEW_NICKNAME" });
  const handleSlotSelect = (slot: TeamSelectionSlot) => {
    dispatch({ payload: slot, type: "SET_ACTIVE_SLOT" });
    dispatch({ payload: true, type: "SET_HAS_MANUALLY_SELECTED_SLOT" });
  };
  const handlePokemonSelect = (
    pokemon: PokemonOptionType,
    locationId: string,
  ) => {
    dispatch({
      payload: { locationId, pokemon },
      type: "APPLY_POKEMON_SELECTION",
    });
  };
  const handleRemoveHeadPokemon = () => {
    dispatch({ payload: null, type: "SET_SELECTED_HEAD" });
    dispatch({ payload: "head", type: "SET_ACTIVE_SLOT" });
    dispatch({ payload: "", type: "SET_NICKNAME" });
    dispatch({ payload: "", type: "SET_PREVIEW_NICKNAME" });
  };
  const handleRemoveBodyPokemon = () => {
    dispatch({ payload: null, type: "SET_SELECTED_BODY" });
    dispatch({ payload: "body", type: "SET_ACTIVE_SLOT" });
    dispatch({ payload: "", type: "SET_NICKNAME" });
    dispatch({ payload: "", type: "SET_PREVIEW_NICKNAME" });
  };
  const resetState = () => {
    dispatch({ type: "RESET_STATE" });
  };
  const handleUpdateTeamMember = async () => {
    const nicknameUpdate = getTeamNicknameUpdate(
      selectedHead?.pokemon,
      selectedBody?.pokemon,
      nickname,
    );
    if (nicknameUpdate) {
      await playthroughActions.updatePokemonByUID(nicknameUpdate.uid, {
        nickname: nicknameUpdate.nickname,
      });
    }
    const success = await onSelect(
      selectedHead?.pokemon ?? null,
      selectedBody?.pokemon ?? null,
    );
    if (success) {
      onClose();
    }
  };
  const handleClearTeamMember = async () => {
    if (await onSelect(null, null)) {
      onClose();
    }
  };

  return {
    handleClearTeamMember,
    handlePokemonSelect,
    handleRemoveBodyPokemon,
    handleRemoveHeadPokemon,
    handleSlotSelect,
    handleUpdateTeamMember,
    resetState,
    setActiveSlot,
    setHasManuallySelectedSlot,
    setNickname,
    setPreviewNickname,
    setSearchQuery,
    setSelectedBody,
    setSelectedHead,
  };
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
    initialState,
  );
  const teamMembers = activePlaythrough?.team?.members;

  useTeamSelectionEffects({ dispatch, encounters, existingTeamMember, state });

  // Get all available Pokémon from encounters, filtering out those already in use by other team members
  const allAvailablePokemon = (() => {
    if (!(encounters && teamMembers)) {
      return [];
    }

    return filterAvailableTeamPokemon(
      getAllPokemonWithLocations(encounters),
      teamMembers,
      position,
      existingTeamMember,
    );
  })();

  // Computed values
  const stateValue = {
    ...state,
    availablePokemon: allAvailablePokemon,
    canUpdateTeam: true,
    hasSelection: Boolean(state.selectedHead || state.selectedBody),
  };
  const actionsValue = useTeamMemberSelectionActionValue({
    dispatch,
    nickname: state.nickname,
    onClose,
    onSelect,
    selectedBody: state.selectedBody,
    selectedHead: state.selectedHead,
  });

  return (
    <TeamMemberSelectionStateContext.Provider value={stateValue}>
      <TeamMemberSelectionDispatchContext.Provider value={actionsValue}>
        {children}
      </TeamMemberSelectionDispatchContext.Provider>
    </TeamMemberSelectionStateContext.Provider>
  );
}

// Custom hooks for consuming the separate contexts
function useTeamMemberSelectionState() {
  const context = useContext(TeamMemberSelectionStateContext);
  if (!context) {
    throw new Error(
      "useTeamMemberSelectionState must be used within a TeamMemberSelectionProvider",
    );
  }
  return context;
}

function useTeamMemberSelectionActions() {
  const context = useContext(TeamMemberSelectionDispatchContext);
  if (!context) {
    throw new Error(
      "useTeamMemberSelectionActions must be used within a TeamMemberSelectionProvider",
    );
  }
  return context;
}

// Legacy hook for backward compatibility
export function useTeamMemberSelection() {
  const state = useTeamMemberSelectionState();
  const actions = useTeamMemberSelectionActions();
  return { actions, state };
}
