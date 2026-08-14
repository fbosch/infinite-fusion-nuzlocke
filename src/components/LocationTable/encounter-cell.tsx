"use client";

import clsx from "clsx";
import { useCallback, useRef } from "react";
import ConfirmationDialog from "@/components/confirmation-dialog";
import { playthroughActions } from "@/stores/playthroughs/index";
import { EncounterPokemonSelectors } from "./encounter-pokemon-selectors";
import { FusionToggleButton } from "./fusion-toggle-button";
import { useEncounterCellData } from "./use-encounter-cell-data";
import { useEncounterConfirmation } from "./use-encounter-confirmation";

interface EncounterCellProps {
  locationId: string;
  shouldLoad?: boolean;
}

export function EncounterCell({
  locationId,
  shouldLoad = true,
}: EncounterCellProps) {
  const {
    encounterData,
    getPokemonSource,
    isCustomLocation,
    isRouteEncounterDataLoading,
    routeEncounterData,
  } = useEncounterCellData(locationId, shouldLoad);
  const headPokemon = encounterData.head;
  const bodyPokemon = encounterData.body;
  const selectedPokemon = encounterData.isFusion ? bodyPokemon : headPokemon;
  const { isFusion } = encounterData;

  // Ref for the body combobox to enable focusing
  const bodyComboboxRef = useRef<HTMLInputElement | null>(null);
  const {
    clearConfirmationMessage,
    closeClearConfirmation,
    closeOverwriteConfirmation,
    confirmationState,
    handleBodyChange,
    handleConfirmClear,
    handleConfirmOverwrite,
    handleHeadChange,
    handleSingleChange,
    handleSingleFusionChange,
    overwriteConfirmationMessage,
    requestBodyClearConfirmation,
    requestBodyOverwriteConfirmation,
    requestHeadClearConfirmation,
    requestHeadOverwriteConfirmation,
  } = useEncounterConfirmation({
    bodyPokemon,
    getPokemonSource,
    headPokemon,
    locationId,
  });

  // Handle fusion toggle
  const handleFusionToggle = useCallback(() => {
    playthroughActions.toggleEncounterFusion(locationId);

    // Focus body combobox when toggling to fusion mode if head pokemon exists but body doesn't
    if (!isFusion && headPokemon && !bodyPokemon) {
      // Use setTimeout to ensure the UI has updated before focusing
      setTimeout(() => {
        bodyComboboxRef.current?.focus();
      }, 0);
    }
  }, [bodyPokemon, headPokemon, isFusion, locationId]);

  // Handle flip button click
  const handleFlip = useCallback(() => {
    if (!isFusion) {
      return;
    }

    // Use the atomic flip function to avoid duplicate preferred variant lookups
    playthroughActions.flipEncounterFusion(locationId);
  }, [isFusion, locationId]);

  return (
    <td
      className={clsx(
        "w-full overflow-x-auto",
        "px-4 pt-8.5 pb-4 text-gray-900 text-sm dark:text-gray-100",
      )}
    >
      <div className="relative w-full sm:flex sm:flex-row sm:justify-center sm:gap-4">
        <div className="w-full sm:min-w-0 sm:max-w-full sm:flex-1">
          <EncounterPokemonSelectors
            bodyComboboxRef={bodyComboboxRef}
            bodyPokemon={bodyPokemon}
            headPokemon={headPokemon}
            isCustomLocation={isCustomLocation}
            isFusion={isFusion}
            isRouteEncounterDataLoading={isRouteEncounterDataLoading}
            locationId={locationId}
            onBeforeBodyClear={requestBodyClearConfirmation}
            onBeforeBodyOverwrite={requestBodyOverwriteConfirmation}
            onBeforeHeadClear={requestHeadClearConfirmation}
            onBeforeHeadOverwrite={requestHeadOverwriteConfirmation}
            onBodyChange={handleBodyChange}
            onFlip={handleFlip}
            onHeadChange={isFusion ? handleHeadChange : handleSingleChange}
            onSingleFusionChange={handleSingleFusionChange}
            routeEncounterData={routeEncounterData}
            shouldLoad={shouldLoad}
          />
        </div>
        <div className="absolute top-1 right-1 flex sm:static sm:flex-col sm:justify-center sm:gap-2">
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
        message={clearConfirmationMessage}
        onClose={closeClearConfirmation}
        onConfirm={handleConfirmClear}
        title="Clear Encounter?"
        variant="warning"
      />
      <ConfirmationDialog
        cancelText="Keep Current"
        confirmText="Replace Encounter"
        isOpen={confirmationState.showOverwriteConfirmation}
        message={overwriteConfirmationMessage}
        onClose={closeOverwriteConfirmation}
        onConfirm={handleConfirmOverwrite}
        title="Replace Encounter?"
        variant="warning"
      />
    </td>
  );
}
