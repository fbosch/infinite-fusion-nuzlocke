'use client';

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import { useState, useMemo, useCallback } from 'react';
import { X, MapPin, Search, Dna, ArrowUpDown } from 'lucide-react';
import {
  type CombinedLocation,
  getLocationsSortedWithCustom,
} from '@/loaders/locations';
import { type PokemonOptionType, isEggId } from '@/loaders/pokemon';
import {
  getActivePlaythrough,
  useCustomLocations,
} from '@/stores/playthroughs';
import { PokemonSprite } from '../PokemonSprite';
import BodyIcon from '@/assets/images/body.svg';
import HeadIcon from '@/assets/images/head.svg';
import { clsx } from 'clsx';
import { canFuse } from '@/utils/pokemonPredicates';
import { TypePills } from '@/components/TypePills';
import {
  useFusionTypesFromPokemon,
  type UseFusionTypesResult,
} from '@/hooks/useFusionTypes';

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
  location: CombinedLocation;
  selectedTargetField: 'head' | 'body';
  currentLocationId: string;
  moveTargetField: 'head' | 'body';
  onSelect: (location: CombinedLocation) => void;
  movingPokemon: PokemonOptionType | null;
}

interface ActionPreviewProps {
  existingPokemon: PokemonOptionType | null;
  otherFieldPokemon: PokemonOptionType | null;
  remainingPokemon: PokemonOptionType | null;
  movingPokemon: PokemonOptionType | null;
  targetLocationId: string;
  sourceLocationId: string;
  selectedTargetField: 'head' | 'body';
  sourceMoveTargetField: 'head' | 'body';
}

export { LocationSelector };

// Helper function to get Pokemon in a specific slot
function getSlotPokemon(
  locationId: string,
  field: 'head' | 'body'
): PokemonOptionType | null {
  const activePlaythrough = getActivePlaythrough();
  const targetEncounter = activePlaythrough?.encounters?.[locationId];
  return targetEncounter
    ? field === 'head'
      ? targetEncounter.head
      : targetEncounter.body
    : null;
}

// Reusable component for action preview items
function ActionPreviewItem({
  pokemon,
  icon: Icon,
  iconColor,
  text,
  types,
}: {
  pokemon: PokemonOptionType;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  text: string;
  types: UseFusionTypesResult;
}) {
  return (
    <div className='flex items-center space-x-4'>
      <div className='size-4 flex justify-center items-center flex-shrink-0'>
        <PokemonSprite pokemonId={pokemon.id} generation='gen7' />
      </div>
      <p className={`text-xs font-medium flex gap-x-1 ${iconColor}`}>
        <Icon className={`w-3 h-3 ${iconColor} flex-shrink-0`} />
        <span>{text}</span>
      </p>
      {types.primary && (
        <div className='ml-auto'>
          <TypePills
            primary={types.primary}
            secondary={types.secondary}
            size='xs'
            showTooltip
          />
        </div>
      )}
    </div>
  );
}

// Component for rendering action preview (swap/fusion indicators)
function ActionPreview({
  existingPokemon,
  otherFieldPokemon,
  remainingPokemon,
  movingPokemon,
  targetLocationId: _targetLocationId, // eslint-disable-line @typescript-eslint/no-unused-vars
  sourceLocationId: _sourceLocationId, // eslint-disable-line @typescript-eslint/no-unused-vars
  selectedTargetField,
  sourceMoveTargetField,
}: ActionPreviewProps) {
  // Compute target and source post-move states for typing previews
  const { targetHeadAfter, targetBodyAfter } = useMemo(() => {
    const headAfter =
      selectedTargetField === 'head' ? movingPokemon : otherFieldPokemon;
    const bodyAfter =
      selectedTargetField === 'body' ? movingPokemon : otherFieldPokemon;
    return { targetHeadAfter: headAfter, targetBodyAfter: bodyAfter };
  }, [selectedTargetField, movingPokemon, otherFieldPokemon]);

  const { sourceHeadAfter, sourceBodyAfter } = useMemo(() => {
    const headAfter =
      sourceMoveTargetField === 'head' ? existingPokemon : remainingPokemon;
    const bodyAfter =
      sourceMoveTargetField === 'body' ? existingPokemon : remainingPokemon;
    return { sourceHeadAfter: headAfter, sourceBodyAfter: bodyAfter };
  }, [existingPokemon, remainingPokemon, sourceMoveTargetField]);

  // Resolve typings with fusion hook (falls back to single when one side is missing)
  const existingTypes = useFusionTypesFromPokemon(existingPokemon, null, false);

  // Compute fusion types conditionally but always at the top level
  const targetFusionTypes = useFusionTypesFromPokemon(
    targetHeadAfter,
    targetBodyAfter,
    Boolean(
      targetHeadAfter &&
        targetBodyAfter &&
        canFuse(targetHeadAfter, targetBodyAfter)
    )
  );
  const sourceFusionTypes = useFusionTypesFromPokemon(
    sourceHeadAfter,
    sourceBodyAfter,
    Boolean(
      sourceHeadAfter &&
        sourceBodyAfter &&
        canFuse(sourceHeadAfter, sourceBodyAfter)
    )
  );

  if (!existingPokemon && !otherFieldPokemon) return null;

  if (existingPokemon) {
    // This is a swap operation - types are already computed above
    return (
      <div className='space-y-2.5 mt-2'>
        <ActionPreviewItem
          pokemon={existingPokemon}
          icon={ArrowUpDown}
          iconColor='text-amber-600 dark:text-amber-400'
          text={`Will swap with ${existingPokemon.name}`}
          types={existingTypes}
        />

        {targetFusionTypes.primary && otherFieldPokemon && (
          <ActionPreviewItem
            pokemon={otherFieldPokemon}
            icon={Dna}
            iconColor='text-purple-600 dark:text-purple-400'
            text={`Will fuse with ${otherFieldPokemon.name} here`}
            types={targetFusionTypes}
          />
        )}

        {sourceFusionTypes.primary && remainingPokemon && (
          <ActionPreviewItem
            pokemon={remainingPokemon}
            icon={Dna}
            iconColor='text-green-600 dark:text-green-400'
            text={`${existingPokemon.name} will fuse with ${remainingPokemon.name} at source`}
            types={sourceFusionTypes}
          />
        )}
      </div>
    );
  }

  // Simple fusion case (no existing Pokemon in target slot): simulate post-move target
  if (movingPokemon && otherFieldPokemon) {
    // Only show if fusion types were computed (meaning fusion is possible)
    if (!targetFusionTypes.primary) return null;
    return (
      <ActionPreviewItem
        pokemon={otherFieldPokemon}
        icon={Dna}
        iconColor='text-purple-600 dark:text-purple-400'
        text={`Will fuse with ${otherFieldPokemon.name}`}
        types={targetFusionTypes}
      />
    );
  }

  return null;
}

// Individual location item component
function LocationItem({
  location,
  selectedTargetField,
  currentLocationId,
  moveTargetField,
  onSelect,
  movingPokemon,
}: LocationItemProps) {
  const handleSelect = useCallback(() => {
    onSelect(location);
  }, [location, onSelect]);

  const existingPokemon = useMemo(
    () => getSlotPokemon(location.id, selectedTargetField),
    [location.id, selectedTargetField]
  );

  const otherFieldPokemon = useMemo(
    () =>
      getSlotPokemon(
        location.id,
        selectedTargetField === 'head' ? 'body' : 'head'
      ),
    [location.id, selectedTargetField]
  );

  const remainingPokemon = useMemo(() => {
    if (!existingPokemon) return null;
    const activePlaythrough = getActivePlaythrough();
    const sourceEncounter = activePlaythrough?.encounters?.[currentLocationId];
    return sourceEncounter
      ? moveTargetField === 'head'
        ? sourceEncounter.body
        : sourceEncounter.head
      : null;
  }, [existingPokemon, currentLocationId, moveTargetField]);

  // Check if this move would result in egg fusion
  const wouldCreateEggFusion = useMemo(() => {
    if (!movingPokemon) return false;

    // Check if the Pokemon being moved is an egg
    const isMovingPokemonEgg = isEggId(movingPokemon.id);

    // Get the encounter at the target location to check fusion status
    const activePlaythrough = getActivePlaythrough();
    const targetEncounter = activePlaythrough?.encounters?.[location.id];

    // If the target encounter is not a fusion (isFusion = false),
    // then no fusion will be created regardless of what's in the body slot
    // UNLESS we're moving an egg or there's an egg in the target location
    if (targetEncounter && !targetEncounter.isFusion) {
      // For non-fusion encounters, only prevent if there's an egg involved
      const headPokemon = targetEncounter.head;
      const bodyPokemon = targetEncounter.body;

      // If moving an egg and there's any Pokemon in the target location
      if (isMovingPokemonEgg && (headPokemon || bodyPokemon)) {
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
    const oppositeFieldPokemon = getSlotPokemon(
      location.id,
      selectedTargetField === 'head' ? 'body' : 'head'
    );

    // If moving Pokemon is an egg and there's a Pokemon in the opposite slot, it would create egg fusion
    if (isMovingPokemonEgg && oppositeFieldPokemon) {
      return true;
    }

    // If there's an egg in the opposite slot and we're moving a Pokemon, it would create egg fusion
    if (oppositeFieldPokemon && isEggId(oppositeFieldPokemon.id)) {
      return true;
    }

    return false;
  }, [movingPokemon, location.id, selectedTargetField]);

  return (
    <div
      role='listitem'
      className={clsx(
        'group hover:bg-gray-50 dark:hover:bg-gray-700 focus-within:bg-gray-50 dark:focus-within:bg-gray-700',
        'last:border-b-0 border-b border-gray-200 dark:border-gray-600',
        'last:rounded-b-lg'
      )}
    >
      <button
        type='button'
        onClick={handleSelect}
        disabled={wouldCreateEggFusion}
        className={clsx('w-full text-left p-3 focus:outline-none', {
          'cursor-not-allowed opacity-50': wouldCreateEggFusion,
        })}
      >
        <div className='flex items-start space-x-3'>
          <MapPin className='h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0' />
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-medium text-gray-900 dark:text-white truncate'>
              {location.name}
            </p>
            <p className='text-xs text-gray-500 dark:text-gray-400 truncate'>
              {'isCustom' in location && location.isCustom
                ? 'Custom location'
                : `${location.region} • ${location.description}`}
            </p>
            {wouldCreateEggFusion && (
              <p className='text-xs text-red-500 dark:text-red-400 mt-1'>
                Cannot fuse with egg
              </p>
            )}
            {!wouldCreateEggFusion && (
              <ActionPreview
                existingPokemon={existingPokemon}
                otherFieldPokemon={otherFieldPokemon}
                remainingPokemon={remainingPokemon}
                movingPokemon={movingPokemon}
                targetLocationId={location.id}
                sourceLocationId={currentLocationId}
                selectedTargetField={selectedTargetField}
                sourceMoveTargetField={moveTargetField}
              />
            )}
          </div>
        </div>
      </button>
    </div>
  );
}

// Component for displaying information about the Pokemon being moved
function MovingPokemonInfo({
  movingPokemon,
  moveTargetField,
  isFusion,
}: {
  movingPokemon: PokemonOptionType;
  moveTargetField: 'head' | 'body';
  isFusion: boolean;
}) {
  const fusionTypes = useFusionTypesFromPokemon(movingPokemon, null, false);

  return (
    <div className='p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'>
      <div className='flex items-center space-x-3'>
        <div className='w-6 h-6 flex justify-center items-center flex-shrink-0'>
          <PokemonSprite pokemonId={movingPokemon.id} generation='gen7' />
        </div>
        <p className='text-sm font-medium text-gray-900 dark:text-white'>
          Moving: {movingPokemon.name}
          {isFusion && <> ({moveTargetField === 'head' ? 'Head' : 'Body'})</>}
        </p>
        <div className='ml-auto'>
          {fusionTypes.primary && (
            <TypePills
              primary={fusionTypes.primary}
              secondary={fusionTypes.secondary}
              size='md'
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Component for target field selection (head/body)
function TargetFieldSelector({
  selectedTargetField,
  onTargetFieldChange,
}: {
  selectedTargetField: 'head' | 'body';
  onTargetFieldChange: (field: 'head' | 'body') => void;
}) {
  return (
    <div>
      <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
        Move to slot:
      </label>
      <div className='flex space-x-2'>
        <button
          type='button'
          onClick={() => onTargetFieldChange('head')}
          className={clsx(
            'flex-1 px-3 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
            'justify-center flex items-center gap-x-1',
            selectedTargetField === 'head'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
          )}
        >
          <HeadIcon className='size-5' />
          <span className='mr-2.5'>Head Slot</span>
        </button>
        <button
          type='button'
          onClick={() => onTargetFieldChange('body')}
          className={clsx(
            'flex-1 px-3 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
            'justify-center flex items-center gap-x-1',
            selectedTargetField === 'body'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
          )}
        >
          <BodyIcon className='size-5' />
          <span className='mr-2.5'>Body Slot</span>
        </button>
      </div>
    </div>
  );
}

// Custom hook for managing location selector logic
function useLocationSelector({
  currentLocationId,
  moveTargetField,
  encounterData,
}: {
  currentLocationId: string;
  moveTargetField: 'head' | 'body';
  encounterData: LocationSelectorProps['encounterData'];
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTargetField, setSelectedTargetField] = useState<
    'head' | 'body'
  >(moveTargetField);

  // Get custom locations and create merged locations
  const customLocations = useCustomLocations();

  // Get all locations except the current one
  const availableLocations = useMemo(() => {
    const allLocations = getLocationsSortedWithCustom(customLocations);
    return allLocations.filter(location => location.id !== currentLocationId);
  }, [customLocations, currentLocationId]);

  // Filter locations based on search query (including Pokemon names)
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) {
      return availableLocations;
    }

    const query = searchQuery.toLowerCase();
    const activePlaythrough = getActivePlaythrough();

    return availableLocations.filter(location => {
      // Search by location properties
      const locationMatch =
        location.name.toLowerCase().includes(query) ||
        location.region.toLowerCase().includes(query) ||
        location.description.toLowerCase().includes(query);

      if (locationMatch) return true;

      // Search by Pokemon names at this location
      const encounter = activePlaythrough?.encounters?.[location.id];
      if (encounter) {
        const headPokemon = encounter.head;
        const bodyPokemon = encounter.body;

        const pokemonMatch =
          headPokemon?.name?.toLowerCase().includes(query) ||
          headPokemon?.nickname?.toLowerCase().includes(query) ||
          bodyPokemon?.name?.toLowerCase().includes(query) ||
          bodyPokemon?.nickname?.toLowerCase().includes(query);

        if (pokemonMatch) return true;
      }

      return false;
    });
  }, [availableLocations, searchQuery]);

  // Determine what Pokemon is being moved
  const movingPokemon = useMemo(() => {
    if (!encounterData) return null;

    if (moveTargetField === 'head' && encounterData.head) {
      return encounterData.head;
    }
    if (moveTargetField === 'body' && encounterData.body) {
      return encounterData.body;
    }
    return encounterData.head ?? encounterData.body ?? null;
  }, [encounterData, moveTargetField]);

  // Check if the Pokemon being moved is an egg
  const isMovingPokemonEgg = useMemo(() => {
    return movingPokemon ? isEggId(movingPokemon.id) : false;
  }, [movingPokemon]);

  // Determine if this should be treated as a fusion
  // Disable fusion mode when moving an egg to the head slot
  const isFusion = useMemo(() => {
    if (!encounterData?.head || !encounterData?.body) return false;

    // If moving an egg to head slot, disable fusion mode
    if (moveTargetField === 'head' && isMovingPokemonEgg) {
      return false;
    }

    return true;
  }, [
    encounterData?.head,
    encounterData?.body,
    moveTargetField,
    isMovingPokemonEgg,
  ]);

  const resetState = useCallback(() => {
    setSearchQuery('');
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    selectedTargetField,
    setSelectedTargetField,
    filteredLocations,
    movingPokemon,
    isFusion,
    resetState,
  };
}

// Main LocationSelector component
function LocationSelector({
  isOpen,
  onClose,
  currentLocationId,
  onSelectLocation,
  encounterData,
  moveTargetField,
}: LocationSelectorProps) {
  const {
    searchQuery,
    setSearchQuery,
    selectedTargetField,
    setSelectedTargetField,
    filteredLocations,
    movingPokemon,
    isFusion,
    resetState,
  } = useLocationSelector({
    currentLocationId,
    moveTargetField,
    encounterData,
  });

  const handleLocationSelect = useCallback(
    (location: CombinedLocation) => {
      onSelectLocation(location.id, selectedTargetField);
      resetState();
      onClose();
    },
    [onSelectLocation, selectedTargetField, resetState, onClose]
  );

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

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

          {movingPokemon && (
            <MovingPokemonInfo
              movingPokemon={movingPokemon}
              moveTargetField={moveTargetField}
              isFusion={isFusion}
            />
          )}

          <TargetFieldSelector
            selectedTargetField={selectedTargetField}
            onTargetFieldChange={setSelectedTargetField}
          />

          <div className='relative'>
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <Search className='h-4 w-4 text-gray-400' />
            </div>
            <input
              type='text'
              placeholder='Search locations or Pokemon names...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white'
            />
          </div>

          <div className='h-[46vh] min-h-96 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg scrollbar-thin'>
            {filteredLocations.length === 0 ? (
              <div className='p-4 text-center text-gray-500 dark:text-gray-400'>
                {searchQuery.trim()
                  ? 'No locations found matching your search for locations or Pokemon names.'
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
                  movingPokemon={movingPokemon}
                />
              ))
            )}
          </div>

          <div className='flex justify-end'>
            <button
              type='button'
              onClick={handleClose}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              Cancel
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
