'use client';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import React, { useState, useMemo, startTransition } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Dna,
  DnaOff,
} from 'lucide-react';
import { getLocationsSortedByOrder } from '@/loaders';
import type { Location } from '@/loaders/locations';
import { PokemonCombobox } from './PokemonCombobox';
import type { PokemonOption } from '@/loaders/pokemon';
import clsx from 'clsx';

const columnHelper = createColumnHelper<Location>();

const columns = [
  columnHelper.accessor('name', {
    header: 'Location',
    cell: info => (
      <span className='font-medium text-gray-900 dark:text-white'>
        {info.getValue()}
      </span>
    ),
    enableSorting: true,
  }),
  columnHelper.accessor('routeId', {
    header: 'Encounter',
    cell: info => info.getValue(),
    enableSorting: false,
  }),
];

// Type for encounter data with fusion status
interface EncounterData {
  head: PokemonOption | null;
  body: PokemonOption | null;
  isFusion: boolean;
}

export default function LocationList() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [encounters, setEncounters] = useState<Record<number, EncounterData>>(
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
  });

  // Optimized encounter selection handler for immediate response
  const handleEncounterSelect = (
    routeId: number,
    pokemon: PokemonOption | null,
    field: 'head' | 'body' = 'head'
  ) => {
    startTransition(() => {
      setEncounters(prev => {
        const currentEncounter = prev[routeId] || {
          head: null,
          body: null,
          isFusion: false,
        };

        if (currentEncounter.isFusion) {
          // For fusions, update the specified field
          return {
            ...prev,
            [routeId]: {
              head: field === 'head' ? pokemon : currentEncounter.head,
              body: field === 'body' ? pokemon : currentEncounter.body,
              isFusion: true,
            },
          };
        } else {
          // For regular encounters, just set the head
          return {
            ...prev,
            [routeId]: {
              head: pokemon,
              body: null,
              isFusion: false,
            },
          };
        }
      });
    });
  };

  // Fusion toggle handler
  const handleFusionToggle = (routeId: number) => {
    startTransition(() => {
      setEncounters(prev => {
        const currentEncounter = prev[routeId] || {
          head: null,
          body: null,
          isFusion: false,
        };
        const newIsFusion = !currentEncounter.isFusion;

        if (newIsFusion) {
          // Converting to fusion - existing Pokemon becomes the head (fusion base)
          return {
            ...prev,
            [routeId]: {
              ...currentEncounter,
              isFusion: true,
            },
          };
        } else {
          // Converting from fusion - use head as the Pokemon
          return {
            ...prev,
            [routeId]: {
              ...currentEncounter,
              isFusion: false,
            },
          };
        }
      });
    });
  };

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
    <div className='overflow-x-auto'>
      <table
        className='min-w-full divide-y divide-gray-200 dark:divide-gray-700'
        role='table'
        aria-label='Locations table'
      >
        <thead className='bg-gray-50 dark:bg-gray-800'>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => {
                const isSorted = header.column.getIsSorted();
                const sortDirection =
                  isSorted === 'asc'
                    ? 'ascending'
                    : isSorted === 'desc'
                      ? 'descending'
                      : 'none';

                return (
                  <th
                    key={header.id}
                    className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
                    onClick={header.column.getToggleSortingHandler()}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        header.column.getToggleSortingHandler()?.(e);
                      }
                    }}
                    tabIndex={0}
                    role='columnheader'
                    aria-sort={sortDirection}
                    aria-label={`${header.column.columnDef.header as string} column. Click to sort.`}
                  >
                    <div className='flex items-center space-x-1'>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getCanSort() && (
                        <span className='text-gray-400' aria-hidden='true'>
                          {header.column.getIsSorted() === 'asc' ? (
                            <ChevronUp className='h-4 w-4' />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ChevronDown className='h-4 w-4' />
                          ) : (
                            <ChevronsUpDown className='h-4 w-4' />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className='bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700'>
          {table.getRowModel().rows.map(row => (
            <tr
              key={row.id}
              className='hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
              role='row'
            >
              {row.getVisibleCells().map(cell => {
                // Special handling for encounter column
                if (cell.column.id === 'routeId') {
                  const routeId = cell.getValue() as number;
                  const encounterData = encounters[routeId] || {
                    head: null,
                    body: null,
                    isFusion: false,
                  };
                  const selectedPokemon = encounterData.isFusion
                    ? encounterData.body
                    : encounterData.head;
                  const isFusion = encounterData.isFusion;

                  return (
                    <td
                      key={cell.id}
                      className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'
                      role='cell'
                    >
                      <div className='flex  flex-row justify-center gap-2'>
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
                                    handleEncounterSelect(
                                      routeId,
                                      pokemon,
                                      'head'
                                    )
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
                                    handleEncounterSelect(
                                      routeId,
                                      pokemon,
                                      'body'
                                    )
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
                              onChange={pokemon =>
                                handleEncounterSelect(routeId, pokemon)
                              }
                              comboboxId={`${routeId}-single`}
                            />
                          )}
                        </div>
                        <button
                          type='button'
                          onClick={() => handleFusionToggle(routeId)}
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

                return (
                  <td
                    key={cell.id}
                    className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'
                    role='cell'
                    aria-label={`${cell.column.columnDef.header as string}: ${flexRender(cell.column.columnDef.cell, cell.getContext())}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
