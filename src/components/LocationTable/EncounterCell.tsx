"use client";

import clsx from "clsx";
import { ArrowLeftRight } from "lucide-react";
import Image from "next/image";
import { useReducer, useRef, useState } from "react";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { CursorTooltip } from "@/components/CursorTooltip";
import { PokemonCombobox } from "@/components/PokemonCombobox/PokemonCombobox";
import { DNA_REVERSER_ICON } from "@/constants/items";
import { useEncountersForLocation } from "@/loaders/encounters";
import { getLocationById } from "@/loaders/locations";
import type { PokemonOptionType, PokemonStatusType } from "@/loaders/pokemon";
import { PokemonStatus } from "@/loaders/pokemon";
import {
  useCustomLocations,
  useEncounter,
  useGameMode,
} from "@/stores/playthroughs/hooks";
import { playthroughActions } from "@/stores/playthroughs/index";
import { EncounterSource } from "@/types/encounters";
import { FusionToggleButton } from "./FusionToggleButton";

interface EncounterCellProps {
  locationId: string;
  shouldLoad?: boolean;
}

const EMPTY_ENCOUNTER = {
  body: null,
  head: null,
  isFusion: false,
  updatedAt: 0,
};

interface PendingClear {
  field: "head" | "body";
  pokemon: PokemonOptionType;
}

type PendingOverwrite =
  | {
      kind: "pokemon";
      field: "head" | "body";
      currentPokemon: PokemonOptionType;
      newPokemon: PokemonOptionType;
    }
  | {
      kind: "fusion";
      currentPokemon: PokemonOptionType[];
      head: PokemonOptionType;
      body: PokemonOptionType;
    };

const getPokemonDataText = (pokemon: PokemonOptionType): string => {
  const dataItems: string[] = [];
  if (pokemon.status) {
    dataItems.push(
      `with the status "${pokemon.status.charAt(0).toUpperCase() + pokemon.status.slice(1)}"`,
    );
  }
  if (pokemon.originalLocation) {
    dataItems.push(
      `which was encountered at the location: "${getLocationById(pokemon.originalLocation)?.name}"`,
    );
  }

  return dataItems.length > 1
    ? `${dataItems.slice(0, -1).join(", ")} and ${dataItems[dataItems.length - 1]}`
    : (dataItems[0] ?? "");
};

interface ConfirmationState {
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
      return {
        ...state,
        wasConfirmed: true,
      };
    case "CONFIRM_OVERWRITE":
      return {
        ...state,
        wasOverwriteConfirmed: true,
      };
    case "CLOSE_DIALOGS":
      return {
        ...state,
        pendingClear: null,
        pendingOverwrite: null,
        showClearConfirmation: false,
        showOverwriteConfirmation: false,
        wasConfirmed: false,
        wasOverwriteConfirmed: false,
      };
    default:
      return state;
  }
};

const initialState: ConfirmationState = {
  pendingClear: null,
  pendingOverwrite: null,
  showClearConfirmation: false,
  showOverwriteConfirmation: false,
  wasConfirmed: false,
  wasOverwriteConfirmed: false,
};

export function EncounterCell({
  locationId,
  shouldLoad = true,
}: EncounterCellProps) {
  // Get encounter data directly - only this cell will rerender when this encounter changes
  const encounterData = useEncounter(locationId) || EMPTY_ENCOUNTER;

  // useSnapshot already returns plain objects, so we can use them directly
  const headPokemon = encounterData.head;
  const bodyPokemon = encounterData.body;

  const selectedPokemon = encounterData.isFusion ? bodyPokemon : headPokemon;

  // Get game mode and encounter data for source detection
  const gameMode = useGameMode();
  const customLocations = useCustomLocations();
  const isCustomLocation = customLocations.some((loc) => loc.id === locationId);
  const [isPokemonDataEnabled, setIsPokemonDataEnabled] = useState(false);
  const { routeEncounterData, isLoading: isRouteEncounterDataLoading } =
    useEncountersForLocation({
      enabled:
        shouldLoad &&
        isPokemonDataEnabled &&
        !isCustomLocation &&
        gameMode !== "randomized",
      gameMode: gameMode === "randomized" ? "classic" : gameMode,
      locationId,
    });

  // Function to get Pokemon source information
  const getPokemonSource = (pokemonId: number): EncounterSource | null => {
    const pokemonData = routeEncounterData.find((p) => p.id === pokemonId);
    return pokemonData?.sources?.[0] || null;
  };
  const isFusion = encounterData.isFusion;

  // Use reducer for confirmation dialog state
  const [confirmationState, dispatch] = useReducer(
    confirmationReducer,
    initialState,
  );

  // Ref for the body combobox to enable focusing
  const bodyComboboxRef = useRef<HTMLInputElement | null>(null);

  // Ref to store the resolve function for confirmation dialogs
  const pendingClearResolveRef = useRef<((result: boolean) => void) | null>(
    null,
  );

  // Ref to store the resolve function for overwrite confirmation dialogs
  const pendingOverwriteResolveRef = useRef<((result: boolean) => void) | null>(
    null,
  );

  // Check if a pokemon has valuable data that would be lost when clearing
  const hasValuableData = (pokemon: PokemonOptionType | null): boolean => {
    if (!pokemon) {
      return false;
    }
    return !!(pokemon.nickname || pokemon.status);
  };

  // Generate confirmation message based on what data would be lost
  const getConfirmationMessage = (pokemon: PokemonOptionType): string => {
    const dataText = getPokemonDataText(pokemon);

    return `This will permanently remove ${pokemon.nickname ? `${pokemon.nickname} ` : ""}the ${pokemon.name}${dataText ? ` ${dataText}` : ""}.`;
  };

  // Generate overwrite confirmation message
  const getOverwriteConfirmationMessage = (
    currentPokemon: PokemonOptionType,
    newPokemon: PokemonOptionType,
  ): string => {
    const currentDataText = getPokemonDataText(currentPokemon);

    return `This will replace ${currentPokemon.nickname ? `${currentPokemon.nickname} the ` : ""}${currentPokemon.name}${currentDataText ? ` ${currentDataText}` : ""} with ${newPokemon.name}?`;
  };

  const getFusionOverwriteConfirmationMessage = (
    currentPokemon: PokemonOptionType[],
    head: PokemonOptionType,
    body: PokemonOptionType,
  ): string => {
    const replacedPokemon = currentPokemon
      .map((pokemon) => {
        const name = pokemon.nickname
          ? `${pokemon.nickname} the ${pokemon.name}`
          : pokemon.name;
        const dataText = getPokemonDataText(pokemon);
        return `${name}${dataText ? ` ${dataText}` : ""}`;
      })
      .join(" and ");
    return `This will replace ${replacedPokemon} with the fusion ${head.name}/${body.name}?`;
  };

  // Handle encounter selection with confirmation for clearing valuable data
  const handleEncounterSelect = (
    pokemon: PokemonOptionType | null,
    field: "head" | "body" = "head",
  ) => {
    // If we're clearing a pokemon (setting to null)
    if (pokemon === null) {
      const currentPokemon = field === "head" ? headPokemon : bodyPokemon;

      // Check if the current pokemon has valuable data
      if (hasValuableData(currentPokemon)) {
        // Show confirmation dialog
        dispatch({
          payload: { field, pokemon: currentPokemon! },
          type: "SHOW_CLEAR_CONFIRMATION",
        });
        return;
      }
    }

    // If no confirmation needed, proceed with the change
    playthroughActions.updateEncounter(locationId, pokemon, field, false);
  };

  const handleHeadChange = (pokemon: PokemonOptionType | null) => {
    handleEncounterSelect(pokemon, "head");
  };

  const handleBodyChange = (pokemon: PokemonOptionType | null) => {
    handleEncounterSelect(pokemon, "body");
  };

  const handleSingleChange = (pokemon: PokemonOptionType | null) => {
    handleEncounterSelect(pokemon);
  };

  const handleSingleFusionChange = (
    head: PokemonOptionType,
    body: PokemonOptionType,
  ) => {
    const existingPokemon = [headPokemon, bodyPokemon].filter(
      (pokemon): pokemon is PokemonOptionType => pokemon !== null,
    );
    const valuablePokemon = existingPokemon.filter(hasValuableData);

    if (valuablePokemon.length > 0) {
      dispatch({
        payload: {
          body,
          currentPokemon: existingPokemon,
          head,
          kind: "fusion",
        },
        type: "SHOW_OVERWRITE_CONFIRMATION",
      });
      return;
    }

    playthroughActions.createFusion(locationId, head, body);
  };

  // Handle confirmation dialog confirm action
  const handleConfirmClear = () => {
    if (confirmationState.pendingClear) {
      playthroughActions.updateEncounter(
        locationId,
        null,
        confirmationState.pendingClear.field,
        false,
      );
    }

    // Mark that the user confirmed the action
    dispatch({ type: "CONFIRM_CLEAR" });
  };

  // Handle confirmation dialog cancel/close action
  const handleDialogClose = () => {
    // Resolve the pending promise based on whether it was confirmed or cancelled
    if (pendingClearResolveRef.current) {
      pendingClearResolveRef.current(confirmationState.wasConfirmed);
      pendingClearResolveRef.current = null;
    }

    // Reset all state when dialog closes
    dispatch({ type: "CLOSE_DIALOGS" });
  };

  // Handle overwrite confirmation dialog confirm action
  const handleConfirmOverwrite = () => {
    if (confirmationState.pendingOverwrite) {
      if (confirmationState.pendingOverwrite.kind === "fusion") {
        playthroughActions.createFusion(
          locationId,
          confirmationState.pendingOverwrite.head,
          confirmationState.pendingOverwrite.body,
        );
        dispatch({ type: "CONFIRM_OVERWRITE" });
        return;
      }

      let pokemonToUpdate = confirmationState.pendingOverwrite.newPokemon;

      // Apply default status based on Pokemon source
      const source = getPokemonSource(pokemonToUpdate.id);
      let defaultStatus: PokemonStatusType | undefined = pokemonToUpdate.status;

      // Always set appropriate status for gift and trade Pokemon
      if (source === EncounterSource.GIFT) {
        defaultStatus = PokemonStatus.RECEIVED;
      } else if (source === EncounterSource.TRADE) {
        defaultStatus = PokemonStatus.TRADED;
      }

      // Update the Pokemon with the correct status if needed
      if (defaultStatus && defaultStatus !== pokemonToUpdate.status) {
        pokemonToUpdate = {
          ...pokemonToUpdate,
          status: defaultStatus,
        };
      }

      playthroughActions.updateEncounter(
        locationId,
        pokemonToUpdate,
        confirmationState.pendingOverwrite.field,
        false,
      );
    }

    // Mark that the user confirmed the action
    dispatch({ type: "CONFIRM_OVERWRITE" });
  };

  // Handle overwrite confirmation dialog cancel/close action
  const handleOverwriteDialogClose = () => {
    // Resolve the pending promise based on whether it was confirmed or cancelled
    if (pendingOverwriteResolveRef.current) {
      pendingOverwriteResolveRef.current(
        confirmationState.wasOverwriteConfirmed,
      );
      pendingOverwriteResolveRef.current = null;
    }

    // Reset all state when dialog closes
    dispatch({ type: "CLOSE_DIALOGS" });
  };

  const requestClearConfirmation = (
    field: "head" | "body",
    currentValue: PokemonOptionType,
  ) =>
    new Promise<boolean>((resolve) => {
      if (hasValuableData(currentValue)) {
        dispatch({
          payload: { field, pokemon: currentValue },
          type: "SHOW_CLEAR_CONFIRMATION",
        });
        pendingClearResolveRef.current = resolve;
      } else {
        resolve(true);
      }
    });

  const requestOverwriteConfirmation = (
    field: "head" | "body",
    currentValue: PokemonOptionType,
    newValue: PokemonOptionType,
  ) =>
    new Promise<boolean>((resolve) => {
      if (hasValuableData(currentValue)) {
        dispatch({
          payload: {
            currentPokemon: currentValue,
            field,
            kind: "pokemon",
            newPokemon: newValue,
          },
          type: "SHOW_OVERWRITE_CONFIRMATION",
        });
        pendingOverwriteResolveRef.current = resolve;
      } else {
        resolve(true);
      }
    });

  const handleBeforeClearHead = (currentValue: PokemonOptionType) =>
    requestClearConfirmation("head", currentValue);

  const handleBeforeClearBody = (currentValue: PokemonOptionType) =>
    requestClearConfirmation("body", currentValue);

  const handleBeforeClearSingle = (currentValue: PokemonOptionType) =>
    requestClearConfirmation("head", currentValue);

  const handleBeforeOverwriteHead = (
    currentValue: PokemonOptionType,
    newValue: PokemonOptionType,
  ) => requestOverwriteConfirmation("head", currentValue, newValue);

  const handleBeforeOverwriteBody = (
    currentValue: PokemonOptionType,
    newValue: PokemonOptionType,
  ) => requestOverwriteConfirmation("body", currentValue, newValue);

  const handleBeforeOverwriteSingle = (
    currentValue: PokemonOptionType,
    newValue: PokemonOptionType,
  ) => requestOverwriteConfirmation("head", currentValue, newValue);

  // Handle fusion toggle
  const handleFusionToggle = () => {
    playthroughActions.toggleEncounterFusion(locationId);

    // Focus body combobox when toggling to fusion mode if head pokemon exists but body doesn't
    if (!isFusion && headPokemon && !bodyPokemon) {
      // Use setTimeout to ensure the UI has updated before focusing
      setTimeout(() => {
        bodyComboboxRef.current?.focus();
      }, 0);
    }
  };

  // Handle flip button click
  const handleFlip = () => {
    if (!isFusion) {
      return;
    }

    // Use the atomic flip function to avoid duplicate preferred variant lookups
    playthroughActions.flipEncounterFusion(locationId);
  };

  return (
    <td
      className={clsx(
        "w-full overflow-x-auto",
        "px-4 pt-8.5 pb-4 text-gray-900 text-sm dark:text-gray-100",
      )}
    >
      <div className="flex w-full flex-row justify-center gap-4">
        <div className="min-w-0 max-w-full flex-1">
          {isFusion ? (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute -top-6 left-0 text-gray-500 text-xs dark:text-gray-400">
                  Head
                </span>
                <PokemonCombobox
                  comboboxId={`${locationId}-head`}
                  isCustomLocation={isCustomLocation}
                  isFusion={isFusion}
                  isRouteEncounterDataLoading={isRouteEncounterDataLoading}
                  key={`${locationId}-head`}
                  locationId={locationId}
                  nicknamePlaceholder="Enter nickname"
                  onActivate={() => setIsPokemonDataEnabled(true)}
                  onBeforeClear={handleBeforeClearHead}
                  onBeforeOverwrite={handleBeforeOverwriteHead}
                  onChange={handleHeadChange}
                  placeholder="Select Pokémon"
                  routeEncounterData={routeEncounterData}
                  shouldLoad={shouldLoad}
                  value={headPokemon}
                />
              </div>
              <CursorTooltip
                className="origin-top"
                content={
                  <div className="flex items-center gap-2">
                    <Image
                      alt="DNA Reverser"
                      className="image-rendering-pixelated object-contain object-center"
                      height={24}
                      src={DNA_REVERSER_ICON}
                      width={24}
                    />
                    <span className="text-sm">Reverse Fusion</span>
                  </div>
                }
                delay={300}
                placement="bottom"
              >
                <button
                  aria-label="Flip head and body"
                  className="group flex size-6 items-center justify-center rounded-md border border-gray-300 bg-white p-1 transition-colors duration-200 hover:border-blue-600 hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-600 dark:bg-gray-800"
                  onClick={handleFlip}
                  type="button"
                >
                  <ArrowLeftRight className="size-4 text-gray-600 group-hover:text-white dark:text-gray-300" />
                </button>
              </CursorTooltip>
              <div className="relative min-w-0 max-w-full flex-1">
                <span className="absolute -top-6 left-0 text-gray-500 text-xs dark:text-gray-400">
                  Body
                </span>
                <PokemonCombobox
                  comboboxId={`${locationId}-body`}
                  isCustomLocation={isCustomLocation}
                  isFusion={isFusion}
                  isRouteEncounterDataLoading={isRouteEncounterDataLoading}
                  key={`${locationId}-body`}
                  locationId={locationId}
                  nicknamePlaceholder="Enter nickname"
                  onActivate={() => setIsPokemonDataEnabled(true)}
                  onBeforeClear={handleBeforeClearBody}
                  onBeforeOverwrite={handleBeforeOverwriteBody}
                  onChange={handleBodyChange}
                  placeholder="Select Pokémon"
                  ref={bodyComboboxRef}
                  routeEncounterData={routeEncounterData}
                  shouldLoad={shouldLoad}
                  value={bodyPokemon}
                />
              </div>
            </div>
          ) : (
            <PokemonCombobox
              comboboxId={`${locationId}-single`}
              isCustomLocation={isCustomLocation}
              isFusion={isFusion}
              isRouteEncounterDataLoading={isRouteEncounterDataLoading}
              key={`${locationId}-single`}
              locationId={locationId}
              nicknamePlaceholder="Enter nickname"
              onActivate={() => setIsPokemonDataEnabled(true)}
              onBeforeClear={handleBeforeClearSingle}
              onBeforeOverwrite={handleBeforeOverwriteSingle}
              onChange={handleSingleChange}
              onFusionChange={handleSingleFusionChange}
              placeholder="Select Pokémon"
              routeEncounterData={routeEncounterData}
              shouldLoad={shouldLoad}
              value={selectedPokemon}
            />
          )}
        </div>
        <div className="flex flex-col justify-center gap-2">
          <FusionToggleButton
            isFusion={isFusion}
            locationId={locationId}
            onToggleFusion={handleFusionToggle}
            selectedPokemon={selectedPokemon}
          />
        </div>
      </div>
      <ConfirmationDialog
        cancelText="Keep Data"
        confirmText="Clear Encounter"
        isOpen={confirmationState.showClearConfirmation}
        message={
          confirmationState.pendingClear
            ? getConfirmationMessage(confirmationState.pendingClear.pokemon)
            : ""
        }
        onClose={handleDialogClose}
        onConfirm={handleConfirmClear}
        title="Clear Encounter?"
        variant="warning"
      />
      <ConfirmationDialog
        cancelText="Keep Current"
        confirmText="Replace Encounter"
        isOpen={confirmationState.showOverwriteConfirmation}
        message={
          confirmationState.pendingOverwrite
            ? confirmationState.pendingOverwrite.kind === "fusion"
              ? getFusionOverwriteConfirmationMessage(
                  confirmationState.pendingOverwrite.currentPokemon,
                  confirmationState.pendingOverwrite.head,
                  confirmationState.pendingOverwrite.body,
                )
              : getOverwriteConfirmationMessage(
                  confirmationState.pendingOverwrite.currentPokemon,
                  confirmationState.pendingOverwrite.newPokemon,
                )
            : ""
        }
        onClose={handleOverwriteDialogClose}
        onConfirm={handleConfirmOverwrite}
        title="Replace Encounter?"
        variant="warning"
      />
    </td>
  );
}
