'use client';

import React, {
  useState,
  useEffect,
  startTransition,
  useCallback,
} from 'react';
import clsx from 'clsx';
import {
  ChevronDown,
  Gift,
  Skull,
  ArrowUpDown,
  Computer,
  MoveRight,
  Home,
} from 'lucide-react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import {
  useFloating,
  autoUpdate,
  flip,
  FloatingPortal,
} from '@floating-ui/react';
import {
  type PokemonOptionType,
  type PokemonStatusType,
  PokemonStatus,
} from '@/loaders/pokemon';
import { match } from 'ts-pattern';
import PokeballIcon from '@/assets/images/pokeball.svg';
import EscapeIcon from '@/assets/images/escape-cloud.svg';
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

interface PokemonStatusInputProps {
  value: PokemonOptionType | null | undefined;
  onChange: (value: PokemonOptionType | null) => void;
  disabled?: boolean;
  dragPreview?: PokemonOptionType | null;
  locationId?: string;
  field?: 'head' | 'body';
}

const getStatusIcon = (status: PokemonStatusType) => {
  return match(status)
    .with(PokemonStatus.CAPTURED, () => (
      <PokeballIcon className='h-4 w-4 text-gray-600 dark:text-gray-300' />
    ))
    .with(PokemonStatus.RECEIVED, () => (
      <Gift className='h-4 w-4 text-gray-600 dark:text-gray-300' />
    ))
    .with(PokemonStatus.TRADED, () => (
      <ArrowUpDown className='h-4 w-4 text-gray-600 dark:text-gray-300' />
    ))
    .with(PokemonStatus.MISSED, () => (
      <EscapeIcon className='h-4 w-4 text-gray-600 dark:text-gray-300' />
    ))
    .with(PokemonStatus.STORED, () => (
      <Computer className='h-4 w-4 text-gray-600 dark:text-gray-300' />
    ))
    .with(PokemonStatus.DECEASED, () => (
      <Skull className='h-4 w-4 text-gray-600 dark:text-gray-300' />
    ))
    .otherwise(() => null);
};

export const PokemonStatusInput = ({
  value,
  onChange,
  disabled = false,
  dragPreview,
  locationId,
  field = 'head',
}: PokemonStatusInputProps) => {
  // Local status state for smooth selection
  const [localStatus, setLocalStatus] = useState(value?.status || null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  // Floating UI setup
  const { refs, floatingStyles, placement } = useFloating({
    placement: 'bottom-end',
    middleware: [flip()],
    whileElementsMounted: autoUpdate,
  });

  // Sync local status when value changes
  useEffect(() => {
    if (value?.status !== localStatus) {
      setLocalStatus(value?.status || null);
    }
  }, [value?.status, localStatus]);

  // Handle status selection
  const handleStatusSelect = (newStatus: PokemonStatusType) => {
    // Update local state immediately for responsive UI
    setLocalStatus(newStatus);

    if (value) {
      // Use startTransition to defer the state update
      startTransition(() => {
        const updatedPokemon: PokemonOptionType = {
          ...value,
          status: newStatus,
        };
        onChange(updatedPokemon);
      });
    }
  };

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

  // Get available locations (excluding current one)
  const availableLocations = locationId
    ? getLocations().filter(location => location.id !== locationId)
    : [];

  return (
    <>
      <Menu>
        {({ open }) => (
          <div className='relative'>
            <MenuButton
              ref={refs.setReference}
              className={clsx(
                'border-t-0 capitalize',
                'flex items-center justify-between px-4 py-3.5 text-sm border bg-white dark:text-gray-400 focus:outline-none focus-visible:ring-1',
                'focus:outline-none',
                'focus:ring-inset focus-visible:ring-blue-500 focus-visible:border-blue-500 disabled:cursor-not-allowed',
                'border-gray-300 dark:border-gray-600 dark:bg-gray-800 enabled:dark:text-white dark:focus-visible:ring-blue-400',
                'enabled:hover:bg-gray-50 dark:enabled:hover:bg-gray-700',
                'min-w-[140px] enabled:hover:cursor-pointer',
                dragPreview && 'opacity-60 pointer-events-none',
                {
                  'rounded-none border-t-0 rounded-b-none':
                    open && placement.startsWith('bottom'),
                  'rounded-br-md': open && placement.startsWith('top'),
                  'rounded-br-md rounded-t-none': !open,
                }
              )}
              disabled={!value || disabled}
            >
              <div className='flex items-center gap-2'>
                {(dragPreview?.status || localStatus) &&
                  getStatusIcon(
                    (dragPreview?.status || localStatus) as PokemonStatusType
                  )}
                <span>{dragPreview?.status || localStatus || 'Status'}</span>
              </div>
              <ChevronDown
                className='h-4 w-4 text-gray-400'
                aria-hidden='true'
              />
            </MenuButton>

            {open && (
              <FloatingPortal>
                <MenuItems
                  ref={refs.setFloating}
                  style={floatingStyles}
                  className={clsx(
                    'z-50 overflow-hidden text-base focus:outline-none sm:text-sm',
                    'bg-white dark:bg-gray-800',
                    'border-gray-300 dark:border-gray-600 border-1',
                    'min-w-[140px]',
                    {
                      'rounded-b-md border-t-0': placement.startsWith('bottom'),
                      'rounded-t-md': placement.startsWith('top'),
                    }
                  )}
                >
                  {Object.values(PokemonStatus).map(
                    (statusValue: PokemonStatusType) => (
                      <MenuItem key={statusValue}>
                        {({ focus }) => (
                          <button
                            onClick={() => handleStatusSelect(statusValue)}
                            className={clsx(
                              'group flex w-full items-center px-4 py-2 text-sm cursor-pointer',
                              'focus:outline-none text-left',
                              {
                                'bg-gray-100 dark:bg-gray-700 focus-visible:ring-1 focus-visible:ring-blue-500 ring-inset':
                                  focus,
                                'bg-gray-200 dark:bg-gray-600':
                                  (dragPreview?.status || localStatus) ===
                                    statusValue && !focus,
                              }
                            )}
                          >
                            <div className='flex items-center gap-2'>
                              {getStatusIcon(statusValue)}
                              <span>
                                {statusValue.charAt(0).toUpperCase() +
                                  statusValue.slice(1)}
                              </span>
                            </div>
                          </button>
                        )}
                      </MenuItem>
                    )
                  )}

                  {/* Add move options if we have a Pokemon and location */}
                  {value &&
                    locationId &&
                    (value.originalLocation !== locationId ||
                      availableLocations.length > 0) && (
                      <>
                        <div className='border-t border-gray-200 dark:border-gray-600 my-1' />

                        {/* Move to original location option */}
                        {value.originalLocation &&
                          value.originalLocation !== locationId && (
                            <MenuItem>
                              {({ focus }) => {
                                const originalLocation = getLocationById(
                                  value.originalLocation!
                                );
                                return (
                                  <button
                                    onClick={handleMoveToOriginalLocation}
                                    title={
                                      originalLocation?.name ||
                                      'Unknown Location'
                                    }
                                    className={clsx(
                                      'group flex w-full items-center px-4 py-2 text-sm cursor-pointer',
                                      'focus:outline-none text-left',
                                      {
                                        'bg-gray-100 dark:bg-gray-700 focus-visible:ring-1 focus-visible:ring-blue-500 ring-inset':
                                          focus,
                                      }
                                    )}
                                  >
                                    <div className='flex items-center gap-2'>
                                      <Home className='h-4 w-4 text-blue-500' />
                                      <span>Move to Original Location</span>
                                    </div>
                                  </button>
                                );
                              }}
                            </MenuItem>
                          )}

                        {/* Move to any location option */}
                        {availableLocations.length > 0 && (
                          <MenuItem>
                            {({ focus }) => (
                              <button
                                onClick={() => setIsMoveModalOpen(true)}
                                className={clsx(
                                  'group flex w-full items-center px-4 py-2 text-sm cursor-pointer',
                                  'focus:outline-none text-left',
                                  {
                                    'bg-gray-100 dark:bg-gray-700 focus-visible:ring-1 focus-visible:ring-blue-500 ring-inset':
                                      focus,
                                  }
                                )}
                              >
                                <div className='flex items-center gap-2'>
                                  <MoveRight className='h-4 w-4 text-emerald-500' />
                                  <span>Move to Location</span>
                                </div>
                              </button>
                            )}
                          </MenuItem>
                        )}
                      </>
                    )}
                </MenuItems>
              </FloatingPortal>
            )}
          </div>
        )}
      </Menu>

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
};
