'use client';

import React, { useCallback } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { PokemonCombobox } from '../PokemonCombobox/PokemonCombobox';
import { FusionToggleButton } from './FusionToggleButton';
import type { PokemonOption } from '@/loaders/pokemon';

import clsx from 'clsx';
import { useSnapshot } from 'valtio';
import { playthroughsStore, playthroughActions } from '@/stores/playthroughs';

interface EncounterCellProps {
  routeId: number;
  locationId: string;
}

export function EncounterCell({ routeId, locationId }: EncounterCellProps) {
  const playthroughSnapshot = useSnapshot(playthroughsStore);
  const activePlaythrough = playthroughSnapshot.playthroughs.find(
    p => p.id === playthroughSnapshot.activePlaythroughId
  );
  const encounterData = activePlaythrough?.encounters[locationId] || {
    head: null,
    body: null,
    isFusion: false,
  };

  // useSnapshot already returns plain objects, so we can use them directly
  const headPokemon = encounterData.head;
  const bodyPokemon = encounterData.body;

  const selectedPokemon = encounterData.isFusion ? bodyPokemon : headPokemon;
  const isFusion = encounterData.isFusion;

  // Handle encounter selection
  const handleEncounterSelect = useCallback(
    (pokemon: PokemonOption | null, field: 'head' | 'body' = 'head') => {
      playthroughActions.updateEncounter(locationId, pokemon, field, false);
    },
    [locationId]
  );

  // Handle fusion toggle
  const handleFusionToggle = useCallback(() => {
    playthroughActions.toggleEncounterFusion(locationId);
  }, [locationId]);

  // Handle flip button click
  const handleFlip = useCallback(() => {
    if (!isFusion) return;

    // Swap head and body (works even if one is empty)
    const newHead = bodyPokemon;
    const newBody = headPokemon;

    // Update both fields
    handleEncounterSelect(newHead, 'head');
    handleEncounterSelect(newBody, 'body');
  }, [isFusion, headPokemon, bodyPokemon, handleEncounterSelect]);

  return (
    <td
      className={clsx(
        'px-4 pt-8.5 pb-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'
      )}
      role='cell'
    >
      <div className='flex flex-row justify-center gap-4'>
        <div className='flex-1'>
          {isFusion ? (
            <div className='flex items-center gap-2'>
              <div className='flex-1 relative'>
                <span className='absolute -top-6 left-0 text-xs font-medium text-gray-500 dark:text-gray-400'>
                  Head
                </span>
                <PokemonCombobox
                  key={`${locationId}-head`}
                  routeId={routeId}
                  locationId={locationId}
                  value={headPokemon}
                  onChange={pokemon => handleEncounterSelect(pokemon, 'head')}
                  placeholder='Select head Pokemon'
                  nicknamePlaceholder='Enter head nickname'
                  comboboxId={`${locationId}-head`}
                />
              </div>
              <button
                type='button'
                onClick={handleFlip}
                className='group size-6 flex items-center justify-center p-1 rounded-md border border-gray-300 dark:border-gray-600 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 hover:bg-blue-500 hover:border-blue-600 bg-white dark:bg-gray-800'
                aria-label='Flip head and body'
                title='Flip head and body'
              >
                <ArrowLeftRight className='size-4 text-gray-600 dark:text-gray-300 group-hover:text-white' />
              </button>
              <div className='flex-1 relative'>
                <span className='absolute -top-6 left-0 text-xs font-medium text-gray-500 dark:text-gray-400'>
                  Body
                </span>
                <PokemonCombobox
                  key={`${locationId}-body`}
                  routeId={routeId}
                  locationId={locationId}
                  value={bodyPokemon}
                  onChange={pokemon => handleEncounterSelect(pokemon, 'body')}
                  placeholder='Select body Pokemon'
                  nicknamePlaceholder='Enter body nickname'
                  comboboxId={`${locationId}-body`}
                />
              </div>
            </div>
          ) : (
            <PokemonCombobox
              key={`${locationId}-single`}
              routeId={routeId}
              locationId={locationId}
              value={selectedPokemon}
              onChange={pokemon => handleEncounterSelect(pokemon)}
              placeholder='Select Pokemon'
              nicknamePlaceholder='Enter nickname'
              comboboxId={`${locationId}-single`}
            />
          )}
        </div>
        <FusionToggleButton
          locationId={locationId}
          isFusion={isFusion}
          selectedPokemon={selectedPokemon}
          onToggleFusion={handleFusionToggle}
        />
      </div>
    </td>
  );
}
