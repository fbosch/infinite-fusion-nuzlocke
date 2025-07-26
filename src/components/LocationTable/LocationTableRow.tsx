import { Row, flexRender } from '@tanstack/react-table';
import type { CombinedLocation } from '@/loaders/locations';
import { isCustomLocation } from '@/loaders/locations';
import { EncounterCell } from './EncounterCell';
import SummaryCard from '../SummaryCard';
import ResetEncounterButton from './ResetEncounterButton';
import RemoveLocationButton from './RemoveLocationButton';
import { match } from 'ts-pattern';
import { useInView } from 'react-intersection-observer';
import { useEncounter } from '@/stores/playthroughs';

interface LocationTableRowProps {
  row: Row<CombinedLocation>;
}

export default function LocationTableRow({ row }: LocationTableRowProps) {
  // For custom locations, routeId should be undefined since they don't have wild encounters
  const routeId = isCustomLocation(row.original)
    ? undefined
    : row.original.routeId;
  const locationId = row.original.id;
  const { ref, inView } = useInView();

  // Get encounter data directly - only this row will rerender when this encounter changes
  const encounterData = useEncounter(locationId) || {
    head: null,
    body: null,
    isFusion: false,
    updatedAt: Date.now(),
  };

  return (
    <tr
      key={row.id}
      role='row'
      className='hover:bg-gray-50/60 dark:hover:bg-gray-800/60 transition-colors content-visibility-auto group/row'
      style={{
        containIntrinsicHeight: '150px',
      }}
      ref={ref}
    >
      {row.getVisibleCells().map(cell =>
        match(cell.column.id)
          .with('encounter', () => (
            <EncounterCell
              key={cell.id}
              shouldLoad={inView}
              routeId={routeId}
              locationId={locationId}
            />
          ))
          .with('sprite', () => (
            <td
              key={cell.id}
              className='p-1 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 relative group'
              role='cell'
            >
              <SummaryCard locationId={locationId} shouldLoad={inView} />
            </td>
          ))
          .with('actions', () => {
            const hasEncounter = !!(encounterData.head || encounterData.body);
            return (
              <td
                key={cell.id}
                className='p-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 align-top'
                role='cell'
              >
                <div className='flex flex-col items-center justify-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 group-focus-within/row:opacity-100'>
                  {hasEncounter && (
                    <ResetEncounterButton
                      locationId={locationId}
                      locationName={row.original.name}
                      hasEncounter={hasEncounter}
                    />
                  )}
                  {isCustomLocation(row.original) && (
                    <RemoveLocationButton
                      locationId={locationId}
                      locationName={row.original.name}
                    />
                  )}
                </div>
              </td>
            );
          })
          .otherwise(() => (
            <td
              key={cell.id}
              className='px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'
              role='cell'
              aria-label={`${cell.column.columnDef.header as string}: ${flexRender(cell.column.columnDef.cell, cell.getContext())}`}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))
      )}
    </tr>
  );
}
