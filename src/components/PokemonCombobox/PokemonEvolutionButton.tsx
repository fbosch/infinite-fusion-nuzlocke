'use client';

import React, { useState, useCallback, useEffect, Fragment } from 'react';
import { Atom, ChevronDown, Undo2 } from 'lucide-react';
import clsx from 'clsx';
import Image from 'next/image';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import {
  useFloating,
  autoUpdate,
  flip,
  size,
  FloatingPortal,
} from '@floating-ui/react';
import {
  getPokemonEvolutionIds,
  getPokemonPreEvolutionId,
  getPokemonByNationalDexId,
  type PokemonOptionType,
} from '@/loaders/pokemon';
import { getPokemonSpriteUrlFromOption } from './PokemonCombobox';
import { useShiftKey } from '@/hooks/useKeyPressed';
import { CursorTooltip } from '../CursorTooltip';

interface PokemonEvolutionButtonProps {
  value: PokemonOptionType | null | undefined;
  onChange: (value: PokemonOptionType | null) => void;
  shouldLoad?: boolean;
}

interface EvolutionDropdownProps {
  availableEvolutions: PokemonOptionType[];
  onSelectEvolution: (evolution: PokemonOptionType) => void;
  isLoadingEvolutions: boolean;
}

// Evolution Dropdown Component
const EvolutionDropdown: React.FC<EvolutionDropdownProps> = ({
  availableEvolutions,
  onSelectEvolution,
  isLoadingEvolutions,
}) => {
  // Floating UI setup for portal positioning
  const { refs, floatingStyles, update } = useFloating({
    placement: 'bottom-end',
    middleware: [
      flip({ padding: 8 }),
      size({
        apply({ elements, availableHeight, availableWidth }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.min(300, availableHeight - 8)}px`,
            minWidth: '200px',
            maxWidth: `${availableWidth - 16}px`,
          });
        },
        padding: 8,
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  return (
    <Menu>
      <MenuButton
        ref={refs.setReference}
        disabled={isLoadingEvolutions}
        className={clsx(
          'flex items-center justify-center gap-1 px-2 py-1 rounded-md',
          'bg-gray-100 text-gray-600 text-xs font-semibold',
          'border border-gray-300 hover:border-blue-300 dark:border-gray-600 dark:hover:border-blue-400',
          'transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'dark:bg-gray-700 dark:hover:bg-blue-900/20 dark:text-gray-400 dark:hover:text-blue-400',
          'hover:cursor-pointer',
          'hover:bg-blue-100 hover:text-blue-600 hover:border-blue-300 dark:bg-blue-900/20 dark:hover:text-blue-400 dark:hover:border-blue-400',
          'data-[open]:bg-blue-100 data-[open]:text-blue-600 data-[open]:border-blue-300 dark:data-[open]:bg-blue-900/20 dark:data-[open]:text-blue-400 dark:data-[open]:border-blue-400'
        )}
        onFocus={() => update()}
      >
        <CursorTooltip
          content={
            <div className='flex items-center gap-2 text-sm'>
              <span className='text-sm'>Choose evolution</span>
              <span className='text-xs text-gray-400'>
                ({availableEvolutions.length} options)
              </span>
            </div>
          }
          delay={300}
        >
          <div className='flex items-center gap-1'>
            <Atom className='w-3 h-3' />
            <ChevronDown className='w-3 h-3' />
          </div>
        </CursorTooltip>
      </MenuButton>

      <FloatingPortal>
        <MenuItems
          ref={refs.setFloating}
          style={floatingStyles}
          className={clsx(
            'z-50 text-base shadow-lg focus:outline-none sm:text-sm',
            'bg-white dark:bg-gray-800',
            'border border-gray-300 dark:border-gray-600',
            'rounded-md mt-1 overflow-y-auto scrollbar-thin'
          )}
        >
          <div
            className={clsx(
              'px-3 pb-2 pt-1 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-800'
            )}
          >
            Choose Evolution
          </div>
          <div className='flex flex-col gap-1 overflow-y-auto p-1'>
            {availableEvolutions.map(evolution => (
              <MenuItem key={evolution.id}>
                {({ focus }) => (
                  <button
                    type='button'
                    title={`Evolve to ${evolution.name}`}
                    onClick={() => onSelectEvolution(evolution)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2 text-sm hover:cursor-pointer rounded-md',
                      'text-gray-900 dark:text-gray-100 text-left',
                      'focus:outline-none',
                      {
                        'bg-blue-600 text-white': focus,
                        'hover:bg-gray-100 dark:hover:bg-gray-700': !focus,
                      }
                    )}
                  >
                    <Image
                      src={getPokemonSpriteUrlFromOption(evolution)}
                      alt={evolution.name}
                      width={32}
                      height={32}
                      className='object-contain object-center'
                      loading='eager'
                    />
                    <span className='font-semibold'>{evolution.name}</span>
                  </button>
                )}
              </MenuItem>
            ))}
          </div>
        </MenuItems>
      </FloatingPortal>
    </Menu>
  );
};

export const PokemonEvolutionButton: React.FC<PokemonEvolutionButtonProps> = ({
  value,
  onChange,
  shouldLoad = false,
}) => {
  const [availableEvolutions, setAvailableEvolutions] = useState<
    PokemonOptionType[]
  >([]);
  const [availablePreEvolution, setAvailablePreEvolution] =
    useState<PokemonOptionType | null>(null);
  const [isLoadingEvolutions, setIsLoadingEvolutions] = useState(false);
  const isShiftPressed = useShiftKey();

  const hasEvolutions = availableEvolutions.length > 0;
  const hasPreEvolution = !!availablePreEvolution;
  const isDevolutionMode =
    (isShiftPressed && hasPreEvolution) || (!hasEvolutions && hasPreEvolution);

  // Handle evolution/devolution selection
  const handleEvolution = useCallback(
    (evolutionPokemon?: PokemonOptionType, isDevolution = false) => {
      if (evolutionPokemon) {
        // Specific evolution/devolution selected
        const evolvedPokemon: PokemonOptionType = {
          ...value,
          ...evolutionPokemon,
        };
        onChange(evolvedPokemon);
      } else if (isDevolution && availablePreEvolution) {
        // Devolution - go to pre-evolution
        const devolvedPokemon: PokemonOptionType = {
          ...value,
          ...availablePreEvolution,
        };
        onChange(devolvedPokemon);
      } else if (availableEvolutions.length === 1) {
        // Single evolution - directly evolve
        const evolution = availableEvolutions.at(0)!;
        const evolvedPokemon: PokemonOptionType = {
          ...value,
          ...evolution,
        };
        onChange(evolvedPokemon);
      }
    },
    [availableEvolutions, availablePreEvolution, value, onChange]
  );

  // Handle evolution button click for single evolution or devolution
  const handleDirectAction = useCallback(() => {
    handleEvolution(undefined, isDevolutionMode);
  }, [handleEvolution, isDevolutionMode]);

  // Load evolution and pre-evolution data when value changes
  useEffect(() => {
    if (!shouldLoad) {
      return;
    }

    // Immediately clear evolution data when Pokemon changes
    setAvailableEvolutions([]);
    setAvailablePreEvolution(null);
    setIsLoadingEvolutions(true);

    let isCancelled = false;

    const loadEvolutionData = async () => {
      if (!value?.id) {
        if (!isCancelled) {
          setAvailableEvolutions([]);
          setAvailablePreEvolution(null);
          setIsLoadingEvolutions(false);
        }
        return;
      }

      try {
        // Load evolutions
        const evolutionIds = await getPokemonEvolutionIds(value.id);
        if (isCancelled) return;

        const evolutions: PokemonOptionType[] = [];

        for (const evolutionId of evolutionIds) {
          const evolutionPokemon = await getPokemonByNationalDexId(evolutionId);
          if (isCancelled) return;

          if (evolutionPokemon) {
            evolutions.push({
              id: evolutionPokemon.id,
              name: evolutionPokemon.name,
              nationalDexId: evolutionPokemon.nationalDexId,
              originalLocation: value.originalLocation,
            });
          }
        }

        if (!isCancelled) {
          setAvailableEvolutions(evolutions);
        }

        // Load pre-evolution
        const preEvolutionId = await getPokemonPreEvolutionId(value.id);
        if (isCancelled) return;

        if (preEvolutionId) {
          const preEvolutionPokemon =
            await getPokemonByNationalDexId(preEvolutionId);
          if (isCancelled) return;

          if (preEvolutionPokemon) {
            if (!isCancelled) {
              setAvailablePreEvolution({
                id: preEvolutionPokemon.id,
                name: preEvolutionPokemon.name,
                nationalDexId: preEvolutionPokemon.nationalDexId,
                originalLocation: value.originalLocation,
              });
            }
          } else {
            if (!isCancelled) {
              setAvailablePreEvolution(null);
            }
          }
        } else {
          if (!isCancelled) {
            setAvailablePreEvolution(null);
          }
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Error loading evolution data:', error);
          setAvailableEvolutions([]);
          setAvailablePreEvolution(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingEvolutions(false);
        }
      }
    };

    loadEvolutionData();

    // Cleanup function to cancel pending operations
    return () => {
      isCancelled = true;
    };
  }, [value?.id, value?.originalLocation, shouldLoad]);

  // Don't render if no Pokemon is selected or no evolutions/devolutions available
  if (
    !value ||
    (availableEvolutions.length === 0 && !availablePreEvolution) ||
    isLoadingEvolutions
  ) {
    return null;
  }

  // For single evolution or devolution mode, render a simple button
  if (isDevolutionMode || availableEvolutions.length === 1) {
    return (
      <div className='absolute inset-y-0 right-4 flex items-center'>
        <CursorTooltip
          content={
            <div className='flex items-center gap-2'>
              <Image
                src={getPokemonSpriteUrlFromOption(
                  isDevolutionMode
                    ? availablePreEvolution!
                    : availableEvolutions[0]!
                )}
                alt={
                  isDevolutionMode
                    ? availablePreEvolution?.name || ''
                    : availableEvolutions[0]?.name || ''
                }
                width={32}
                height={32}
                className='object-contain object-center'
                unoptimized
                decoding='async'
                loading='eager'
              />
              <div className='flex flex-col gap-0.5'>
                <span>
                  {isDevolutionMode ? (
                    <Fragment>
                      Devolve to{' '}
                      <span className='font-semibold'>
                        {availablePreEvolution?.name}
                      </span>
                    </Fragment>
                  ) : (
                    <Fragment>
                      Evolve to{' '}
                      <span className='font-semibold'>
                        {availableEvolutions[0]?.name}
                      </span>
                    </Fragment>
                  )}
                </span>
                {!isDevolutionMode && availablePreEvolution && (
                  <span className='text-xs text-gray-400'>
                    Hold shift to devolve
                  </span>
                )}
              </div>
            </div>
          }
          delay={300}
        >
          <button
            type='button'
            onClick={handleDirectAction}
            disabled={isLoadingEvolutions}
            className={clsx(
              'flex items-center justify-center gap-1 px-2 py-1 rounded-md',
              'bg-gray-100 text-gray-600 text-xs font-semibold',
              'border border-gray-300 hover:border-blue-300 dark:border-gray-600 dark:hover:border-blue-400',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'dark:bg-gray-700 dark:hover:bg-blue-900/20 dark:text-gray-400 dark:hover:text-blue-400',
              'hover:cursor-pointer',
              {
                'hover:bg-orange-100 hover:text-orange-600 hover:border-orange-300 dark:hover:bg-orange-900/20 dark:hover:text-orange-400 dark:hover:border-orange-400':
                  isDevolutionMode,
                'hover:bg-blue-100 hover:text-blue-600 hover:border-blue-300 dark:bg-blue-900/20 dark:hover:text-blue-400 dark:hover:border-blue-400':
                  !isDevolutionMode,
              }
            )}
          >
            {isDevolutionMode ? (
              <Undo2 className='w-3 h-3' />
            ) : (
              <Atom className='w-3 h-3' />
            )}
          </button>
        </CursorTooltip>
      </div>
    );
  }

  // For multiple evolutions, render the dropdown component
  return (
    <div className='absolute inset-y-0 right-4 flex items-center'>
      <EvolutionDropdown
        availableEvolutions={availableEvolutions}
        onSelectEvolution={handleEvolution}
        isLoadingEvolutions={isLoadingEvolutions}
      />
    </div>
  );
};
