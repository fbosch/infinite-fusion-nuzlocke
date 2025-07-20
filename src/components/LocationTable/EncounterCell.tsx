'use client';

import React, { useCallback } from 'react';
import { ArrowLeftRight, Dna, DnaOff, RotateCcw } from 'lucide-react';
import { PokemonCombobox } from '../PokemonCombobox';
import type { PokemonOption } from '@/loaders/pokemon';
import type { EncounterData } from '@/loaders/encounters';
import { getLocationNameByRouteId } from '@/loaders/locations';
import clsx from 'clsx';
import { useSnapshot } from 'valtio';
import { dragStore, dragActions } from '@/stores/dragStore';

interface EncounterCellProps {
  routeId: number;
  locationId: string;
  encounterData: EncounterData;
  onEncounterSelect: (
    routeId: number,
    pokemon: PokemonOption | null,
    field?: 'head' | 'body'
  ) => void;
  onFusionToggle: (routeId: number) => void;
}

export function EncounterCell({
  routeId,
  locationId,
  encounterData,
  onEncounterSelect,
  onFusionToggle,
}: EncounterCellProps) {
  const selectedPokemon = encounterData.isFusion
    ? encounterData.body
    : encounterData.head;
  const isFusion = encounterData.isFusion;
  const dragSnapshot = useSnapshot(dragStore);

  // Handle flip button click
  const handleFlip = useCallback(() => {
    if (!isFusion) return;

    // Swap head and body (works even if one is empty)
    const newHead = encounterData.body;
    const newBody = encounterData.head;

    // Update both fields
    onEncounterSelect(routeId, newHead, 'head');
    onEncounterSelect(routeId, newBody, 'body');
  }, [
    isFusion,
    encounterData.head,
    encounterData.body,
    routeId,
    onEncounterSelect,
  ]);

  // Handle drop on fusion button
  const handleFusionDrop = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const pokemonName = e.dataTransfer.getData('text/plain');
      if (!pokemonName) return;

      // Check if this drop is from a different combobox
      const isFromDifferentCombobox =
        dragSnapshot.currentDragSource &&
        dragSnapshot.currentDragSource !== `${routeId}-single` &&
        dragSnapshot.currentDragSource !== `${routeId}-head` &&
        dragSnapshot.currentDragSource !== `${routeId}-body`;

      if (!isFromDifferentCombobox) return;

      // Only allow dropping if this row is not already a fusion and has an existing encounter
      if (isFusion || !selectedPokemon) return;

      // Find the Pokémon by name
      const findPokemonByName = async () => {
        try {
          const { getPokemon, getPokemonNameMap } = await import(
            '@/loaders/pokemon'
          );
          const allPokemon = await getPokemon();
          const nameMap = await getPokemonNameMap();

          // Find Pokemon by name (case insensitive)
          const foundPokemon = allPokemon.find(
            p => nameMap.get(p.id)?.toLowerCase() === pokemonName.toLowerCase()
          );

          if (foundPokemon) {
            const pokemonOption: PokemonOption = {
              id: foundPokemon.id,
              name: pokemonName,
              nationalDexId: foundPokemon.nationalDexId,
              originalLocation: locationId,
            };

            // Create fusion: existing Pokémon becomes head, dropped Pokémon becomes body
            const existingPokemon = selectedPokemon;
            if (existingPokemon) {
              // Use a custom event to handle fusion creation
              window.dispatchEvent(
                new CustomEvent('createFusion', {
                  detail: {
                    routeId,
                    head: existingPokemon,
                    body: pokemonOption,
                  },
                })
              );
            }

            // Clear the source combobox
            if (dragSnapshot.currentDragSource) {
              window.dispatchEvent(
                new CustomEvent('clearCombobox', {
                  detail: { comboboxId: dragSnapshot.currentDragSource },
                })
              );
            }
          }
        } catch (err) {
          console.error('Error finding Pokemon by name:', err);
        }
      };

      findPokemonByName();
    },
    [
      routeId,
      isFusion,
      selectedPokemon,
      onEncounterSelect,
      onFusionToggle,
      dragSnapshot.currentDragSource,
      locationId,
    ]
  );

  const handleFusionDragOver = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      // Only allow drop if this row is not already a fusion, has an existing encounter, and drag is from different source
      const isFromDifferentCombobox =
        dragSnapshot.currentDragSource &&
        dragSnapshot.currentDragSource !== `${routeId}-single` &&
        dragSnapshot.currentDragSource !== `${routeId}-head` &&
        dragSnapshot.currentDragSource !== `${routeId}-body`;

      if (!isFusion && selectedPokemon && isFromDifferentCombobox) {
        e.dataTransfer.dropEffect = 'copy';
      } else {
        e.dataTransfer.dropEffect = 'none';
      }
    },
    [routeId, isFusion, selectedPokemon, dragSnapshot.currentDragSource]
  );

  // Handle drag end to clear drag state if it ends on this element
  const handleFusionDragEnd = useCallback(() => {
    // Clear drag state when drag ends on this element
    dragActions.clearDrag();
  }, []);

  return (
    <td
      className={clsx(
        'px-4 pt-8.5 pb-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'
      )}
      role='cell'
    >
      <div className='flex flex-row justify-center gap-2'>
        <div className='flex-1'>
          {isFusion ? (
            <div className='flex items-center gap-2'>
              <div className='flex-1 relative'>
                <span className='absolute -top-6 left-0 text-xs font-medium text-gray-500 dark:text-gray-400'>
                  Head
                </span>
                <PokemonCombobox
                  routeId={routeId}
                  locationId={locationId}
                  value={encounterData.head}
                  onChange={pokemon =>
                    onEncounterSelect(routeId, pokemon, 'head')
                  }
                  placeholder='Select head Pokemon'
                  nicknamePlaceholder='Enter head nickname'
                  comboboxId={`${routeId}-head`}
                />
              </div>
              <div className='flex flex-col items-center justify-center gap-1'>
                <button
                  type='button'
                  onClick={handleFlip}
                  disabled={!encounterData.head && !encounterData.body}
                  className={clsx(
                    'group',
                    'size-8 flex items-center justify-center',
                    'p-1.5 rounded-md border transition-all duration-200 cursor-pointer',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-400',
                    'dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-blue-900/20'
                  )}
                  aria-label='Flip head and body Pokemon'
                  title='Reverse fusion'
                >
                  <ArrowLeftRight className='size-4 group-hover:text-blue-600 dark:group-hover:text-blue-400' />
                </button>
              </div>
              <div className='flex-1 relative'>
                <span className='absolute -top-6 left-0 text-xs font-medium text-gray-500 dark:text-gray-400'>
                  Body
                </span>
                <PokemonCombobox
                  routeId={routeId}
                  locationId={locationId}
                  value={encounterData.body}
                  onChange={pokemon =>
                    onEncounterSelect(routeId, pokemon, 'body')
                  }
                  placeholder='Select body Pokemon'
                  nicknamePlaceholder='Enter body nickname'
                  comboboxId={`${routeId}-body`}
                />
              </div>
            </div>
          ) : (
            <PokemonCombobox
              routeId={routeId}
              locationId={locationId}
              value={selectedPokemon}
              onChange={pokemon => onEncounterSelect(routeId, pokemon)}
              placeholder='Select Pokemon'
              nicknamePlaceholder='Enter nickname'
              comboboxId={`${routeId}-single`}
            />
          )}
        </div>
        <button
          type='button'
          onClick={() => onFusionToggle(routeId)}
          onDrop={handleFusionDrop}
          onDragOver={handleFusionDragOver}
          onDragEnd={handleFusionDragEnd}
          className={clsx(
            'group',
            'size-12.25 flex items-center justify-center self-center',
            'p-2 rounded-md border transition-all duration-200 cursor-pointer',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed bg-white',
            {
              'dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 border-gray-300 hover:bg-red-500 hover:border-red-600':
                isFusion,
              'bg-white border-gray-300 text-gray-700 hover:bg-green-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-green-700':
                !isFusion,
              // Add visual feedback for drag over when not a fusion and has an existing encounter
              'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50 dark:bg-blue-900/20':
                !isFusion &&
                selectedPokemon &&
                dragSnapshot.isDragging &&
                dragSnapshot.currentDragSource &&
                dragSnapshot.currentDragSource !== `${routeId}-single` &&
                dragSnapshot.currentDragSource !== `${routeId}-head` &&
                dragSnapshot.currentDragSource !== `${routeId}-body`,
            }
          )}
          aria-label={`Toggle fusion for ${selectedPokemon?.name || 'Pokemon'}`}
          title={isFusion ? 'Unfuse' : 'Fuse'}
        >
          {isFusion ? (
            <DnaOff className='size-6 group-hover:text-white' />
          ) : (
            <Dna className='size-6 group-hover:text-white' />
          )}
        </button>
      </div>
    </td>
  );
}
