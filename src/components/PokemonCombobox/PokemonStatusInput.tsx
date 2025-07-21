'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  startTransition,
} from 'react';
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
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
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
  const handleStatusSelect = useCallback(
    (newStatus: PokemonStatusType) => {
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
    },
    [value, onChange]
  );

  return (
    <Menu as='div' className='relative'>
      <MenuButton
        className={clsx(
          'rounded-br-md border-t-0 rounded-t-none capitalize',
          'flex items-center justify-between px-4 py-3.5 text-sm border  bg-white text-gray-400 focus:outline-none focus:ring-1',
          'focus:ring-inset focus-visible:ring-blue-500 focus-visible:border-blue-500  disabled:cursor-not-allowed',
          'border-gray-300 dark:border-gray-600 dark:bg-gray-800 enabled:dark:text-white dark:focus:ring-blue-400',
          'enabled:hover:bg-gray-50 dark:enabled:hover:bg-gray-700',
          'min-w-[140px] enabled:hover:cursor-pointer',
          dragPreview && 'opacity-60 pointer-events-none'
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
      <MenuItems
        className={clsx(
          'absolute right-0 z-10 mt-1 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-gray-300 ring-opacity-5 focus:outline-none',
          'dark:bg-gray-800 dark:ring-gray-600',
          'min-w-[140px]'
        )}
      >
        {Object.values(PokemonStatus).map((statusValue: PokemonStatusType) => (
          <MenuItem key={statusValue}>
            <button
              onClick={() => handleStatusSelect(statusValue)}
              className={clsx(
                'group flex w-full items-center px-4 py-2 text-sm hover:cursor-pointer',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-500'
              )}
            >
              <div className='flex items-center gap-2'>
                {getStatusIcon(statusValue)}
                <span>
                  {statusValue.charAt(0).toUpperCase() + statusValue.slice(1)}
                </span>
              </div>
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
};
