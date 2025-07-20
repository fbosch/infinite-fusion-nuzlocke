'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Atom, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import Image from 'next/image';
import {
  getPokemonEvolutionIds,
  getPokemonByNationalDexId,
  type PokemonOption,
} from '@/loaders/pokemon';
import { getPokemonNameMap } from '@/loaders';
import { getPokemonSpriteUrlFromOption } from './PokemonCombobox';

interface PokemonEvolutionButtonProps {
  value: PokemonOption | null | undefined;
  onChange: (value: PokemonOption | null) => void;
}

export const PokemonEvolutionButton: React.FC<PokemonEvolutionButtonProps> = ({
  value,
  onChange,
}) => {
  const [availableEvolutions, setAvailableEvolutions] = useState<
    PokemonOption[]
  >([]);
  const [isLoadingEvolutions, setIsLoadingEvolutions] = useState(false);
  const [showEvolutionMenu, setShowEvolutionMenu] = useState(false);
  const evolutionMenuRef = useRef<HTMLDivElement>(null);

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

  // Handle evolution selection
  const handleEvolution = useCallback(
    (evolutionPokemon?: PokemonOption) => {
      if (evolutionPokemon) {
        // Specific evolution selected
        const evolvedPokemon: PokemonOption = {
          ...evolutionPokemon,
          nickname: value?.nickname || '', // Preserve nickname
          originalLocation: value?.originalLocation, // Preserve original location
        };
        onChange(evolvedPokemon);
        setShowEvolutionMenu(false);
      } else if (availableEvolutions.length === 1) {
        // Single evolution - directly evolve
        const evolution = availableEvolutions[0];
        const evolvedPokemon: PokemonOption = {
          ...evolution,
          nickname: value?.nickname || '', // Preserve nickname
          originalLocation: value?.originalLocation, // Preserve original location
        };
        onChange(evolvedPokemon);
      } else if (availableEvolutions.length > 1) {
        // Multiple evolutions - show menu
        setShowEvolutionMenu(!showEvolutionMenu);
      }
    },
    [availableEvolutions, value?.nickname, value?.originalLocation, onChange, showEvolutionMenu]
  );

  // Handle evolution button click
  const handleEvolutionButtonClick = useCallback(() => {
    handleEvolution();
  }, [handleEvolution]);

  // Load evolution data when value changes
  useEffect(() => {
    const loadEvolutions = async () => {
      if (!value?.id) {
        setAvailableEvolutions([]);
        return;
      }

      setIsLoadingEvolutions(true);
      try {
        const evolutionIds = await getPokemonEvolutionIds(value.id);
        if (evolutionIds.length > 0) {
          const nameMap = await getPokemonNameMap();
          const evolutions: PokemonOption[] = [];

          for (const evolutionId of evolutionIds) {
            const evolutionPokemon =
              await getPokemonByNationalDexId(evolutionId);
            if (evolutionPokemon) {
              evolutions.push({
                id: evolutionPokemon.id,
                name: evolutionPokemon.name,
                nationalDexId: evolutionPokemon.nationalDexId,
                originalLocation: value?.originalLocation, // Preserve original location
              });
            }
          }

          setAvailableEvolutions(evolutions);
        } else {
          setAvailableEvolutions([]);
        }
      } catch (error) {
        console.error('Error loading evolutions:', error);
        setAvailableEvolutions([]);
      } finally {
        setIsLoadingEvolutions(false);
      }
    };

    loadEvolutions();
  }, [value?.id, value?.originalLocation]);

  // Don't render if no Pokemon is selected or no evolutions available
  if (!value || availableEvolutions.length === 0) {
    return null;
  }

  return (
    <div className='absolute inset-y-0 right-4 flex items-center' ref={evolutionMenuRef}>
      <div className='relative'>
        <button
          type='button'
          onClick={handleEvolutionButtonClick}
          disabled={isLoadingEvolutions}
          className={clsx(
            'flex items-center justify-center gap-1 px-2 py-1 rounded-md',
            'bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 text-xs font-medium',
            'border border-gray-300 hover:border-blue-300 dark:border-gray-600 dark:hover:border-blue-400',
            'transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'dark:bg-gray-700 dark:hover:bg-blue-900/20 dark:text-gray-400 dark:hover:text-blue-400',
            showEvolutionMenu &&
              'bg-blue-50 text-blue-600 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-400',
            'hover:cursor-pointer'
          )}
          title={
            availableEvolutions.length === 1
              ? `Evolve to ${availableEvolutions[0].name}`
              : `Choose evolution (${availableEvolutions.length} options)`
          }
        >
          {isLoadingEvolutions ? null : (
            <>
              <Atom className='w-3 h-3' />
              {availableEvolutions.length > 1 && (
                <ChevronDown className='w-3 h-3' />
              )}
            </>
          )}
        </button>

        {/* Evolution dropdown menu */}
        {showEvolutionMenu && availableEvolutions.length > 1 && (
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