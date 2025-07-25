import { Row, flexRender } from '@tanstack/react-table';
import type { CombinedLocation } from '@/loaders/locations';
import { isCustomLocation } from '@/loaders/locations';
import type { EncounterData } from '@/loaders/encounters';
import { EncounterCell } from './EncounterCell';
import SummaryCard from '../SummaryCard';
import ResetEncounterButton from './ResetEncounterButton';
import { match } from 'ts-pattern';
import { useInView } from 'react-intersection-observer';

interface LocationTableRowProps {
  row: Row<CombinedLocation>;
  encounterData: EncounterData;
}

export default function LocationTableRow({
  row,
  encounterData,
}: LocationTableRowProps) {
  // For custom locations, routeId should be undefined since they don't have wild encounters
  const routeId = isCustomLocation(row.original)
    ? undefined
    : row.original.routeId;
  const locationId = row.original.id;
  const { ref, inView } = useInView();

  return (
    <tr
      ref={ref}
      key={row.id}
      role='row'
      className='hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors content-visibility-auto'
      style={{
        containIntrinsicHeight: '150px',
      }}
    >
      {row.getVisibleCells().map(cell =>
        match(cell.column.id)
          .with('encounter', () => (
            <EncounterCell
              shouldLoad={inView}
              key={cell.id}
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
              <SummaryCard
                encounterData={encounterData}
                locationId={locationId}
              />
            </td>
          ))
          .with('reset', () => {
            const hasEncounter = encounterData.head || encounterData.body;
            return (
              <ResetEncounterButton
                key={cell.id}
                locationId={locationId}
                locationName={row.original.name}
                hasEncounter={!!hasEncounter}
              />
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
