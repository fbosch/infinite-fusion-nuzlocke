'use client';

import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import React, { useState, useMemo } from 'react';
import { getLocationsSortedByOrder } from '@/loaders';
import type { Location } from '@/loaders/locations';
import { LocationTableHeader, LocationTableRow } from './LocationTable';
import { useEncounters, useIsLoading } from '@/stores/playthroughs';

const columnHelper = createColumnHelper<Location>();

// Skeleton loading component that matches the table structure
function LocationTableSkeleton() {
  return (
    <div className='overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm'>
      <table
        className='w-full min-w-full divide-y divide-gray-200 dark:divide-gray-700'
        role='table'
        aria-label='Loading locations table'
      >
        <thead className='bg-gray-50 dark:bg-gray-800'>
          <tr>
            <th
              className='px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
              style={{ width: '20px', minWidth: '20px' }}
            >
              Location
            </th>
            <th
              className='px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
              style={{ width: '120px', minWidth: '120px' }}
            ></th>
            <th
              className='px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
              style={{ width: '700px', minWidth: '700px' }}
            >
              Encounter
            </th>
            <th
              className='px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
              style={{ width: '60px', minWidth: '60px' }}
            ></th>
          </tr>
        </thead>
        <tbody className='bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 opacity-30'>
          {Array.from({ length: 12 }).map((_, index) => (
            <tr
              key={index}
              className='hover:bg-gray-50 h-[150px] dark:hover:bg-gray-800 transition-colors'
              style={{ containIntrinsicHeight: '150px' }}
            >
              {/* Location name column */}
              <td className='px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'>
                <div className='h-5 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-23'></div>
              </td>

              {/* Sprite column */}
              <td className='p-1 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'>
                <div className='size-14 bg-transparee mx-auto'></div>
              </td>

              {/* Encounter column */}
              <td className='px-4 pt-8.5 pb-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'>
                <div className='flex flex-row justify-center gap-4 items-center'>
                  <div className='flex-1'>
                    <div className='relative'>
                      <div className='h-24 bg-gray-300 dark:bg-gray-600 rounded animate-pulse'></div>
                    </div>
                  </div>
                  <div className='size-10 bg-gray-300 dark:bg-gray-600 rounded animate-pulse'></div>
                </div>
              </td>

              {/* Reset column */}
              <td className='p-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 align-top'></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LocationList() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const encounters = useEncounters();
  const isLoading = useIsLoading();

  const data = useMemo(() => {
    try {
      return getLocationsSortedByOrder();
    } catch (error) {
      console.error('Failed to load locations:', error);
      return [];
    }
  }, []);

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

  // Show skeleton loading state while store is initializing from IndexedDB
  if (isLoading) {
    return <LocationTableSkeleton />;
  }

  // Show loading state if no data
  if (data.length === 0) {
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
