'use client';

import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import React, { useState, useMemo, startTransition, useCallback } from 'react';
import { getLocationsSortedByOrder } from '@/loaders';
import type { Location } from '@/loaders/locations';
import type { PokemonOption } from '@/loaders/pokemon';
import {
  LocationTableHeader,
  LocationTableRow,
  type EncounterData,
} from './LocationTable';

const columnHelper = createColumnHelper<Location>();

export default function LocationList() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [encounters, setEncounters] = useState<Record<string, EncounterData>>(
    {}
  );

  // Memoize the data to prevent unnecessary re-computations
  const data = useMemo(() => {
    try {
      return getLocationsSortedByOrder();
    } catch (error) {
      console.error('Failed to load locations:', error);
      return [];
    }
  }, []);

  // Define columns outside of component to prevent recreation
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Location',
        cell: info => (
          <span className='font-medium text-gray-900 dark:text-white'>
            {info.getValue()}
          </span>
        ),
        enableSorting: true,
        size: 20, // Fixed width for location column
      }),
      columnHelper.display({
        id: 'sprite',
        header: '',
        enableSorting: false,
        cell: () => null, // Handled in render loop
        size: 120, // Width for sprite column
      }),
      columnHelper.accessor('routeId', {
        id: 'encounter',
        header: 'Encounter',
        cell: info => info.getValue(),
        enableSorting: false,
        size: 700, // Increased width for fusion comboboxes
      }),
      columnHelper.display({
        id: 'reset',
        header: '',
        enableSorting: false,
        cell: () => null, // Handled in render loop
        size: 60, // Width for reset column
      }),
    ],
    []
  ); // Remove encounters dependency

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    // Performance optimizations
    enableColumnResizing: false,
    enableRowSelection: false,
    enableMultiSort: false,
  });

  // Reset encounter handler - memoized to prevent re-renders
  const handleResetEncounter = useCallback((locationId: string) => {
    setEncounters(prev => {
      const newEncounters = { ...prev };
      delete newEncounters[locationId];
      return newEncounters;
    });
  }, []);

  // Optimized encounter selection handler for immediate response
  const handleEncounterSelect = useCallback(
    (
      locationId: string,
      pokemon: PokemonOption | null,
      field: 'head' | 'body' = 'head'
    ) => {
      // Set originalLocation if pokemon is provided and doesn't already have one
      const pokemonWithLocation = pokemon
        ? {
            ...pokemon,
            originalLocation: pokemon.originalLocation || locationId,
          }
        : pokemon;

      setEncounters(prev => {
        const currentEncounter = prev[locationId] || {
          head: null,
          body: null,
          isFusion: false,
        };

        if (currentEncounter.isFusion) {
          // For fusions, update the specified field
          return {
            ...prev,
            [locationId]: {
              head:
                field === 'head' ? pokemonWithLocation : currentEncounter.head,
              body:
                field === 'body' ? pokemonWithLocation : currentEncounter.body,
              isFusion: true,
            },
          };
        } else {
          // For regular encounters, just set the head
          return {
            ...prev,
            [locationId]: {
              head: pokemonWithLocation,
              body: null,
              isFusion: false,
            },
          };
        }
      });
    },
    []
  );

  // Enhanced encounter selection handler that can create fusions
  const handleEncounterSelectWithFusion = useCallback(
    (
      locationId: string,
      pokemon: PokemonOption | null,
      field: 'head' | 'body' = 'head',
      shouldCreateFusion: boolean = false
    ) => {
      // Set originalLocation if pokemon is provided and doesn't already have one
      const pokemonWithLocation = pokemon
        ? {
            ...pokemon,
            originalLocation: pokemon.originalLocation || locationId,
          }
        : pokemon;

      setEncounters(prev => {
        const currentEncounter = prev[locationId] || {
          head: null,
          body: null,
          isFusion: false,
        };

        if (shouldCreateFusion) {
          // Creating a new fusion
          return {
            ...prev,
            [locationId]: {
              head:
                field === 'head' ? pokemonWithLocation : currentEncounter.head,
              body:
                field === 'body' ? pokemonWithLocation : currentEncounter.body,
              isFusion: true,
            },
          };
        } else if (currentEncounter.isFusion) {
          // For existing fusions, update the specified field
          return {
            ...prev,
            [locationId]: {
              head:
                field === 'head' ? pokemonWithLocation : currentEncounter.head,
              body:
                field === 'body' ? pokemonWithLocation : currentEncounter.body,
              isFusion: true,
            },
          };
        } else {
          // For regular encounters, just set the head
          return {
            ...prev,
            [locationId]: {
              head: pokemonWithLocation,
              body: null,
              isFusion: false,
            },
          };
        }
      });
    },
    []
  );

  // Fusion toggle handler
  const handleFusionToggle = useCallback((locationId: string) => {
    startTransition(() => {
      setEncounters(prev => {
        const currentEncounter = prev[locationId] || {
          head: null,
          body: null,
          isFusion: false,
        };
        const newIsFusion = !currentEncounter.isFusion;

        if (newIsFusion) {
          // Converting to fusion - existing Pokemon becomes the head (fusion base)
          return {
            ...prev,
            [locationId]: {
              ...currentEncounter,
              isFusion: true,
            },
          };
        } else {
          // When unfusing, preserve all properties of the Pokémon that becomes the single encounter
          const singlePokemon = currentEncounter.head || currentEncounter.body;
          return {
            ...prev,
            [locationId]: {
              head: singlePokemon,
              body: null,
              isFusion: false,
            },
          };
        }
      });
    });
  }, []);

  // Handle fusion creation from drag and drop
  const handleCreateFusion = useCallback((event: CustomEvent) => {
    const { locationId, head, body } = event.detail;

    startTransition(() => {
      setEncounters(prev => {
        return {
          ...prev,
          [locationId]: {
            head,
            body,
            isFusion: true,
          },
        };
      });
    });
  }, []);

  // Listen for fusion creation events
  React.useEffect(() => {
    window.addEventListener(
      'createFusion',
      handleCreateFusion as EventListener
    );

    return () => {
      window.removeEventListener(
        'createFusion',
        handleCreateFusion as EventListener
      );
    };
  }, [handleCreateFusion]);

  // Show loading state if no data
  if (!data || data.length === 0) {
    return (
      <div
        className='flex items-center justify-center p-8'
        role='status'
        aria-live='polite'
      >
        <div className='text-gray-500 dark:text-gray-400'>
          No location data available
        </div>
      </div>
    );
  }

  return (
    <div className='overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm'>
      <table
        className='w-full min-w-full divide-y divide-gray-200 dark:divide-gray-700'
        role='table'
        aria-label='Locations table'
      >
        <LocationTableHeader headerGroups={table.getHeaderGroups()} />
        <tbody className='bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700'>
          {table.getRowModel().rows.map(row => {
            const encounterData = encounters[row.original.id] || {
              head: null,
              body: null,
              isFusion: false,
            };

            return (
              <LocationTableRow
                key={row.id}
                row={row}
                encounterData={encounterData}
                onEncounterSelect={(locationId, pokemon, field) =>
                  handleEncounterSelect(row.original.id, pokemon, field)
                }
                onFusionToggle={handleFusionToggle}
                onResetEncounter={handleResetEncounter}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
