import { Header, flexRender } from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import clsx from 'clsx';
import type { Location } from '@/loaders/locations';

interface SortableHeaderCellProps {
  header: Header<Location, unknown>;
}

export default function SortableHeaderCell({
  header,
}: SortableHeaderCellProps) {
  const isSorted = header.column.getIsSorted();
  const sortingEnabled = header.column.getCanSort();
  const sortDirection =
    isSorted === 'asc'
      ? 'ascending'
      : isSorted === 'desc'
        ? 'descending'
        : 'none';

  return (
    <th
      key={header.id}
      className={clsx(
        'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset',
        sortingEnabled &&
          'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700'
      )}
      style={{
        width: `${header.column.getSize()}px`,
        minWidth: `${header.column.getSize()}px`,
      }}
      onClick={
        sortingEnabled ? header.column.getToggleSortingHandler() : undefined
      }
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          header.column.getToggleSortingHandler()?.(e);
        }
      }}
      tabIndex={sortingEnabled ? 0 : -1}
      role='columnheader'
      aria-sort={sortingEnabled ? sortDirection : undefined}
      aria-label={
        sortingEnabled
          ? `${header.column.columnDef.header as string} column. Click to sort.`
          : `${header.column.columnDef.header as string} column. No sorting available.`
      }
    >
      <div className='flex items-center space-x-1'>
        <div>
          {flexRender(header.column.columnDef.header, header.getContext())}
        </div>
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
}
