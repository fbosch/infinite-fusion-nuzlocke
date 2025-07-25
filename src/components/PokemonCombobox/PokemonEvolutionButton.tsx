'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Atom, ChevronDown, Undo2 } from 'lucide-react';
import clsx from 'clsx';
import Image from 'next/image';
import {
  getPokemonEvolutionIds,
  getPokemonPreEvolutionId,
  getPokemonByNationalDexId,
  type PokemonOption,
} from '@/loaders/pokemon';
import { getPokemonSpriteUrlFromOption } from './PokemonCombobox';

interface PokemonEvolutionButtonProps {
  value: PokemonOption | null | undefined;
  onChange: (value: PokemonOption | null) => void;
  shouldLoad?: boolean;
}

export const PokemonEvolutionButton: React.FC<PokemonEvolutionButtonProps> = ({
  value,
  onChange,
  shouldLoad = false,
}) => {
  const [availableEvolutions, setAvailableEvolutions] = useState<
    PokemonOption[]
  >([]);
  const [availablePreEvolution, setAvailablePreEvolution] =
    useState<PokemonOption | null>(null);
  const [isLoadingEvolutions, setIsLoadingEvolutions] = useState(false);
  const [showEvolutionMenu, setShowEvolutionMenu] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const evolutionMenuRef = useRef<HTMLDivElement>(null);

  const hasEvolutions = availableEvolutions.length > 0;
  const hasPreEvolution = !!availablePreEvolution;
  const isDevolutionMode =
    (isShiftPressed && hasPreEvolution) || (!hasEvolutions && hasPreEvolution);

  // Track shift key state
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Close evolution menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        evolutionMenuRef.current &&
        !evolutionMenuRef.current.contains(event.target as Node)
      ) {
        setShowEvolutionMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle evolution/devolution selection
  const handleEvolution = useCallback(
    (evolutionPokemon?: PokemonOption, isDevolution = false) => {
      if (evolutionPokemon) {
        // Specific evolution/devolution selected
        const evolvedPokemon: PokemonOption = {
          ...value,
          ...evolutionPokemon,
        };
        onChange(evolvedPokemon);
        setShowEvolutionMenu(false);
      } else if (isDevolution && availablePreEvolution) {
        // Devolution - go to pre-evolution
        const devolvedPokemon: PokemonOption = {
          ...value,
          ...availablePreEvolution,
        };
        onChange(devolvedPokemon);
      } else if (availableEvolutions.length === 1) {
        // Single evolution - directly evolve
        const evolution = availableEvolutions.at(0)!;
        const evolvedPokemon: PokemonOption = {
          ...value,
          ...evolution,
        };
        onChange(evolvedPokemon);
      } else if (availableEvolutions.length > 1) {
        // Multiple evolutions - show menu
        setShowEvolutionMenu(!showEvolutionMenu);
      }
    },
    [
      availableEvolutions,
      availablePreEvolution,
      value,
      onChange,
      showEvolutionMenu,
    ]
  );

  // Handle evolution button click
  const handleEvolutionButtonClick = useCallback(() => {
    handleEvolution(undefined, isDevolutionMode);
  }, [handleEvolution, isDevolutionMode]);

  // Load evolution and pre-evolution data when value changes
  useEffect(() => {
    if (!shouldLoad) {
      return;
    }

    const loadEvolutionData = async () => {
      if (!value?.id) {
        setAvailableEvolutions([]);
        setAvailablePreEvolution(null);
        return;
      }

      setIsLoadingEvolutions(true);
      try {
        // Load evolutions
        const evolutionIds = await getPokemonEvolutionIds(value.id);
        const evolutions: PokemonOption[] = [];

        for (const evolutionId of evolutionIds) {
          const evolutionPokemon = await getPokemonByNationalDexId(evolutionId);
          if (evolutionPokemon) {
            evolutions.push({
              id: evolutionPokemon.id,
              name: evolutionPokemon.name,
              nationalDexId: evolutionPokemon.nationalDexId,
              originalLocation: value.originalLocation,
            });
          }
        }

        setAvailableEvolutions(evolutions);

        // Load pre-evolution
        const preEvolutionId = await getPokemonPreEvolutionId(value.id);
        if (preEvolutionId) {
          const preEvolutionPokemon =
            await getPokemonByNationalDexId(preEvolutionId);
          if (preEvolutionPokemon) {
            setAvailablePreEvolution({
              id: preEvolutionPokemon.id,
              name: preEvolutionPokemon.name,
              nationalDexId: preEvolutionPokemon.nationalDexId,
              originalLocation: value.originalLocation,
            });
          } else {
            setAvailablePreEvolution(null);
          }
        } else {
          setAvailablePreEvolution(null);
        }
      } catch (error) {
        console.error('Error loading evolution data:', error);
        setAvailableEvolutions([]);
        setAvailablePreEvolution(null);
      } finally {
        setIsLoadingEvolutions(false);
      }
    };

    loadEvolutionData();
  }, [value?.id, value?.originalLocation, shouldLoad]);

  // Don't render if no Pokemon is selected or no evolutions/devolutions available
  if (
    !value ||
    (availableEvolutions.length === 0 && !availablePreEvolution) ||
    isLoadingEvolutions
  ) {
    return null;
  }

  return (
    <div
      className='absolute inset-y-0 right-4 flex items-center'
      ref={evolutionMenuRef}
    >
      <div className='relative'>
        <button
          type='button'
          onClick={handleEvolutionButtonClick}
          disabled={isLoadingEvolutions}
          className={clsx(
            'flex items-center justify-center gap-1 px-2 py-1 rounded-md',
            'bg-gray-100 text-gray-600 text-xs font-medium',
            'border border-gray-300 dark:border-gray-600',
            'transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'dark:bg-gray-700 dark:text-gray-400',
            'hover:cursor-pointer',
            {
              'hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 dark:hover:border-orange-400 dark:hover:text-orange-400 dark:hover:bg-orange-900/20':
                isDevolutionMode,
              'bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:border-blue-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20':
                !isDevolutionMode,
            }
          )}
          title={
            isDevolutionMode
              ? `Devolve to ${availablePreEvolution.name}`
              : availableEvolutions.length === 1
                ? `Evolve to ${availableEvolutions[0].name}`
                : hasEvolutions
                  ? `Choose evolution (${availableEvolutions.length} options)`
                  : 'No evolutions available'
          }
        >
          {isDevolutionMode ? (
            <Undo2 className='w-3 h-3' />
          ) : (
            <Atom className='w-3 h-3' />
          )}
          {!isDevolutionMode && availableEvolutions.length > 1 && (
            <ChevronDown className='w-3 h-3' />
          )}
        </button>

        {/* Evolution dropdown menu */}
        {showEvolutionMenu &&
          availableEvolutions.length > 1 &&
          !isDevolutionMode && (
            <div
              className={clsx(
                'absolute top-full right-0 mt-1 py-1 min-w-48',
                'bg-white dark:bg-gray-800 rounded-md shadow-lg',
                'border border-gray-300 dark:border-gray-600',
                'z-50'
              )}
            >
              <div
                className={clsx(
                  'px-3 pb-2 pt-1 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600'
                )}
              >
                Choose Evolution
              </div>
              {availableEvolutions.map(evolution => (
                <button
                  key={evolution.id}
                  type='button'
                  title={`Evolve to ${evolution.name}`}
                  onClick={() => handleEvolution(evolution)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2 text-sm hover:cursor-pointer',
                    'hover:bg-gray-100 dark:hover:bg-gray-700',
                    'text-gray-900 dark:text-gray-100 text-left',
                    'focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700'
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
                  <span className='font-medium'>{evolution.name}</span>
                </button>
              ))}
            </div>
          )}
      </div>
    </div>
  );
};
