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
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { getLocationsSortedByOrder } from '@/loaders';
import type { Location } from '@/loaders/locations';
import { EncounterCell } from './EncounterCell';
import { PokemonSprite } from './PokemonSprite';
import type { PokemonOption } from '@/loaders/pokemon';

const columnHelper = createColumnHelper<Location>();

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

  // Define columns inside the component to access encounters state
  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: 'Location',
      cell: info => (
        <span className='font-medium text-gray-900 dark:text-white'>
          {info.getValue()}
        </span>
      ),
      enableSorting: true,
      size: 40, // Fixed width for location column
    }),
    columnHelper.display({
      id: 'sprite',
      header: '',
      cell: props => {
        const routeId = props.row.original.routeId;
        const encounterData = encounters[routeId] || {
          head: null,
          body: null,
          isFusion: false,
        };
        
        return (
            <PokemonSprite
              encounterData={encounterData}
              size='lg'
              className='scale-150'
            />
        );
      },
      size: 90, // Width for sprite column
    }),
    columnHelper.accessor('routeId', {
      id: 'encounter',
      header: 'Encounter',
      cell: info => info.getValue(),
      enableSorting: false,
      size: 700, // Increased width for fusion comboboxes
    }),
  ], [encounters]);

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
        className='w-full divide-y divide-gray-200 dark:divide-gray-700'
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
                    className='px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
                    style={{
                      width: `${header.column.getSize()}px`,
                      minWidth: `${header.column.getSize()}px`,
                    }}
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
              className='hover:bg-gray-50 dark:hover:bg-gray-800 transition-colorsa'
              role='row'
            >
              {row.getVisibleCells().map(cell => {
                const routeId = cell.getValue() as number;
                const encounterData = encounters[routeId] || {
                  head: null,
                  body: null,
                  isFusion: false,
                };

                // Special handling for encounter column
                if (cell.column.id === 'encounter') {
                  return (
                    <EncounterCell
                      key={cell.id}
                      routeId={routeId}
                      encounterData={encounterData}
                      onEncounterSelect={handleEncounterSelect}
                      onFusionToggle={handleFusionToggle}
                    />
                  );
                }

                return (
                  <td
                    key={cell.id}
                    className=' whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'
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
