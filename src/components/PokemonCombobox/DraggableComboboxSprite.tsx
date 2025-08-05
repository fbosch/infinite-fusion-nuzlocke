'use client';

import React, { useMemo, useState, useCallback } from 'react';
import clsx from 'clsx';
import { Hand, MousePointer, ArrowDownToDot, Home } from 'lucide-react';
import { type PokemonOptionType } from '@/loaders/pokemon';
import { dragActions } from '@/stores/dragStore';
import { PokemonSprite } from '../PokemonSprite';
import { CursorTooltip } from '../CursorTooltip';
import spritesheetMetadata from '@/assets/pokemon-spritesheet-metadata.json';
import ContextMenu, { type ContextMenuItem } from '../ContextMenu';
import { getLocations, getLocationById } from '@/loaders/locations';
import {
  playthroughActions,
  getActivePlaythrough,
} from '@/stores/playthroughs';
import dynamic from 'next/dynamic';

const LocationSelector = dynamic(
  () =>
    import('../PokemonSummaryCard/LocationSelector').then(
      mod => mod.LocationSelector
    ),
  {
    ssr: false,
  }
);

interface DraggableComboboxSpriteProps {
  value: PokemonOptionType | null | undefined;
  dragPreview: PokemonOptionType | null;
  comboboxId?: string;
  disabled?: boolean;
  locationId?: string;
}

export function DraggableComboboxSprite({
  value,
  dragPreview,
  comboboxId,
  disabled = false,
  locationId,
}: DraggableComboboxSpriteProps) {
  const pokemon = dragPreview || value;
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  // Extract field from comboboxId
  const field = comboboxId?.includes('-body') ? 'body' : 'head';

  // Get available locations (excluding current one)
  const availableLocations = locationId
    ? getLocations().filter(location => location.id !== locationId)
    : [];

  // Handle move to location
  const handleMoveToLocation = async (
    targetLocationId: string,
    targetField: 'head' | 'body'
  ) => {
    if (!value || !locationId) return;

    // Check if there's already a Pokemon in the target slot
    const activePlaythrough = getActivePlaythrough();
    const targetEncounter = activePlaythrough?.encounters?.[targetLocationId];
    const existingPokemon = targetEncounter
      ? targetField === 'head'
        ? targetEncounter.head
        : targetEncounter.body
      : null;

    if (existingPokemon) {
      // If there's already a Pokemon in the target slot, swap them
      await playthroughActions.swapEncounters(
        locationId,
        targetLocationId,
        field,
        targetField
      );
    } else {
      // If the target slot is empty, use atomic move to preserve other Pokemon at source
      await playthroughActions.moveEncounterAtomic(
        locationId,
        field,
        targetLocationId,
        targetField,
        value
      );
    }
  };

  // Handle move to original location
  const handleMoveToOriginalLocation = useCallback(async () => {
    if (!value || !locationId) return;

    await playthroughActions.moveToOriginalLocation(locationId, field, value);
  }, [value, locationId, field]);

  const menuOptions = useMemo(() => {
    const options: ContextMenuItem[] = [];

    // Add move to original location option if Pokemon has an original location and isn't already there
    if (
      value &&
      locationId &&
      value.originalLocation &&
      value.originalLocation !== locationId
    ) {
      const originalLocation = getLocationById(value.originalLocation);
      if (originalLocation) {
        options.push({
          id: 'move-to-original',
          label: 'Move to Original Location',
          tooltip: originalLocation.name,
          icon: Home,
          onClick: handleMoveToOriginalLocation,
        });
      }
    }

    // Add move option if we have a Pokemon and location with available destinations
    if (value && locationId && availableLocations.length > 0) {
      options.push({
        id: 'move',
        label: 'Move to Location',
        icon: ArrowDownToDot,
        onClick: () => setIsMoveModalOpen(true),
      });
    }

    return options;
  }, [
    value,
    locationId,
    availableLocations.length,
    handleMoveToOriginalLocation,
  ]);

  if (!pokemon) return null;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    const sprite = e.currentTarget.querySelector('img') as HTMLImageElement;
    if (sprite && pokemon) {
      const spriteMetadata = spritesheetMetadata.sprites.find(
        s => s.id === pokemon.id
      );
      if (spriteMetadata) {
        const dragElement = document.createElement('div');
        dragElement.style.cssText = `
          width: ${spriteMetadata.width}px;
          height: ${spriteMetadata.height}px;
          background-image: url(${sprite.src});
          background-position: -${spriteMetadata.x}px -${spriteMetadata.y}px;
          background-repeat: no-repeat;
          position: absolute;
          top: -1000px;
          image-rendering: pixelated;
        `;
        document.body.appendChild(dragElement);
        e.dataTransfer.setDragImage(
          dragElement,
          spriteMetadata.width / 2,
          spriteMetadata.height / 2
        );
        setTimeout(() => document.body.removeChild(dragElement), 0);
      }
    }
    e.dataTransfer.setData('text/plain', pokemon.name);
    dragActions.startDrag(pokemon.name, comboboxId || '', pokemon);
  };

  return (
    <>
      <ContextMenu items={menuOptions}>
        <div
          className={clsx(
            'absolute inset-y-0 px-1.5 flex items-center bg-gray-300/20 border-r border-gray-300 dark:bg-gray-500/20 dark:border-gray-600 rounded-tl-md',
            'size-12.5 flex items-center justify-center',
            'group-focus-within/input:border-blue-500',
            {
              'cursor-grab': !disabled,
              'cursor-not-allowed opacity-50': disabled,
              'pointer-events-none': dragPreview || disabled,
            }
          )}
          draggable={!disabled}
          onDragStart={handleDragStart}
        >
          <CursorTooltip
            disabled={!!dragPreview || disabled}
            delay={500}
            offset={{
              mainAxis: 8,
              crossAxis: 8,
            }}
            placement='bottom-start'
            content={
              <div>
                <div className='flex items-center text-xs gap-2'>
                  <div className='flex items-center gap-1'>
                    <div className='flex items-center gap-0.5 px-1 py-px bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-200'>
                      <Hand className='size-2.5' />
                      <span className='font-medium text-xs'>L</span>
                    </div>
                    <span className='text-gray-600 dark:text-gray-300 text-xs'>
                      Grab
                    </span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <div className='flex items-center gap-0.5 px-1 py-px bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-200'>
                      <MousePointer className='size-2.5' />
                      <span className='font-medium text-xs'>R</span>
                    </div>
                    <span className='text-gray-600 dark:text-gray-300 text-xs'>
                      Options
                    </span>
                  </div>
                </div>
              </div>
            }
          >
            <PokemonSprite
              pokemonId={pokemon.id}
              className={clsx(
                dragPreview && 'opacity-60 pointer-events-none' // Make preview sprite opaque
              )}
              draggable={false}
            />
          </CursorTooltip>
        </div>
      </ContextMenu>

      {/* Location Selector Modal */}
      <LocationSelector
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        currentLocationId={locationId || ''}
        onSelectLocation={(
          targetLocationId: string,
          targetField: 'head' | 'body'
        ) => {
          handleMoveToLocation(targetLocationId, targetField);
          setIsMoveModalOpen(false);
        }}
        encounterData={value ? { [field]: value } : null}
        moveTargetField={field}
      />
    </>
  );
}
