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
  // Pokemon selection state
  selectedHead: TeamPokemonSelection | null;
  selectedBody: TeamPokemonSelection | null;
  activeSlot: TeamSelectionSlot | null;
  hasManuallySelectedSlot: boolean;

  // UI state
  searchQuery: string;
  nickname: string;
  previewNickname: string;

  // Computed values
  availablePokemon: TeamPokemonSelection[];
  canUpdateTeam: boolean;
  hasSelection: boolean;
}

type TeamMemberSelectionReducerState = Omit<
  TeamMemberSelectionState,
  "availablePokemon" | "canUpdateTeam" | "hasSelection"
>;

interface TeamMemberSelectionActions {
  // Pokemon selection actions
  setSelectedHead: (selection: TeamPokemonSelection | null) => void;
  setSelectedBody: (selection: TeamPokemonSelection | null) => void;
  setActiveSlot: (slot: TeamSelectionSlot | null) => void;
  setHasManuallySelectedSlot: (value: boolean) => void;

  // UI actions
  setSearchQuery: (query: string) => void;
  setNickname: (nickname: string) => void;
  setPreviewNickname: (nickname: string) => void;

  // Business logic actions
  handleSlotSelect: (slot: "head" | "body") => void;
  handlePokemonSelect: (pokemon: PokemonOptionType, locationId: string) => void;
  handleRemoveHeadPokemon: () => void;
  handleRemoveBodyPokemon: () => void;
  resetState: () => void;

  // Team member actions
  handleUpdateTeamMember: () => Promise<void>;
  handleClearTeamMember: () => Promise<void>;
}

// Initial state
const initialState: TeamMemberSelectionReducerState = {
  selectedHead: null,
  selectedBody: null,
  activeSlot: "head",
  hasManuallySelectedSlot: false,
  searchQuery: "",
  nickname: "",
  previewNickname: "",
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
          selectedHead: state.selectedHead,
          selectedBody: state.selectedBody,
          activeSlot: state.activeSlot,
          pokemon: action.payload.pokemon,
          locationId: action.payload.locationId,
          nickname: state.nickname,
          previewNickname: state.previewNickname,
        }),
      };
    case "INITIALIZE_FROM_EXISTING":
      return {
        ...state,
        selectedHead: action.payload.selectedHead,
        selectedBody: action.payload.selectedBody,
        nickname: action.payload.nickname,
        previewNickname: action.payload.previewNickname,
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
    bodyPokemon: PokemonOptionType | null,
  ) => Promise<boolean>;
  onClose: () => void;
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
      !selectedHead &&
      !selectedBody &&
      !activeSlot &&
      !hasManuallySelectedSlot
    ) {
      dispatch({ type: "SET_ACTIVE_SLOT", payload: "head" });
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
    dispatch({ type: "SET_NICKNAME", payload: nickname });
    dispatch({ type: "SET_PREVIEW_NICKNAME", payload: nickname });
  }, [selectedHead, selectedBody, dispatch]);

  useEffect(() => {
    if (!existingTeamMember || existingTeamMember.isEmpty || !encounters) {
      return;
    }

    const selection = initializeExistingTeamMemberSelection(
      existingTeamMember,
      (uid) => findPokemonWithLocation(encounters, uid),
    );
    dispatch({ type: "INITIALIZE_FROM_EXISTING", payload: selection });
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
        type: "SET_ACTIVE_SLOT",
        payload: selection.suggestedActiveSlot,
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
    dispatch({ type: "SET_SELECTED_HEAD", payload });
  const setSelectedBody = (payload: TeamPokemonSelection | null) =>
    dispatch({ type: "SET_SELECTED_BODY", payload });
  const setActiveSlot = (payload: TeamSelectionSlot | null) =>
    dispatch({ type: "SET_ACTIVE_SLOT", payload });
  const setHasManuallySelectedSlot = (payload: boolean) =>
    dispatch({ type: "SET_HAS_MANUALLY_SELECTED_SLOT", payload });
  const setSearchQuery = (payload: string) =>
    dispatch({ type: "SET_SEARCH_QUERY", payload });
  const setNickname = (payload: string) =>
    dispatch({ type: "SET_NICKNAME", payload });
  const setPreviewNickname = (payload: string) =>
    dispatch({ type: "SET_PREVIEW_NICKNAME", payload });
  const handleSlotSelect = (slot: TeamSelectionSlot) => {
    dispatch({ type: "SET_ACTIVE_SLOT", payload: slot });
    dispatch({ type: "SET_HAS_MANUALLY_SELECTED_SLOT", payload: true });
  };
  const handlePokemonSelect = (
    pokemon: PokemonOptionType,
    locationId: string,
  ) => {
    dispatch({
      type: "APPLY_POKEMON_SELECTION",
      payload: { pokemon, locationId },
    });
  };
  const handleRemoveHeadPokemon = () => {
    dispatch({ type: "SET_SELECTED_HEAD", payload: null });
    dispatch({ type: "SET_ACTIVE_SLOT", payload: "head" });
    dispatch({ type: "SET_NICKNAME", payload: "" });
    dispatch({ type: "SET_PREVIEW_NICKNAME", payload: "" });
  };
  const handleRemoveBodyPokemon = () => {
    dispatch({ type: "SET_SELECTED_BODY", payload: null });
    dispatch({ type: "SET_ACTIVE_SLOT", payload: "body" });
    dispatch({ type: "SET_NICKNAME", payload: "" });
    dispatch({ type: "SET_PREVIEW_NICKNAME", payload: "" });
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
    if (success) onClose();
  };
  const handleClearTeamMember = async () => {
    if (await onSelect(null, null)) onClose();
  };

  return {
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

  useTeamSelectionEffects({ state, dispatch, existingTeamMember, encounters });

  // Get all available Pokémon from encounters, filtering out those already in use by other team members
  const allAvailablePokemon = (() => {
    if (!encounters || !teamMembers) return [];

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
    selectedHead: state.selectedHead,
    selectedBody: state.selectedBody,
    nickname: state.nickname,
    onSelect,
    onClose,
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
  return { state, actions };
}
