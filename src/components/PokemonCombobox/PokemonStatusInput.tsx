'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  startTransition,
  useRef,
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
import {
  useFloating,
  autoUpdate,
  flip,
  shift,
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

  // State for dropdown open/closed
  const [isOpen, setIsOpen] = useState(false);

  // Ref for the button element
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Floating UI setup
  const { refs, floatingStyles, update, placement } = useFloating({
    placement: 'bottom-end',
    middleware: [flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  // Sync local status when value changes
  useEffect(() => {
    if (value?.status !== localStatus) {
      setLocalStatus(value?.status || null);
    }
  }, [value?.status, localStatus]);

  // Set floating reference when button ref changes
  useEffect(() => {
    if (buttonRef.current) {
      refs.setReference(buttonRef.current);
      update();
    }
  }, [refs, update]);

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

      // Close the dropdown
      setIsOpen(false);

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

  // Handle button click
  const handleButtonClick = useCallback(() => {
    if (!disabled && value) {
      setIsOpen(!isOpen);
    }
  }, [disabled, value, isOpen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        refs.floating.current &&
        !refs.floating.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, refs.floating]);

  return (
    <div className='relative'>
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
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
              isOpen || placement.startsWith('bottom'),
            'rounded-br-md border-b-0': isOpen && placement.startsWith('top'),
            'rounded-br-md rounded-t-none': !isOpen,
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
      </button>

      <FloatingPortal>
        {isOpen && (
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className={clsx(
              'z-50 overflow-hidden py-1 text-base shadow-lg focus:outline-none sm:text-sm',
              'bg-white dark:bg-gray-800',
              'border border-gray-300 dark:border-gray-600',
              'min-w-[140px]',
              // Conditional border radius based on menu placement
              {
                'rounded-b-md rounded-t-none border-t-0':
                  placement.startsWith('bottom'),
                'rounded-t-md rounded-b-none border-b-0':
                  placement.startsWith('top'),
                'rounded-md':
                  !placement.startsWith('bottom') &&
                  !placement.startsWith('top'),
              }
            )}
          >
            <div className='py-1'>
              {Object.values(PokemonStatus).map(
                (statusValue: PokemonStatusType) => (
                  <button
                    key={statusValue}
                    onClick={() => handleStatusSelect(statusValue)}
                    className={clsx(
                      'group flex w-full items-center px-4 py-2 text-sm hover:cursor-pointer',
                      'hover:bg-gray-100 dark:hover:bg-gray-700',
                      'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-500',
                      'text-left'
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
                )
              )}
            </div>
          </div>
        )}
      </FloatingPortal>
    </div>
  );
};
