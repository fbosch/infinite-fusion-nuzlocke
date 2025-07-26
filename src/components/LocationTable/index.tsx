'use client';

import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import React, { useState, useMemo, useEffect } from 'react';
import { getLocationsSortedWithCustom, isCustomLocation } from '@/loaders';
import type { CombinedLocation } from '@/loaders/locations';
import LocationTableHeader from './LocationTableHeader';
import LocationTableRow from './LocationTableRow';
import LocationTableSkeleton from './LocationTableSkeleton';
import AddCustomLocationModal from './customLocations/AddCustomLocationModal';
import { useIsLoading, useCustomLocations } from '@/stores/playthroughs';
import { Info, PlusIcon } from 'lucide-react';
import clsx from 'clsx';
import { CursorTooltip } from '../CursorTooltip';

const columnHelper = createColumnHelper<CombinedLocation>();

export default function LocationTable() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isCustomLocationModalOpen, setIsCustomLocationModalOpen] =
    useState(false);
  const [mounted, setMounted] = useState(false);
  const isLoading = useIsLoading();
  const customLocations = useCustomLocations();

  useEffect(() => {
    setMounted(true);
  }, []);

  const data = useMemo(() => {
    try {
      return getLocationsSortedWithCustom(customLocations);
    } catch (error) {
      console.error('Failed to load locations:', error);
      return [];
    }
  }, [customLocations]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: ({ column }) => (
          <div className='flex items-center w-full'>
            <span>Location</span>
            <button
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  setIsCustomLocationModalOpen(true);
                }
              }}
              onClick={e => {
                e.stopPropagation();
                setIsCustomLocationModalOpen(true);
              }}
              className={clsx(
                'ml-2 p-0.5 rounded-sm transition-colors duration-200',
                'bg-gray-100 text-gray-600',
                'border border-gray-200',
                'dark:bg-gray-700 dark:text-gray-400',
                'dark:border-gray-600',
                'hover:text-white hover:border-blue-500 hover:bg-blue-600',
                'cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1'
              )}
              aria-label='Add custom location'
              title='Add custom location'
            >
              <PlusIcon className='size-2.5' />
            </button>
          </div>
        ),
        cell: info => (
          <span className='font-medium text-gray-900 dark:text-white flex gap-x-2 items-center'>
            <CursorTooltip
              content={
                <span>
                  {isCustomLocation(info.row.original)
                    ? 'Custom Location'
                    : info.row.original.description}
                </span>
              }
            >
              <Info className='size-4 text-gray-400 dark:text-gray-600 cursor-help' />
            </CursorTooltip>
            <h2 className='text-sm'>{info.getValue()}</h2>
          </span>
        ),
        enableSorting: true,
        size: 10, // Fixed width for location column
      }),
      columnHelper.display({
        id: 'sprite',
        header: '',
        enableSorting: false,
        cell: () => null, // Handled in render loop
        size: 200, // Width for sprite column
      }),
      columnHelper.accessor('routeId', {
        id: 'encounter',
        header: 'Encounter',
        cell: info => info.getValue(),
        enableSorting: false,
        size: 900, // Optimized width for fusion comboboxes
      }),
      columnHelper.display({
        id: 'actions',
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

  // Show skeleton loading state while component is mounting or store is initializing from IndexedDB
  if (!mounted || isLoading) {
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
    <div className='overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm'>
      <div className='max-h-[90vh] overflow-auto scrollbar-thin overscroll-x-none'>
        <table
          className='w-full min-w-full divide-y divide-gray-200 dark:divide-gray-700'
          role='table'
          aria-label='Locations table'
        >
          <LocationTableHeader headerGroups={table.getHeaderGroups()} />
          <tbody className='bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700'>
            {table.getRowModel().rows.map(row => (
              <LocationTableRow key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>
      <AddCustomLocationModal
        isOpen={isCustomLocationModalOpen}
        onClose={() => setIsCustomLocationModalOpen(false)}
      />
    </div>
  );
}
