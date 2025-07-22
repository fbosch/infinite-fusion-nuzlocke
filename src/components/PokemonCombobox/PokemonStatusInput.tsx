'use client';

import React, { useState, useEffect, startTransition } from 'react';
import clsx from 'clsx';
import {
  ChevronDown,
  Gift,
  Skull,
  ArrowUpDown,
  LocateOff,
  Computer,
  Check,
} from 'lucide-react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import {
  useFloating,
  autoUpdate,
  flip,
  FloatingPortal,
} from '@floating-ui/react';
import {
  type PokemonOption,
  type PokemonStatusType,
  PokemonStatus,
} from '@/loaders/pokemon';

interface PokemonStatusInputProps {
  value: PokemonOption | null | undefined;
  onChange: (value: PokemonOption | null) => void;
  disabled?: boolean;
  dragPreview?: PokemonOption | null;
}

export const PokemonStatusInput = ({
  value,
  onChange,
  disabled = false,
  dragPreview,
}: PokemonStatusInputProps) => {
  // Local status state for smooth selection
  const [localStatus, setLocalStatus] = useState(value?.status || null);

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

  // Helper function to get status icon
  const getStatusIcon = (status: PokemonStatusType) => {
    switch (status) {
      case 'captured':
        return <Check className='h-4 w-4 text-gray-600 dark:text-gray-300' />;
      case 'received':
        return <Gift className='h-4 w-4 text-gray-600 dark:text-gray-300' />;
      case 'traded':
        return (
          <ArrowUpDown className='h-4 w-4 text-gray-600 dark:text-gray-300' />
        );
      case 'missed':
        return (
          <LocateOff className='h-4 w-4 text-gray-600 dark:text-gray-300' />
        );
      case 'stored':
        return (
          <Computer className='h-4 w-4 text-gray-600 dark:text-gray-300' />
        );
      case 'deceased':
        return <Skull className='h-4 w-4 text-gray-600 dark:text-gray-300' />;
      default:
        return null;
    }
  };

  // Handle status selection
  const handleStatusSelect = (newStatus: PokemonStatusType) => {
    // Update local state immediately for responsive UI
    setLocalStatus(newStatus);

    if (value) {
      // Use startTransition to defer the state update
      startTransition(() => {
        const updatedPokemon: PokemonOption = {
          ...value,
          status: newStatus,
        };
        onChange(updatedPokemon);
      });
    }
  };

  return (
    <Menu>
      {({ open }) => (
        <div className='relative'>
          <MenuButton
            ref={refs.setReference}
            className={clsx(
              'border-t-0 capitalize',
              'flex items-center justify-between px-4 py-3.5 text-sm border bg-white dark:text-gray-400 focus:outline-none focus:ring-1',
              'focus:ring-inset focus-visible:ring-blue-500 focus-visible:border-blue-500 disabled:cursor-not-allowed',
              'border-gray-300 dark:border-gray-600 dark:bg-gray-800 enabled:dark:text-white dark:focus:ring-blue-400',
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
            <ChevronDown className='h-4 w-4 text-gray-400' aria-hidden='true' />
          </MenuButton>

          {open && (
            <FloatingPortal>
              <MenuItems
                ref={refs.setFloating}
                style={floatingStyles}
                className={clsx(
                  'z-50 overflow-hidden py-1 text-base focus:outline-none sm:text-sm',
                  'bg-white dark:bg-gray-800',
                  'border-gray-300 dark:border-gray-600 border-1',
                  'min-w-[140px]',
                  {
                    'rounded-b-md border-t-0': placement.startsWith('bottom'),
                    'rounded-t-md': placement.startsWith('top'),
                  }
                )}
              >
                <div className='py-1'>
                  {Object.values(PokemonStatus).map(
                    (statusValue: PokemonStatusType) => (
                      <MenuItem key={statusValue}>
                        {({ focus }) => (
                          <button
                            onClick={() => handleStatusSelect(statusValue)}
                            className={clsx(
                              'group flex w-full items-center px-4 py-2 text-sm hover:cursor-pointer',
                              'focus:outline-none text-left',
                              {
                                'bg-gray-100 dark:bg-gray-700': focus,
                                'bg-gray-50 dark:bg-gray-750':
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
                </div>
              </MenuItems>
            </FloatingPortal>
          )}
        </div>
      )}
    </Menu>
  );
};
