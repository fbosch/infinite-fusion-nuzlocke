import { useCallback, useReducer, useRef } from "react";
import type { PokemonOptionType } from "@/loaders/pokemon";

export type EncounterField = "head" | "body";

export interface PendingClear {
  field: EncounterField;
  pokemon: PokemonOptionType;
}

export type PendingOverwrite =
  | {
      kind: "pokemon";
      field: EncounterField;
      currentPokemon: PokemonOptionType;
      newPokemon: PokemonOptionType;
    }
  | {
      kind: "fusion";
      currentPokemon: PokemonOptionType[];
      head: PokemonOptionType;
      body: PokemonOptionType;
    };

export interface ConfirmationState {
  pendingClear: PendingClear | null;
  pendingOverwrite: PendingOverwrite | null;
  showClearConfirmation: boolean;
  showOverwriteConfirmation: boolean;
  wasConfirmed: boolean;
  wasOverwriteConfirmed: boolean;
}

type ConfirmationAction =
  | { type: "SHOW_CLEAR_CONFIRMATION"; payload: PendingClear }
  | { type: "SHOW_OVERWRITE_CONFIRMATION"; payload: PendingOverwrite }
  | { type: "CONFIRM_CLEAR" }
  | { type: "CONFIRM_OVERWRITE" }
  | { type: "CLOSE_DIALOGS" };

const initialState: ConfirmationState = {
  pendingClear: null,
  pendingOverwrite: null,
  showClearConfirmation: false,
  showOverwriteConfirmation: false,
  wasConfirmed: false,
  wasOverwriteConfirmed: false,
};

const confirmationReducer = (
  state: ConfirmationState,
  action: ConfirmationAction,
): ConfirmationState => {
  switch (action.type) {
    case "SHOW_CLEAR_CONFIRMATION":
      return {
        ...state,
        pendingClear: action.payload,
        showClearConfirmation: true,
        wasConfirmed: false,
      };
    case "SHOW_OVERWRITE_CONFIRMATION":
      return {
        ...state,
        pendingOverwrite: action.payload,
        showOverwriteConfirmation: true,
        wasOverwriteConfirmed: false,
      };
    case "CONFIRM_CLEAR":
      return { ...state, wasConfirmed: true };
    case "CONFIRM_OVERWRITE":
      return { ...state, wasOverwriteConfirmed: true };
    case "CLOSE_DIALOGS":
      return initialState;
    default:
      return state;
  }
};

export function useConfirmationDialogState() {
  const [confirmationState, dispatch] = useReducer(
    confirmationReducer,
    initialState,
  );
  const pendingClearResolveRef = useRef<((result: boolean) => void) | null>(
    null,
  );
  const pendingOverwriteResolveRef = useRef<((result: boolean) => void) | null>(
    null,
  );

  const requestClearConfirmation = useCallback(
    (pendingClear: PendingClear) =>
      new Promise<boolean>((resolve) => {
        dispatch({ payload: pendingClear, type: "SHOW_CLEAR_CONFIRMATION" });
        pendingClearResolveRef.current = resolve;
      }),
    [],
  );
  const requestOverwriteConfirmation = useCallback(
    (pendingOverwrite: PendingOverwrite) =>
      new Promise<boolean>((resolve) => {
        dispatch({
          payload: pendingOverwrite,
          type: "SHOW_OVERWRITE_CONFIRMATION",
        });
        pendingOverwriteResolveRef.current = resolve;
      }),
    [],
  );
  const showClearConfirmation = useCallback((pendingClear: PendingClear) => {
    dispatch({ payload: pendingClear, type: "SHOW_CLEAR_CONFIRMATION" });
  }, []);
  const showOverwriteConfirmation = useCallback(
    (pendingOverwrite: PendingOverwrite) => {
      dispatch({
        payload: pendingOverwrite,
        type: "SHOW_OVERWRITE_CONFIRMATION",
      });
    },
    [],
  );
  const confirmClear = useCallback(() => {
    dispatch({ type: "CONFIRM_CLEAR" });
  }, []);
  const confirmOverwrite = useCallback(() => {
    dispatch({ type: "CONFIRM_OVERWRITE" });
  }, []);
  const closeClearConfirmation = useCallback(() => {
    pendingClearResolveRef.current?.(confirmationState.wasConfirmed);
    pendingClearResolveRef.current = null;
    dispatch({ type: "CLOSE_DIALOGS" });
  }, [confirmationState.wasConfirmed]);
  const closeOverwriteConfirmation = useCallback(() => {
    pendingOverwriteResolveRef.current?.(
      confirmationState.wasOverwriteConfirmed,
    );
    pendingOverwriteResolveRef.current = null;
    dispatch({ type: "CLOSE_DIALOGS" });
  }, [confirmationState.wasOverwriteConfirmed]);

  return {
    closeClearConfirmation,
    closeOverwriteConfirmation,
    confirmationState,
    confirmClear,
    confirmOverwrite,
    requestClearConfirmation,
    requestOverwriteConfirmation,
    showClearConfirmation,
    showOverwriteConfirmation,
  };
}
