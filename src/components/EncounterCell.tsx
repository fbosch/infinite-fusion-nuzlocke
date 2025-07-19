'use client';

import React from 'react';
import { Dna, DnaOff } from 'lucide-react';
import { PokemonCombobox } from './PokemonCombobox';
import type { PokemonOption } from '@/loaders/pokemon';
import clsx from 'clsx';

// Type for encounter data with fusion status
interface EncounterData {
  head: PokemonOption | null;
  body: PokemonOption | null;
  isFusion: boolean;
}

interface EncounterCellProps {
  routeId: number;
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
  encounterData,
  onEncounterSelect,
  onFusionToggle,
}: EncounterCellProps) {
  const selectedPokemon = encounterData.isFusion
    ? encounterData.body
    : encounterData.head;
  const isFusion = encounterData.isFusion;

  return (
    <td
      className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'
      role='cell'
    >
      <div className='flex flex-row justify-center gap-2'>
        <div className='flex-1'>
          {isFusion ? (
            <div className='flex items-start gap-2'>
              <div className='flex-1'>
                <span className='text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1'>
                  Head:
                </span>
                <PokemonCombobox
                  routeId={routeId}
                  value={encounterData.head}
                  onChange={pokemon =>
                    onEncounterSelect(routeId, pokemon, 'head')
                  }
                  placeholder='Select head Pokemon'
                  comboboxId={`${routeId}-head`}
                />
              </div>
              <div className='flex-1'>
                <span className='text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1'>
                  Body:
                </span>
                <PokemonCombobox
                  routeId={routeId}
                  value={encounterData.body}
                  onChange={pokemon =>
                    onEncounterSelect(routeId, pokemon, 'body')
                  }
                  placeholder='Select body Pokemon'
                  comboboxId={`${routeId}-body`}
                />
              </div>
            </div>
          ) : (
            <PokemonCombobox
              routeId={routeId}
              value={selectedPokemon}
              onChange={pokemon => onEncounterSelect(routeId, pokemon)}
              comboboxId={`${routeId}-single`}
            />
          )}
        </div>
        <button
          type='button'
          onClick={() => onFusionToggle(routeId)}
          className={clsx(
            'group',
            'size-12.25 flex items-center justify-center self-end',
            'p-2 rounded-md border transition-all duration-200 cursor-pointer',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed bg-white',
            {
              'dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 border-gray-300 hover:bg-red-500 hover:border-red-600':
                isFusion,
              'bg-white border-gray-300 text-gray-700 hover:bg-green-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-green-700':
                !isFusion,
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