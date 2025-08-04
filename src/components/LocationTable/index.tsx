'use client';

import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { getLocationsSortedWithCustom } from '@/loaders';
import type { CombinedLocation } from '@/loaders/locations';
import LocationTableHeader from './LocationTableHeader';
import LocationTableRow from './LocationTableRow';
import LocationTableSkeleton from './LocationTableSkeleton';
import LocationCell from './LocationCell';
import {
  useIsLoading,
  useCustomLocations,
  playthroughActions,
} from '@/stores/playthroughs';
import { PlusIcon, LocateIcon } from 'lucide-react';
import clsx from 'clsx';
import { CursorTooltip } from '../CursorTooltip';
import dynamic from 'next/dynamic';
import { useBreakpointSmallerThan } from '../../hooks/useBreakpoint';
import { scrollToMostRecentLocation } from '@/utils/scrollToLocation';

const columnHelper = createColumnHelper<CombinedLocation>();

// Dynamically import the modal to reduce initial bundle size
const AddCustomLocationModal = dynamic(
  () =>
    import('./customLocations/AddCustomLocationModal').then(mod => mod.default),
  {
    ssr: false,
    loading: () => null,
  }
);

export default function LocationTable() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isCustomLocationModalOpen, setIsCustomLocationModalOpen] =
    useState(false);
  const [mounted, setMounted] = useState(false);
  const isLoading = useIsLoading();
  const customLocations = useCustomLocations();
  const smallScreen = useBreakpointSmallerThan('2xl');

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

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

  // Auto-scroll to recent encounter on page load
  useEffect(() => {
    if (!mounted || isLoading || data.length === 0) return;

    setTimeout(() => {
      scrollToMostRecentLocation(
        playthroughActions.getEncounters(),
        tableContainerRef.current,
        tableRef.current,
        'smooth'
      );
    }, 100);
  }, [mounted, isLoading, data.length]);

  // Manual scroll handler
  const handleScrollToRecent = useCallback(() => {
    scrollToMostRecentLocation(
      playthroughActions.getEncounters(),
      tableContainerRef.current,
      tableRef.current,
      'smooth'
    );
  }, []);

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: () => (
          <div className='flex items-center w-full'>
            <span>Location</span>
            <div className='flex items-center gap-1 ml-2'>
              <CursorTooltip content={'Scroll to most recent encounter'}>
                <button
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      handleScrollToRecent();
                    }
                  }}
                  onClick={e => {
                    e.stopPropagation();
                    handleScrollToRecent();
                  }}
                  className={clsx(
                    'p-0.5 rounded-sm transition-colors duration-200',
                    'bg-gray-100 text-gray-600',
                    'border border-gray-200',
                    'dark:bg-gray-700 dark:text-gray-400',
                    'dark:border-gray-600',
                    'hover:text-white hover:border-green-500 hover:bg-green-600',
                    'cursor-pointer',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-1'
                  )}
                  aria-label='Scroll to most recent encounter'
                >
                  <LocateIcon className='size-2.5' />
                </button>
              </CursorTooltip>
              <CursorTooltip content={'Add a custom location'}>
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
                    'p-0.5 rounded-sm transition-colors duration-200',
                    'bg-gray-100 text-gray-600',
                    'border border-gray-200',
                    'dark:bg-gray-700 dark:text-gray-400',
                    'dark:border-gray-600',
                    'hover:text-white hover:border-blue-500 hover:bg-blue-600',
                    'cursor-pointer',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1'
                  )}
                  aria-label='Add custom location'
                >
                  <PlusIcon className='size-2.5' />
                </button>
              </CursorTooltip>
            </div>
          </div>
        ),
        cell: info => (
          <LocationCell
            location={info.row.original}
            locationName={info.getValue()}
          />
        ),
        enableSorting: true,
      }),
      columnHelper.display({
        id: 'sprite',
        header: '',
        enableSorting: false,
        cell: () => null, // Handled in render loop
        size: smallScreen ? 125 : 200, // Width for sprite column
      }),
      columnHelper.display({
        id: 'encounter',
        header: 'Encounter',
        cell: () => null, // Handled in render loop
        enableSorting: false,
        size: smallScreen ? 400 : 900, // Optimized width for fusion comboboxes
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: () => null, // Handled in render loop
        size: 60, // Width for reset column
      }),
    ],
    [smallScreen, handleScrollToRecent]
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
    enableSorting: false,
    // Performance optimizations
    enableColumnResizing: false,
    enableRowSelection: false,
    enableMultiSort: false,
    // Disable features we don't use to reduce bundle size
    enableGlobalFilter: false,
    enableColumnFilters: false,
    manualPagination: true,
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
    <div className='overflow-hidden 2xl:rounded-lg border-y md:border border-gray-200 dark:border-gray-700 xl:shadow-sm'>
      <div
        ref={tableContainerRef}
        className='max-h-[93.5vh] overflow-auto scrollbar-thin overscroll-x-none relative scroll-smooth'
      >
        <table
          ref={tableRef}
          className='w-full min-w-full divide-y divide-gray-200 dark:divide-gray-700 overscroll-x-contain overscroll-y-auto'
          role='table'
          data-scroll-container
          aria-label='Locations table'
        >
          <LocationTableHeader headerGroups={table.getHeaderGroups()} />
          <tbody
            className='bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700'
            id='location-table'
          >
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
