'use client';

import React, { useMemo, useState, useCallback } from 'react';
import clsx from 'clsx';
import { Hand, MousePointer, ArrowDownToDot, Home, Atom } from 'lucide-react';
import {
  type PokemonOptionType,
  isEggId,
  usePokemonEvolutionData,
} from '@/loaders/pokemon';
import { dragActions } from '@/stores/dragStore';
import { PokemonSprite } from '../PokemonSprite';
import { CursorTooltip } from '../CursorTooltip';
import spritesheetMetadata from '@/assets/pokemon-gen8-spritesheet-metadata.json';
import ContextMenu, { type ContextMenuItem } from '../ContextMenu';
import { getLocations, getLocationByIdFromMerged } from '@/loaders/locations';
import {
  playthroughActions,
  getActivePlaythrough,
  useCustomLocations,
} from '@/stores/playthroughs';
import TypePills from '../TypePills';
import dynamic from 'next/dynamic';
import usePokemonTypes from '../../hooks/usePokemonTypes';
import { ArrowUpRight, Undo2 } from 'lucide-react';
import { emitEvolutionEvent } from '@/lib/events';

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
  const customLocations = useCustomLocations();

  const { primary, secondary } = usePokemonTypes({ id: pokemon?.id });
  const { evolutions, preEvolution } = usePokemonEvolutionData(
    pokemon?.id,
    true
  );

  // Extract field from comboboxId
  const field = comboboxId?.includes('-body') ? 'body' : 'head';

  // Get available locations (excluding current one)
  const availableLocations = locationId
    ? getLocations().filter(location => location.id !== locationId)
    : [];

  // Check if moving to original location would create egg fusion
  const wouldCreateEggFusionAtOriginal = useMemo(() => {
    if (!value || !value.originalLocation || !locationId) return false;

    // Check if the Pokemon is an egg
    const isPokemonEgg = isEggId(value.id);

    // Check if there's a Pokemon in the opposite slot at the original location
    const activePlaythrough = getActivePlaythrough();
    const originalEncounter =
      activePlaythrough?.encounters?.[value.originalLocation];
    if (!originalEncounter) return false;

    // If the original location encounter is not a fusion (isFusion = false),
    // then no fusion will be created regardless of what's in the body slot
    // UNLESS we're moving an egg or there's an egg in the target location
    if (!originalEncounter.isFusion) {
      // For non-fusion encounters, only prevent if there's an egg involved
      const headPokemon = originalEncounter.head;
      const bodyPokemon = originalEncounter.body;

      // If moving an egg and there's any Pokemon in the target location
      if (isPokemonEgg && (headPokemon || bodyPokemon)) {
        return true;
      }

      // If there's an egg in the target location and we're moving a Pokemon
      if (
        (headPokemon && isEggId(headPokemon.id)) ||
        (bodyPokemon && isEggId(bodyPokemon.id))
      ) {
        return true;
      }

      return false;
    }

    // For fusion encounters, check the opposite slot
    const oppositeField = field === 'head' ? 'body' : 'head';
    const oppositePokemon = originalEncounter[oppositeField];

    // If moving Pokemon is an egg and there's a Pokemon in the opposite slot, it would create egg fusion
    if (isPokemonEgg && oppositePokemon) {
      return true;
    }

    // If there's an egg in the opposite slot and we're moving a Pokemon, it would create egg fusion
    if (oppositePokemon && isEggId(oppositePokemon.id)) {
      return true;
    }

    return false;
  }, [value, locationId, field]);

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
      const originalLocation = getLocationByIdFromMerged(
        value.originalLocation,
        customLocations
      );
      if (originalLocation) {
        const isDisabled = wouldCreateEggFusionAtOriginal;
        options.push({
          id: 'move-to-original',
          label: 'Move to Original Location',
          tooltip: isDisabled
            ? 'Cannot move to original location - would create egg fusion'
            : originalLocation.name,
          icon: Home,
          onClick: handleMoveToOriginalLocation,
          disabled: isDisabled,
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

    if (value && locationId && (preEvolution || evolutions?.length)) {
      options.push({
        id: 'evolve-separator',
        separator: true,
      });
    }

    // Add devolve option if pre-evolution exists
    if (value && locationId && preEvolution) {
      options.push({
        id: 'devolve',
        label: (
          <div className='flex items-center gap-x-2 w-full'>
            <div className='flex items-center justify-center size-6 flex-shrink-0'>
              <PokemonSprite pokemonId={preEvolution.id} generation='gen7' />
            </div>
            <span className='truncate'>Devolve to {preEvolution.name}</span>
          </div>
        ),
        icon: Undo2,
        onClick: async () => {
          if (!value || !locationId || !preEvolution) return;
          const devolved: PokemonOptionType = {
            ...value,
            id: preEvolution.id,
            name: preEvolution.name,
            nationalDexId: preEvolution.nationalDexId,
          };
          await playthroughActions.updateEncounter(
            locationId,
            devolved,
            field,
            false
          );
        },
      });
    }

    // Add evolve option(s)
    if (value && locationId && evolutions && evolutions.length > 0) {
      if (evolutions.length === 1) {
        const evo = evolutions[0]!;
        options.push({
          id: `evolve-${evo.id}`,
          label: (
            <div className='flex items-center gap-x-2 w-full'>
              <div className='flex items-center justify-center size-8 flex-shrink-0'>
                <PokemonSprite pokemonId={evo.id} generation='gen7' />
              </div>
              <span className='truncate'>Evolve to {evo.name}</span>
            </div>
          ),
          icon: Atom,
          onClick: async () => {
            if (!value || !locationId) return;
            const evolved: PokemonOptionType = {
              ...value,
              id: evo.id,
              name: evo.name,
              nationalDexId: evo.nationalDexId,
            };
            await playthroughActions.updateEncounter(
              locationId,
              evolved,
              field,
              false
            );
            const id = locationId ?? value?.originalLocation ?? null;
            if (id) emitEvolutionEvent(id);
          },
        });
      } else {
        options.push({
          id: 'evolve',
          label: 'Evolve to…',
          icon: Atom,
          children: evolutions.map(evo => ({
            id: `evolve-${evo.id}`,
            label: (
              <div className='flex items-center gap-x-2 w-full'>
                <div className='flex items-center justify-center size-8 flex-shrink-0'>
                  <PokemonSprite pokemonId={evo.id} generation='gen7' />
                </div>
                <span className='truncate'>{evo.name}</span>
              </div>
            ),
            onClick: async () => {
              if (!value || !locationId) return;
              const evolved: PokemonOptionType = {
                ...value,
                id: evo.id,
                name: evo.name,
                nationalDexId: evo.nationalDexId,
              };
              await playthroughActions.updateEncounter(
                locationId,
                evolved,
                field,
                false
              );
              const id = locationId ?? value?.originalLocation ?? null;
              if (id) emitEvolutionEvent(id);
            },
          })),
        });
      }
    }
    const infinitefusiondexLink = `https://infinitefusiondex.com/details/${value?.id}`;
    const fusiondexLink = `https://fusiondex.org/sprite/pif/${value?.id}/`;

    options.push(
      {
        id: 'separator',
        separator: true,
      },
      {
        id: 'infinitefusiondex',
        label: 'Open InfiniteDex entry',
        href: infinitefusiondexLink,
        target: '_blank',
        favicon: 'https://infinitefusiondex.com/images/favicon.ico',
        icon: ArrowUpRight,
        iconClassName: 'dark:text-blue-300 text-blue-400',
      },
      {
        id: 'fusiondex',
        label: 'Open FusionDex entry',
        href: fusiondexLink,
        target: '_blank',
        favicon: 'https://www.fusiondex.org/favicon.ico',
        icon: ArrowUpRight,
        iconClassName: 'dark:text-blue-300 text-blue-400',
      }
    );
    return options;
  }, [
    value,
    locationId,
    customLocations,
    availableLocations.length,
    handleMoveToOriginalLocation,
    wouldCreateEggFusionAtOriginal,
    preEvolution,
    evolutions,
    field,
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
        <div>
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
                <div className='flex py-0.5 text-xs mb-1.5'>
                  <TypePills
                    className='flex'
                    primary={primary}
                    secondary={secondary}
                  />
                </div>
                <div className='w-full h-px bg-gray-200 dark:bg-gray-700 my-1.5 mb-2' />
                {/* Show original encounter location if different from current location */}
                {pokemon?.originalLocation &&
                  pokemon.originalLocation !== locationId && (
                    <div className='mb-2 pb-2 border-b border-gray-200 dark:border-gray-700'>
                      <div className='flex items-center gap-1.5 text-xs'>
                        <Home className='size-3 text-gray-500 dark:text-gray-400' />
                        <span className='text-gray-600 dark:text-gray-300'>
                          Encountered at:{' '}
                        </span>
                        <span className='font-medium text-gray-700 dark:text-gray-200'>
                          {getLocationByIdFromMerged(
                            pokemon.originalLocation,
                            customLocations
                          )?.name || pokemon.originalLocation}
                        </span>
                      </div>
                    </div>
                  )}
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
            <div
              className={clsx(
                'absolute inset-y-0 px-1.5 flex items-center bg-gray-300/20 border-r border-gray-300 dark:bg-gray-500/20 dark:border-gray-600 rounded-tl-md',
                'size-12.5 flex items-center justify-center active:cursor-grabbing',
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
              <PokemonSprite
                pokemonId={pokemon.id}
                className={clsx(
                  dragPreview && 'opacity-60 pointer-events-none' // Make preview sprite opaque
                )}
                draggable={false}
                generation='gen8'
              />
            </div>
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
