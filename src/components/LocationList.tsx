'use client';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { getLocationsSortedByOrder } from '@/loaders';
import type { Location } from '@/loaders/locations';

const columnHelper = createColumnHelper<Location>();

const columns = [
  columnHelper.accessor('name', {
    header: 'Location',
    cell: (info) => (
      <span className="font-medium text-gray-900 dark:text-white">
        {info.getValue()}
      </span>
    ),
    enableSorting: true,
  }),
];

export default function LocationList() {
  const [sorting, setSorting] = useState<SortingState>([]);

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

  // Show loading state if no data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8" role="status" aria-live="polite">
        <div className="text-gray-500 dark:text-gray-400">
          No location data available
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
        role="table"
        aria-label="Locations table"
      >
        <thead className="bg-gray-50 dark:bg-gray-800">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const isSorted = header.column.getIsSorted();
                const sortDirection = isSorted === 'asc' ? 'ascending' : isSorted === 'desc' ? 'descending' : 'none';

                return (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                    onClick={header.column.getToggleSortingHandler()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        header.column.getToggleSortingHandler()?.(e);
                      }
                    }}
                    tabIndex={0}
                    role="columnheader"
                    aria-sort={sortDirection}
                    aria-label={`${header.column.columnDef.header as string} column. Click to sort.`}
                  >
                    <div className="flex items-center space-x-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getCanSort() && (
                        <span
                          className="text-gray-400"
                          aria-hidden="true"
                        >
                          {header.column.getIsSorted() === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronsUpDown className="h-4 w-4" />
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
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {table.getRowModel().rows.map((row, rowIndex) => (
            <tr
              key={row.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              role="row"
            >
              {row.getVisibleCells().map((cell, cellIndex) => (
                <td
                  key={cell.id}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                  role="cell"
                  aria-label={`${cell.column.columnDef.header as string}: ${flexRender(cell.column.columnDef.cell, cell.getContext())}`}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 