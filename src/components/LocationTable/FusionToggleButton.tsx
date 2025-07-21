'use client';

import React, { useCallback } from 'react';
import { Dna, DnaOff } from 'lucide-react';
import clsx from 'clsx';
import { useSnapshot } from 'valtio';
import { dragStore, dragActions } from '@/stores/dragStore';
import { playthroughActions } from '@/stores/playthroughs';
import type { PokemonOption } from '@/loaders/pokemon';

interface FusionToggleButtonProps {
  locationId: string;
  isFusion: boolean;
  selectedPokemon: PokemonOption | null;
  onToggleFusion: () => void;
}

export function FusionToggleButton({
  locationId,
  isFusion,
  selectedPokemon,
  onToggleFusion,
}: FusionToggleButtonProps) {
  const dragSnapshot = useSnapshot(dragStore);

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
        dragSnapshot.currentDragSource !== `${locationId}-single` &&
        dragSnapshot.currentDragSource !== `${locationId}-head` &&
        dragSnapshot.currentDragSource !== `${locationId}-body`;

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
              ...(dragSnapshot.currentDragValue && {
                nickname: dragSnapshot.currentDragValue.nickname,
                status: dragSnapshot.currentDragValue.status,
              }),
            };

            playthroughActions.createFusion(
              locationId,
              selectedPokemon,
              pokemonOption
            );

            if (dragSnapshot.currentDragSource) {
              const { locationId: sourceLocationId, field: sourceField } =
                playthroughActions.getLocationFromComboboxId(
                  dragSnapshot.currentDragSource
                );
              playthroughActions.clearEncounterFromLocation(
                sourceLocationId,
                sourceField
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
      isFusion,
      selectedPokemon,
      dragSnapshot.currentDragSource,
      dragSnapshot.currentDragValue,
      locationId,
    ]
  );

  // Handle drag over
  const handleFusionDragOver = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      // Always prevent default to allow drop events to fire
      e.preventDefault();

      // Only allow drop if this row is not already a fusion and has an existing encounter
      if (isFusion || !selectedPokemon) {
        e.dataTransfer.dropEffect = 'none';
        return;
      }

      // Check if drag is from a different combobox
      const isFromDifferentCombobox =
        dragSnapshot.currentDragSource &&
        dragSnapshot.currentDragSource !== `${locationId}-single` &&
        dragSnapshot.currentDragSource !== `${locationId}-head` &&
        dragSnapshot.currentDragSource !== `${locationId}-body`;

      if (isFromDifferentCombobox) {
        e.dataTransfer.dropEffect = 'copy';
      } else {
        e.dataTransfer.dropEffect = 'none';
      }
    },
    [isFusion, selectedPokemon, dragSnapshot.currentDragSource, locationId]
  );

  // Handle drag end
  const handleFusionDragEnd = useCallback(() => {
    dragActions.clearDrag();
  }, []);

  return (
    <button
      type='button'
      onClick={onToggleFusion}
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
          'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50 dark:bg-blue-900/20':
            !isFusion &&
            selectedPokemon &&
            dragSnapshot.isDragging &&
            dragSnapshot.currentDragSource &&
            dragSnapshot.currentDragSource !== `${locationId}-single` &&
            dragSnapshot.currentDragSource !== `${locationId}-head` &&
            dragSnapshot.currentDragSource !== `${locationId}-body`,
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
  );
}
