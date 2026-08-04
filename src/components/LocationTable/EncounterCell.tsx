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
  head: null,
  body: null,
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
  showClearConfirmation: boolean;
  showOverwriteConfirmation: boolean;
  pendingClear: PendingClear | null;
  pendingOverwrite: PendingOverwrite | null;
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
        showClearConfirmation: true,
        pendingClear: action.payload,
        wasConfirmed: false,
      };
    case "SHOW_OVERWRITE_CONFIRMATION":
      return {
        ...state,
        showOverwriteConfirmation: true,
        pendingOverwrite: action.payload,
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
        showClearConfirmation: false,
        showOverwriteConfirmation: false,
        pendingClear: null,
        pendingOverwrite: null,
        wasConfirmed: false,
        wasOverwriteConfirmed: false,
      };
    default:
      return state;
  }
};

const initialState: ConfirmationState = {
  showClearConfirmation: false,
  showOverwriteConfirmation: false,
  pendingClear: null,
  pendingOverwrite: null,
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
      locationId,
      enabled:
        shouldLoad &&
        isPokemonDataEnabled &&
        !isCustomLocation &&
        gameMode !== "randomized",
      gameMode: gameMode === "randomized" ? "classic" : gameMode,
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
    if (!pokemon) return false;
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
          type: "SHOW_CLEAR_CONFIRMATION",
          payload: { field, pokemon: currentPokemon! },
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
        type: "SHOW_OVERWRITE_CONFIRMATION",
        payload: {
          kind: "fusion",
          currentPokemon: existingPokemon,
          head,
          body,
        },
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
  ) => {
    return new Promise<boolean>((resolve) => {
      if (hasValuableData(currentValue)) {
        dispatch({
          type: "SHOW_CLEAR_CONFIRMATION",
          payload: { field, pokemon: currentValue },
        });
        pendingClearResolveRef.current = resolve;
      } else {
        resolve(true);
      }
    });
  };

  const requestOverwriteConfirmation = (
    field: "head" | "body",
    currentValue: PokemonOptionType,
    newValue: PokemonOptionType,
  ) => {
    return new Promise<boolean>((resolve) => {
      if (hasValuableData(currentValue)) {
        dispatch({
          type: "SHOW_OVERWRITE_CONFIRMATION",
          payload: {
            kind: "pokemon",
            field,
            currentPokemon: currentValue,
            newPokemon: newValue,
          },
        });
        pendingOverwriteResolveRef.current = resolve;
      } else {
        resolve(true);
      }
    });
  };

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
    if (!isFusion) return;

    // Use the atomic flip function to avoid duplicate preferred variant lookups
    playthroughActions.flipEncounterFusion(locationId);
  };

  return (
    <td
      className={clsx(
        "w-full overflow-x-auto",
        "px-4 pt-8.5 pb-4 text-sm text-gray-900 dark:text-gray-100 ",
      )}
    >
      <div className="flex flex-row justify-center gap-4 w-full ">
        <div className="flex-1 min-w-0 max-w-full ">
          {isFusion ? (
            <div className="flex items-center gap-2 ">
              <div className="flex-1 relative ">
                <span className="absolute -top-6 left-0 text-xs  text-gray-500 dark:text-gray-400">
                  Head
                </span>
                <PokemonCombobox
                  key={`${locationId}-head`}
                  locationId={locationId}
                  routeEncounterData={routeEncounterData}
                  isRouteEncounterDataLoading={isRouteEncounterDataLoading}
                  isCustomLocation={isCustomLocation}
                  value={headPokemon}
                  onChange={handleHeadChange}
                  placeholder="Select Pokémon"
                  nicknamePlaceholder="Enter nickname"
                  comboboxId={`${locationId}-head`}
                  onBeforeClear={handleBeforeClearHead}
                  onBeforeOverwrite={handleBeforeOverwriteHead}
                  isFusion={isFusion}
                  shouldLoad={shouldLoad}
                  onActivate={() => setIsPokemonDataEnabled(true)}
                />
              </div>
              <CursorTooltip
                placement="bottom"
                className="origin-top"
                content={
                  <div className="flex items-center gap-2">
                    <Image
                      src={DNA_REVERSER_ICON}
                      alt="DNA Reverser"
                      width={24}
                      height={24}
                      className="object-contain object-center image-rendering-pixelated "
                    />
                    <span className="text-sm">Reverse Fusion</span>
                  </div>
                }
                delay={300}
              >
                <button
                  type="button"
                  onClick={handleFlip}
                  className="group size-6 flex items-center justify-center p-1 rounded-md border border-gray-300 dark:border-gray-600 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 hover:bg-blue-500 hover:border-blue-600 bg-white dark:bg-gray-800"
                  aria-label="Flip head and body"
                >
                  <ArrowLeftRight className="size-4 text-gray-600 dark:text-gray-300 group-hover:text-white" />
                </button>
              </CursorTooltip>
              <div className="flex-1 relative min-w-0 max-w-full">
                <span className="absolute -top-6 left-0 text-xs  text-gray-500 dark:text-gray-400">
                  Body
                </span>
                <PokemonCombobox
                  key={`${locationId}-body`}
                  locationId={locationId}
                  routeEncounterData={routeEncounterData}
                  isRouteEncounterDataLoading={isRouteEncounterDataLoading}
                  isCustomLocation={isCustomLocation}
                  value={bodyPokemon}
                  onChange={handleBodyChange}
                  placeholder="Select Pokémon"
                  nicknamePlaceholder="Enter nickname"
                  comboboxId={`${locationId}-body`}
                  ref={bodyComboboxRef}
                  onBeforeClear={handleBeforeClearBody}
                  onBeforeOverwrite={handleBeforeOverwriteBody}
                  isFusion={isFusion}
                  shouldLoad={shouldLoad}
                  onActivate={() => setIsPokemonDataEnabled(true)}
                />
              </div>
            </div>
          ) : (
            <PokemonCombobox
              key={`${locationId}-single`}
              locationId={locationId}
              routeEncounterData={routeEncounterData}
              isRouteEncounterDataLoading={isRouteEncounterDataLoading}
              isCustomLocation={isCustomLocation}
              value={selectedPokemon}
              onChange={handleSingleChange}
              onFusionChange={handleSingleFusionChange}
              placeholder="Select Pokémon"
              nicknamePlaceholder="Enter nickname"
              comboboxId={`${locationId}-single`}
              onBeforeClear={handleBeforeClearSingle}
              onBeforeOverwrite={handleBeforeOverwriteSingle}
              isFusion={isFusion}
              shouldLoad={shouldLoad}
              onActivate={() => setIsPokemonDataEnabled(true)}
            />
          )}
        </div>
        <div className="flex flex-col gap-2 justify-center">
          <FusionToggleButton
            locationId={locationId}
            isFusion={isFusion}
            selectedPokemon={selectedPokemon}
            onToggleFusion={handleFusionToggle}
          />
        </div>
      </div>
      <ConfirmationDialog
        isOpen={confirmationState.showClearConfirmation}
        onClose={handleDialogClose}
        onConfirm={handleConfirmClear}
        title="Clear Encounter?"
        message={
          confirmationState.pendingClear
            ? getConfirmationMessage(confirmationState.pendingClear.pokemon)
            : ""
        }
        confirmText="Clear Encounter"
        cancelText="Keep Data"
        variant="warning"
      />
      <ConfirmationDialog
        isOpen={confirmationState.showOverwriteConfirmation}
        onClose={handleOverwriteDialogClose}
        onConfirm={handleConfirmOverwrite}
        title="Replace Encounter?"
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
        confirmText="Replace Encounter"
        cancelText="Keep Current"
        variant="warning"
      />
    </td>
  );
}
