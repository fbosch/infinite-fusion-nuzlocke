'use client';

import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import React, { useState, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import { getLocationsSortedByOrder } from '@/loaders';
import type { Location } from '@/loaders/locations';
import { LocationTableHeader, LocationTableRow } from './LocationTable';
import { playthroughsStore, playthroughActions } from '@/stores/playthroughs';

const columnHelper = createColumnHelper<Location>();

export default function LocationList() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const playthroughSnapshot = useSnapshot(playthroughsStore);
  const activePlaythrough = playthroughSnapshot.activePlaythroughId;
  const encounters = playthroughSnapshot.playthroughs.find(
    p => p.id === activePlaythrough
  )?.encounters;

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
  );

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

  // Show loading state while store is initializing from IndexedDB
  if (playthroughSnapshot.isLoading) {
    return (
      <div
        className='flex items-center justify-center p-8'
        role='status'
        aria-live='polite'
      >
        <div className='flex items-center space-x-2 text-gray-500 dark:text-gray-400'>
          <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500'></div>
          <span>Loading playthrough data...</span>
        </div>
      </div>
    );
  }

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
            const encounterData = encounters?.[row.original.id] || {
              head: null,
              body: null,
              isFusion: false,
            };

            return (
              <LocationTableRow
                key={row.id}
                row={row}
                encounterData={encounterData}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
