'use client';

import React, { useCallback, useRef, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { PokemonCombobox } from '@/components/PokemonCombobox/PokemonCombobox';
import { FusionToggleButton } from './FusionToggleButton';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import type { PokemonOption } from '@/loaders/pokemon';

import clsx from 'clsx';
import { useEncounter, playthroughActions } from '@/stores/playthroughs';
import { getLocationById } from '@/loaders/locations';
import { CursorTooltip } from '@/components/CursorTooltip';
import { DNA_REVERSER_ICON } from '@/misc/items';
import Image from 'next/image';

interface EncounterCellProps {
  routeId: number | undefined;
  locationId: string;
  shouldLoad?: boolean;
}

interface PendingClear {
  field: 'head' | 'body';
  pokemon: PokemonOption;
}

export function EncounterCell({
  routeId,
  locationId,
  shouldLoad,
}: EncounterCellProps) {
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

  // State for confirmation dialog
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingClear, setPendingClear] = useState<PendingClear | null>(null);
  const [wasConfirmed, setWasConfirmed] = useState(false);

  // Ref for the body combobox to enable focusing
  const bodyComboboxRef = useRef<HTMLInputElement | null>(null);

  // Ref to store the resolve function for confirmation dialogs
  const pendingClearResolveRef = useRef<((result: boolean) => void) | null>(
    null
  );

  // Check if a pokemon has valuable data that would be lost when clearing
  const hasValuableData = useCallback(
    (pokemon: PokemonOption | null): boolean => {
      if (!pokemon) return false;
      return !!(pokemon.nickname || pokemon.status);
    },
    []
  );

  // Generate confirmation message based on what data would be lost
  const getConfirmationMessage = useCallback(
    (pokemon: PokemonOption): string => {
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

  // Handle encounter selection with confirmation for clearing valuable data
  const handleEncounterSelect = useCallback(
    (pokemon: PokemonOption | null, field: 'head' | 'body' = 'head') => {
      // If we're clearing a pokemon (setting to null)
      if (pokemon === null) {
        const currentPokemon = field === 'head' ? headPokemon : bodyPokemon;

        // Check if the current pokemon has valuable data
        if (hasValuableData(currentPokemon)) {
          // Show confirmation dialog
          setPendingClear({ field, pokemon: currentPokemon! });
          setShowConfirmation(true);
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
    (pokemon: PokemonOption | null) => {
      handleEncounterSelect(pokemon, 'head');
    },
    [handleEncounterSelect]
  );

  const handleBodyChange = useCallback(
    (pokemon: PokemonOption | null) => {
      handleEncounterSelect(pokemon, 'body');
    },
    [handleEncounterSelect]
  );

  const handleSingleChange = useCallback(
    (pokemon: PokemonOption | null) => {
      handleEncounterSelect(pokemon);
    },
    [handleEncounterSelect]
  );

  // Handle confirmation dialog confirm action
  const handleConfirmClear = useCallback(() => {
    if (pendingClear) {
      playthroughActions.updateEncounter(
        locationId,
        null,
        pendingClear.field,
        false
      );
    }

    // Mark that the user confirmed the action
    setWasConfirmed(true);
  }, [locationId, pendingClear]);

  // Handle confirmation dialog cancel/close action
  const handleDialogClose = useCallback(() => {
    // Resolve the pending promise based on whether it was confirmed or cancelled
    if (pendingClearResolveRef.current) {
      pendingClearResolveRef.current(wasConfirmed);
      pendingClearResolveRef.current = null;
    }

    // Reset all state when dialog closes
    setShowConfirmation(false);
    setPendingClear(null);
    setWasConfirmed(false);
  }, [wasConfirmed]);

  // Create separate handlers for head and body clearing
  const handleBeforeClearHead = useCallback(
    (currentValue: PokemonOption): Promise<boolean> => {
      return new Promise(resolve => {
        if (hasValuableData(currentValue)) {
          setPendingClear({ field: 'head', pokemon: currentValue });
          setShowConfirmation(true);
          pendingClearResolveRef.current = resolve;
        } else {
          resolve(true);
        }
      });
    },
    [hasValuableData]
  );

  const handleBeforeClearBody = useCallback(
    (currentValue: PokemonOption): Promise<boolean> => {
      return new Promise(resolve => {
        if (hasValuableData(currentValue)) {
          setPendingClear({ field: 'body', pokemon: currentValue });
          setShowConfirmation(true);
          pendingClearResolveRef.current = resolve;
        } else {
          resolve(true);
        }
      });
    },
    [hasValuableData]
  );

  const handleBeforeClearSingle = useCallback(
    (currentValue: PokemonOption): Promise<boolean> => {
      return new Promise(resolve => {
        if (hasValuableData(currentValue)) {
          setPendingClear({ field: 'head', pokemon: currentValue });
          setShowConfirmation(true);
          pendingClearResolveRef.current = resolve;
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
    <>
      <td
        className={clsx(
          'w-96 max-w-96 overflow-x-auto',
          'px-4 pt-8.5 pb-4 text-sm text-gray-900 dark:text-gray-100 '
        )}
        role='cell'
      >
        <div className='flex flex-row justify-center gap-4 w-full '>
          <div className='flex-1 min-w-0 max-w-full '>
            {isFusion ? (
              <div className='flex items-center gap-2 '>
                <div className='flex-1 relative '>
                  <span className='absolute -top-6 left-0 text-xs font-semibold text-gray-500 dark:text-gray-400'>
                    Head
                  </span>
                  <PokemonCombobox
                    key={`${locationId}-head`}
                    routeId={routeId}
                    locationId={locationId}
                    value={headPokemon}
                    onChange={handleHeadChange}
                    placeholder='Select Pokémon'
                    nicknamePlaceholder='Enter nickname'
                    comboboxId={`${locationId}-head`}
                    shouldLoad={shouldLoad}
                    onBeforeClear={handleBeforeClearHead}
                  />
                </div>
                <CursorTooltip
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
                  <span className='absolute -top-6 left-0 text-xs font-semibold text-gray-500 dark:text-gray-400'>
                    Body
                  </span>
                  <PokemonCombobox
                    key={`${locationId}-body`}
                    routeId={routeId}
                    locationId={locationId}
                    value={bodyPokemon}
                    onChange={handleBodyChange}
                    placeholder='Select Pokémon'
                    nicknamePlaceholder='Enter nickname'
                    comboboxId={`${locationId}-body`}
                    ref={bodyComboboxRef}
                    shouldLoad={shouldLoad}
                    onBeforeClear={handleBeforeClearBody}
                  />
                </div>
              </div>
            ) : (
              <PokemonCombobox
                key={`${locationId}-single`}
                routeId={routeId}
                locationId={locationId}
                value={selectedPokemon}
                onChange={handleSingleChange}
                placeholder='Select Pokémon'
                nicknamePlaceholder='Enter nickname'
                comboboxId={`${locationId}-single`}
                shouldLoad={shouldLoad}
                onBeforeClear={handleBeforeClearSingle}
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
      </td>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmation}
        onClose={handleDialogClose}
        onConfirm={handleConfirmClear}
        title='Clear Encounter?'
        message={
          pendingClear ? getConfirmationMessage(pendingClear.pokemon) : ''
        }
        confirmText='Clear Encounter'
        cancelText='Keep Data'
        variant='warning'
      />
    </>
  );
}
