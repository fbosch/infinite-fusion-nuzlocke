'use client';

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import { useState, useMemo } from 'react';
import { X, MapPin, Search, Dna, ArrowUpDown } from 'lucide-react';
import { getLocations, type Location } from '@/loaders/locations';
import { type PokemonOptionType } from '@/loaders/pokemon';
import { getActivePlaythrough } from '@/stores/playthroughs';
import { PokemonSprite } from '../PokemonSprite';
import { clsx } from 'clsx';

interface LocationSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocationId: string;
  onSelectLocation: (
    targetLocationId: string,
    targetField: 'head' | 'body'
  ) => void;
  encounterData: {
    head?: PokemonOptionType | null;
    body?: PokemonOptionType | null;
    artworkVariant?: string;
  } | null;
  moveTargetField: 'head' | 'body';
}

interface LocationItemProps {
  location: Location;
  selectedTargetField: 'head' | 'body';
  currentLocationId: string;
  moveTargetField: 'head' | 'body';
  onSelect: (location: Location) => void;
}

export { LocationSelector };

function LocationItem({
  location,
  selectedTargetField,
  currentLocationId,
  moveTargetField,
  onSelect,
}: LocationItemProps) {
  // Helper function to check if a target slot has an existing Pokemon
  const getSlotPokemon = (locationId: string, field: 'head' | 'body') => {
    const activePlaythrough = getActivePlaythrough();
    const targetEncounter = activePlaythrough?.encounters?.[locationId];
    return targetEncounter
      ? field === 'head'
        ? targetEncounter.head
        : targetEncounter.body
      : null;
  };

  const handleSelect = () => {
    onSelect(location);
  };

  const existingPokemon = getSlotPokemon(location.id, selectedTargetField);
  const otherFieldPokemon = getSlotPokemon(
    location.id,
    selectedTargetField === 'head' ? 'body' : 'head'
  );

  const renderActionPreview = () => {
    if (existingPokemon) {
      // This is a swap - the existing Pokemon will be moved to the source location
      const activePlaythrough = getActivePlaythrough();
      const sourceEncounter =
        activePlaythrough?.encounters?.[currentLocationId];
      const remainingPokemon = sourceEncounter
        ? moveTargetField === 'head'
          ? sourceEncounter.body
          : sourceEncounter.head
        : null;

      // After the swap, check if there will be a fusion at the target location
      const willCreateFusionAtTarget = otherFieldPokemon;

      // After the swap, check if there will be a fusion at the source location
      const willCreateFusionAtSource = remainingPokemon;

      return (
        <div className='space-y-3 mt-2'>
          <div className='flex items-center space-x-4'>
            <div className='size-5 flex justify-center items-center flex-shrink-0'>
              <PokemonSprite pokemonId={existingPokemon.id} />
            </div>
            <p className='text-xs text-amber-600 dark:text-amber-400 font-medium flex gap-x-1'>
              <ArrowUpDown className='w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0' />
              <span>
                Will swap with {existingPokemon.name} ({selectedTargetField})
              </span>
            </p>
          </div>

          {willCreateFusionAtTarget && (
            <div className='flex items-center space-x-4'>
              <div className='size-5 flex justify-center items-center flex-shrink-0'>
                <PokemonSprite pokemonId={otherFieldPokemon.id} />
              </div>
              <p className='text-xs text-purple-600 dark:text-purple-400 font-medium flex gap-x-1'>
                <Dna className='w-4 h-4 text-purple-500 flex-shrink-0' />
                <span>Will fuse with {otherFieldPokemon.name} here</span>
              </p>
            </div>
          )}

          {willCreateFusionAtSource && (
            <div className='flex items-center space-x-4'>
              <div className='size-5 flex justify-center items-center flex-shrink-0'>
                <PokemonSprite pokemonId={remainingPokemon.id} />
              </div>
              <p className='text-xs text-green-600 dark:text-green-400 font-medium flex gap-x-1'>
                <Dna className='w-4 h-4 text-green-500 flex-shrink-0' />
                <span>
                  {existingPokemon.name} will fuse with {remainingPokemon.name}{' '}
                  at source
                </span>
              </p>
            </div>
          )}
        </div>
      );
    }

    // Check if moving here will create a fusion (no existing Pokemon in target slot)
    if (otherFieldPokemon) {
      return (
        <div className='flex items-center space-x-4 mt-2'>
          <div className='size-5 flex justify-center items-center flex-shrink-0'>
            <PokemonSprite pokemonId={otherFieldPokemon.id} />
          </div>
          <p className='text-xs text-purple-600 dark:text-purple-400 font-medium flex gap-x-1'>
            <Dna className='w-4 h-4 text-purple-500 flex-shrink-0' />
            <span>Will fuse with {otherFieldPokemon.name}</span>
          </p>
        </div>
      );
    }

    return null; // we don't need redundant text for this
  };

  return (
    <button
      type='button'
      onClick={handleSelect}
      className='w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0 cursor-pointer'
    >
      <div className='flex items-start space-x-3'>
        <MapPin className='h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0' />
        <div className='flex-1 min-w-0'>
          <p className='text-sm font-medium text-gray-900 dark:text-white truncate'>
            {location.name}
          </p>
          <p className='text-xs text-gray-500 dark:text-gray-400 truncate'>
            {location.region} • {location.description}
          </p>
          {renderActionPreview()}
        </div>
      </div>
    </button>
  );
}

function LocationSelector({
  isOpen,
  onClose,
  currentLocationId,
  onSelectLocation,
  encounterData,
  moveTargetField,
}: LocationSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTargetField, setSelectedTargetField] = useState<
    'head' | 'body'
  >(moveTargetField);

  // Get all locations except the current one
  const availableLocations = useMemo(() => {
    const allLocations = getLocations();
    return allLocations.filter(location => location.id !== currentLocationId);
  }, [currentLocationId]);

  // Filter locations based on search query
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) {
      return availableLocations;
    }

    const query = searchQuery.toLowerCase();
    return availableLocations.filter(
      location =>
        location.name.toLowerCase().includes(query) ||
        location.region.toLowerCase().includes(query) ||
        location.description.toLowerCase().includes(query)
    );
  }, [availableLocations, searchQuery]);

  const handleLocationSelect = (location: Location) => {
    onSelectLocation(location.id, selectedTargetField);
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  // Determine what Pokemon is being moved
  const movingPokemon = useMemo(() => {
    if (!encounterData) return null;

    if (moveTargetField === 'head' && encounterData.head) {
      return encounterData.head;
    }
    if (moveTargetField === 'body' && encounterData.body) {
      return encounterData.body;
    }
    return encounterData.head || encounterData.body;
  }, [encounterData, moveTargetField]);

  const isFusion = encounterData?.head && encounterData?.body;
  const isMovingEntireFusion = isFusion && moveTargetField === 'head';

  return (
    <Dialog open={isOpen} onClose={handleClose} className='relative z-50 group'>
      <DialogBackdrop
        transition
        className='fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[2px] data-closed:opacity-0 data-enter:opacity-100'
        aria-hidden='true'
      />

      <div className='fixed inset-0 flex w-screen items-center justify-center p-4'>
        <DialogPanel
          transition
          className={clsx(
            'w-full max-w-lg max-h-[80vh] space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6',
            'transition duration-150 ease-out data-closed:opacity-0 data-closed:scale-98'
          )}
        >
          <div className='flex items-center justify-between'>
            <DialogTitle className='text-xl font-semibold text-gray-900 dark:text-white'>
              Move Pokemon to Location
            </DialogTitle>
            <button
              onClick={handleClose}
              className={clsx(
                'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2',
                'p-1 rounded-md transition-colors cursor-pointer'
              )}
              aria-label='Close modal'
            >
              <X className='h-5 w-5' />
            </button>
          </div>

          {/* Pokemon being moved info */}
          {movingPokemon && (
            <div className='p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'>
              <div className='flex items-center space-x-3'>
                {isMovingEntireFusion ? (
                  <div className='flex items-center space-x-1'>
                    {encounterData?.head && (
                      <div className='w-6 h-6 flex justify-center items-center flex-shrink-0'>
                        <PokemonSprite pokemonId={encounterData.head.id} />
                      </div>
                    )}
                    {encounterData?.body && (
                      <div className='w-6 h-6 flex justify-center items-center flex-shrink-0'>
                        <PokemonSprite pokemonId={encounterData.body.id} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className='w-6 h-6 flex justify-center items-center flex-shrink-0'>
                    <PokemonSprite pokemonId={movingPokemon.id} />
                  </div>
                )}
                <p className='text-sm font-medium text-gray-900 dark:text-white'>
                  {isMovingEntireFusion ? (
                    <>
                      Moving entire fusion: {encounterData?.head?.name}/
                      {encounterData?.body?.name}
                    </>
                  ) : (
                    <>
                      Moving: {movingPokemon.name} (
                      {moveTargetField === 'head' ? 'Head' : 'Body'})
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Target field selector for fusions */}
          {!isMovingEntireFusion && (
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Move to slot:
              </label>
              <div className='flex space-x-2'>
                <button
                  type='button'
                  onClick={() => setSelectedTargetField('head')}
                  className={clsx(
                    'flex-1 px-3 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer',
                    selectedTargetField === 'head'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                  )}
                >
                  Head Slot
                </button>
                <button
                  type='button'
                  onClick={() => setSelectedTargetField('body')}
                  className={clsx(
                    'flex-1 px-3 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer',
                    selectedTargetField === 'body'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                  )}
                >
                  Body Slot
                </button>
              </div>
            </div>
          )}

          {/* Search input */}
          <div className='relative'>
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <Search className='h-4 w-4 text-gray-400' />
            </div>
            <input
              type='text'
              placeholder='Search locations...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white'
            />
          </div>

          {/* Locations list */}
          <div className='h-[50vh] min-h-96 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg scrollbar-thin'>
            {filteredLocations.length === 0 ? (
              <div className='p-4 text-center text-gray-500 dark:text-gray-400'>
                {searchQuery.trim()
                  ? 'No locations found matching your search.'
                  : 'No available locations.'}
              </div>
            ) : (
              filteredLocations.map(location => (
                <LocationItem
                  key={location.id}
                  location={location}
                  selectedTargetField={selectedTargetField}
                  currentLocationId={currentLocationId}
                  moveTargetField={moveTargetField}
                  onSelect={handleLocationSelect}
                />
              ))
            )}
          </div>

          <div className='flex justify-end'>
            <button
              type='button'
              onClick={handleClose}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer'
            >
              Cancel
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
