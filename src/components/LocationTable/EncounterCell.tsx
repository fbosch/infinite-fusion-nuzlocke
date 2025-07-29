'use client';

import React, { useCallback, useRef, useReducer } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { PokemonCombobox } from '@/components/PokemonCombobox/PokemonCombobox';
import { FusionToggleButton } from './FusionToggleButton';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import type { PokemonOptionType } from '@/loaders/pokemon';

import clsx from 'clsx';
import { useEncounter, playthroughActions } from '@/stores/playthroughs';
import { getLocationById } from '@/loaders/locations';
import { CursorTooltip } from '@/components/CursorTooltip';
import { DNA_REVERSER_ICON } from '@/misc/items';
import Image from 'next/image';

interface EncounterCellProps {
  locationId: string;
  shouldLoad?: boolean;
}

interface PendingClear {
  field: 'head' | 'body';
  pokemon: PokemonOptionType;
}

interface PendingOverwrite {
  field: 'head' | 'body';
  currentPokemon: PokemonOptionType;
  newPokemon: PokemonOptionType;
}

interface ConfirmationState {
  showClearConfirmation: boolean;
  showOverwriteConfirmation: boolean;
  pendingClear: PendingClear | null;
  pendingOverwrite: PendingOverwrite | null;
  wasConfirmed: boolean;
  wasOverwriteConfirmed: boolean;
}

type ConfirmationAction =
  | { type: 'SHOW_CLEAR_CONFIRMATION'; payload: PendingClear }
  | { type: 'SHOW_OVERWRITE_CONFIRMATION'; payload: PendingOverwrite }
  | { type: 'CONFIRM_CLEAR' }
  | { type: 'CONFIRM_OVERWRITE' }
  | { type: 'CLOSE_DIALOGS' };

const confirmationReducer = (
  state: ConfirmationState,
  action: ConfirmationAction
): ConfirmationState => {
  switch (action.type) {
    case 'SHOW_CLEAR_CONFIRMATION':
      return {
        ...state,
        showClearConfirmation: true,
        pendingClear: action.payload,
        wasConfirmed: false,
      };
    case 'SHOW_OVERWRITE_CONFIRMATION':
      return {
        ...state,
        showOverwriteConfirmation: true,
        pendingOverwrite: action.payload,
        wasOverwriteConfirmed: false,
      };
    case 'CONFIRM_CLEAR':
      return {
        ...state,
        wasConfirmed: true,
      };
    case 'CONFIRM_OVERWRITE':
      return {
        ...state,
        wasOverwriteConfirmed: true,
      };
    case 'CLOSE_DIALOGS':
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

export function EncounterCell({ locationId, shouldLoad }: EncounterCellProps) {
  // Get encounter data directly - only this cell will rerender when this encounter changes
  const encounterData = useEncounter(locationId) || {
    head: null,
    body: null,
    isFusion: false,
    updatedAt: Date.now(),
  };

  // useSnapshot already returns plain objects, so we can use them directly
  const headPokemon = encounterData.head;
  const bodyPokemon = encounterData.body;

  const selectedPokemon = encounterData.isFusion ? bodyPokemon : headPokemon;
  const isFusion = encounterData.isFusion;

  // Use reducer for confirmation dialog state
  const [confirmationState, dispatch] = useReducer(
    confirmationReducer,
    initialState
  );

  // Ref for the body combobox to enable focusing
  const bodyComboboxRef = useRef<HTMLInputElement | null>(null);

  // Ref to store the resolve function for confirmation dialogs
  const pendingClearResolveRef = useRef<((result: boolean) => void) | null>(
    null
  );

  // Ref to store the resolve function for overwrite confirmation dialogs
  const pendingOverwriteResolveRef = useRef<((result: boolean) => void) | null>(
    null
  );

  // Check if a pokemon has valuable data that would be lost when clearing
  const hasValuableData = useCallback(
    (pokemon: PokemonOptionType | null): boolean => {
      if (!pokemon) return false;
      return !!(pokemon.nickname || pokemon.status);
    },
    []
  );

  // Generate confirmation message based on what data would be lost
  const getConfirmationMessage = useCallback(
    (pokemon: PokemonOptionType): string => {
      const dataItems: string[] = [];
      if (pokemon.status)
        dataItems.push(
          `with the status "${pokemon.status.charAt(0).toUpperCase() + pokemon.status.slice(1)}"`
        );
      if (pokemon.originalLocation)
        dataItems.push(
          `which was encountered at the location: "${getLocationById(pokemon.originalLocation)?.name}"`
        );

      const dataText =
        dataItems.length > 1
          ? `${dataItems.slice(0, -1).join(', ')} and ${dataItems[dataItems.length - 1]}`
          : dataItems[0];

      return `This will permanently remove ${pokemon.nickname + ' '}the ${pokemon.name}${dataText ? ` ${dataText}` : ''}.`;
    },
    []
  );

  // Generate overwrite confirmation message
  const getOverwriteConfirmationMessage = useCallback(
    (
      currentPokemon: PokemonOptionType,
      newPokemon: PokemonOptionType
    ): string => {
      const currentDataItems: string[] = [];
      if (currentPokemon.status)
        currentDataItems.push(
          `with the status "${currentPokemon.status.charAt(0).toUpperCase() + currentPokemon.status.slice(1)}"`
        );
      if (currentPokemon.originalLocation)
        currentDataItems.push(
          `which was encountered at the location: "${getLocationById(currentPokemon.originalLocation)?.name}"`
        );

      const currentDataText =
        currentDataItems.length > 1
          ? `${currentDataItems.slice(0, -1).join(', ')} and ${currentDataItems[currentDataItems.length - 1]}`
          : currentDataItems[0];

      return `This will replace ${currentPokemon.nickname + ' '}the ${currentPokemon.name}${currentDataText ? ` ${currentDataText}` : ''} with ${newPokemon.name}.`;
    },
    []
  );

  // Handle encounter selection with confirmation for clearing valuable data
  const handleEncounterSelect = useCallback(
    (pokemon: PokemonOptionType | null, field: 'head' | 'body' = 'head') => {
      // If we're clearing a pokemon (setting to null)
      if (pokemon === null) {
        const currentPokemon = field === 'head' ? headPokemon : bodyPokemon;

        // Check if the current pokemon has valuable data
        if (hasValuableData(currentPokemon)) {
          // Show confirmation dialog
          dispatch({
            type: 'SHOW_CLEAR_CONFIRMATION',
            payload: { field, pokemon: currentPokemon! },
          });
          return;
        }
      }

      // If no confirmation needed, proceed with the change
      playthroughActions.updateEncounter(locationId, pokemon, field, false);
    },
    [locationId, headPokemon, bodyPokemon, hasValuableData]
  );

  // Create separate memoized handlers to avoid creating new functions on every render
  const handleHeadChange = useCallback(
    (pokemon: PokemonOptionType | null) => {
      handleEncounterSelect(pokemon, 'head');
    },
    [handleEncounterSelect]
  );

  const handleBodyChange = useCallback(
    (pokemon: PokemonOptionType | null) => {
      handleEncounterSelect(pokemon, 'body');
    },
    [handleEncounterSelect]
  );

  const handleSingleChange = useCallback(
    (pokemon: PokemonOptionType | null) => {
      handleEncounterSelect(pokemon);
    },
    [handleEncounterSelect]
  );

  // Handle confirmation dialog confirm action
  const handleConfirmClear = useCallback(() => {
    if (confirmationState.pendingClear) {
      playthroughActions.updateEncounter(
        locationId,
        null,
        confirmationState.pendingClear.field,
        false
      );
    }

    // Mark that the user confirmed the action
    dispatch({ type: 'CONFIRM_CLEAR' });
  }, [locationId, confirmationState.pendingClear]);

  // Handle confirmation dialog cancel/close action
  const handleDialogClose = useCallback(() => {
    // Resolve the pending promise based on whether it was confirmed or cancelled
    if (pendingClearResolveRef.current) {
      pendingClearResolveRef.current(confirmationState.wasConfirmed);
      pendingClearResolveRef.current = null;
    }

    // Reset all state when dialog closes
    dispatch({ type: 'CLOSE_DIALOGS' });
  }, [confirmationState.wasConfirmed]);

  // Handle overwrite confirmation dialog confirm action
  const handleConfirmOverwrite = useCallback(() => {
    if (confirmationState.pendingOverwrite) {
      playthroughActions.updateEncounter(
        locationId,
        confirmationState.pendingOverwrite.newPokemon,
        confirmationState.pendingOverwrite.field,
        false
      );
    }

    // Mark that the user confirmed the action
    dispatch({ type: 'CONFIRM_OVERWRITE' });
  }, [locationId, confirmationState.pendingOverwrite]);

  // Handle overwrite confirmation dialog cancel/close action
  const handleOverwriteDialogClose = useCallback(() => {
    // Resolve the pending promise based on whether it was confirmed or cancelled
    if (pendingOverwriteResolveRef.current) {
      pendingOverwriteResolveRef.current(
        confirmationState.wasOverwriteConfirmed
      );
      pendingOverwriteResolveRef.current = null;
    }

    // Reset all state when dialog closes
    dispatch({ type: 'CLOSE_DIALOGS' });
  }, [confirmationState.wasOverwriteConfirmed]);

  // Create separate handlers for head and body clearing
  const handleBeforeClearHead = useCallback(
    (currentValue: PokemonOptionType): Promise<boolean> => {
      return new Promise(resolve => {
        if (hasValuableData(currentValue)) {
          dispatch({
            type: 'SHOW_CLEAR_CONFIRMATION',
            payload: { field: 'head', pokemon: currentValue },
          });
          pendingClearResolveRef.current = resolve;
        } else {
          resolve(true);
        }
      });
    },
    [hasValuableData]
  );

  const handleBeforeClearBody = useCallback(
    (currentValue: PokemonOptionType): Promise<boolean> => {
      return new Promise(resolve => {
        if (hasValuableData(currentValue)) {
          dispatch({
            type: 'SHOW_CLEAR_CONFIRMATION',
            payload: { field: 'body', pokemon: currentValue },
          });
          pendingClearResolveRef.current = resolve;
        } else {
          resolve(true);
        }
      });
    },
    [hasValuableData]
  );

  const handleBeforeClearSingle = useCallback(
    (currentValue: PokemonOptionType): Promise<boolean> => {
      return new Promise(resolve => {
        if (hasValuableData(currentValue)) {
          dispatch({
            type: 'SHOW_CLEAR_CONFIRMATION',
            payload: { field: 'head', pokemon: currentValue },
          });
          pendingClearResolveRef.current = resolve;
        } else {
          resolve(true);
        }
      });
    },
    [hasValuableData]
  );

  // Create separate handlers for head and body overwrite
  const handleBeforeOverwriteHead = useCallback(
    (
      currentValue: PokemonOptionType,
      newValue: PokemonOptionType
    ): Promise<boolean> => {
      return new Promise(resolve => {
        if (hasValuableData(currentValue)) {
          dispatch({
            type: 'SHOW_OVERWRITE_CONFIRMATION',
            payload: {
              field: 'head',
              currentPokemon: currentValue,
              newPokemon: newValue,
            },
          });
          pendingOverwriteResolveRef.current = resolve;
        } else {
          resolve(true);
        }
      });
    },
    [hasValuableData]
  );

  const handleBeforeOverwriteBody = useCallback(
    (
      currentValue: PokemonOptionType,
      newValue: PokemonOptionType
    ): Promise<boolean> => {
      return new Promise(resolve => {
        if (hasValuableData(currentValue)) {
          dispatch({
            type: 'SHOW_OVERWRITE_CONFIRMATION',
            payload: {
              field: 'body',
              currentPokemon: currentValue,
              newPokemon: newValue,
            },
          });
          pendingOverwriteResolveRef.current = resolve;
        } else {
          resolve(true);
        }
      });
    },
    [hasValuableData]
  );

  const handleBeforeOverwriteSingle = useCallback(
    (
      currentValue: PokemonOptionType,
      newValue: PokemonOptionType
    ): Promise<boolean> => {
      return new Promise(resolve => {
        if (hasValuableData(currentValue)) {
          dispatch({
            type: 'SHOW_OVERWRITE_CONFIRMATION',
            payload: {
              field: 'head',
              currentPokemon: currentValue,
              newPokemon: newValue,
            },
          });
          pendingOverwriteResolveRef.current = resolve;
        } else {
          resolve(true);
        }
      });
    },
    [hasValuableData]
  );

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
  }, [locationId, isFusion, headPokemon, bodyPokemon]);

  // Handle flip button click
  const handleFlip = useCallback(() => {
    if (!isFusion) return;

    // Use the atomic flip function to avoid duplicate preferred variant lookups
    playthroughActions.flipEncounterFusion(locationId);
  }, [isFusion, locationId]);

  return (
    <td
      className={clsx(
        'w-full overflow-x-auto',
        'px-4 pt-8.5 pb-4 text-sm text-gray-900 dark:text-gray-100 '
      )}
      role='cell'
    >
      <div className='flex flex-row justify-center gap-4 w-full '>
        <div className='flex-1 min-w-0 max-w-full '>
          {isFusion ? (
            <div className='flex items-center gap-2 '>
              <div className='flex-1 relative '>
                <span className='absolute -top-6 left-0 text-xs  text-gray-500 dark:text-gray-400'>
                  Head
                </span>
                <PokemonCombobox
                  key={`${locationId}-head`}
                  locationId={locationId}
                  value={headPokemon}
                  onChange={handleHeadChange}
                  placeholder='Select Pokémon'
                  nicknamePlaceholder='Enter nickname'
                  comboboxId={`${locationId}-head`}
                  shouldLoad={shouldLoad}
                  onBeforeClear={handleBeforeClearHead}
                  onBeforeOverwrite={handleBeforeOverwriteHead}
                  isFusion={isFusion}
                />
              </div>
              <CursorTooltip
                placement='bottom'
                className='origin-top'
                content={
                  <div className='flex items-center gap-2'>
                    <Image
                      src={DNA_REVERSER_ICON}
                      alt='DNA Reverser'
                      width={24}
                      height={24}
                      className='object-contain object-center image-rendering-pixelated '
                    />
                    <span className='text-sm'>Invert Fusion</span>
                  </div>
                }
                delay={300}
              >
                <button
                  type='button'
                  onClick={handleFlip}
                  className='group size-6 flex items-center justify-center p-1 rounded-md border border-gray-300 dark:border-gray-600 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 hover:bg-blue-500 hover:border-blue-600 bg-white dark:bg-gray-800'
                  aria-label='Flip head and body'
                >
                  <ArrowLeftRight className='size-4 text-gray-600 dark:text-gray-300 group-hover:text-white' />
                </button>
              </CursorTooltip>
              <div className='flex-1 relative min-w-0 max-w-full'>
                <span className='absolute -top-6 left-0 text-xs  text-gray-500 dark:text-gray-400'>
                  Body
                </span>
                <PokemonCombobox
                  key={`${locationId}-body`}
                  locationId={locationId}
                  value={bodyPokemon}
                  onChange={handleBodyChange}
                  placeholder='Select Pokémon'
                  nicknamePlaceholder='Enter nickname'
                  comboboxId={`${locationId}-body`}
                  ref={bodyComboboxRef}
                  shouldLoad={shouldLoad}
                  onBeforeClear={handleBeforeClearBody}
                  onBeforeOverwrite={handleBeforeOverwriteBody}
                  isFusion={isFusion}
                />
              </div>
            </div>
          ) : (
            <PokemonCombobox
              key={`${locationId}-single`}
              locationId={locationId}
              value={selectedPokemon}
              onChange={handleSingleChange}
              placeholder='Select Pokémon'
              nicknamePlaceholder='Enter nickname'
              comboboxId={`${locationId}-single`}
              shouldLoad={shouldLoad}
              onBeforeClear={handleBeforeClearSingle}
              onBeforeOverwrite={handleBeforeOverwriteSingle}
              isFusion={isFusion}
            />
          )}
        </div>
        <div className='flex flex-col gap-2 justify-center'>
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
        title='Clear Encounter?'
        message={
          confirmationState.pendingClear
            ? getConfirmationMessage(confirmationState.pendingClear.pokemon)
            : ''
        }
        confirmText='Clear Encounter'
        cancelText='Keep Data'
        variant='warning'
      />
      <ConfirmationDialog
        isOpen={confirmationState.showOverwriteConfirmation}
        onClose={handleOverwriteDialogClose}
        onConfirm={handleConfirmOverwrite}
        title='Replace Encounter?'
        message={
          confirmationState.pendingOverwrite
            ? getOverwriteConfirmationMessage(
                confirmationState.pendingOverwrite.currentPokemon,
                confirmationState.pendingOverwrite.newPokemon
              )
            : ''
        }
        confirmText='Replace Encounter'
        cancelText='Keep Current'
        variant='warning'
      />
    </td>
  );
}
