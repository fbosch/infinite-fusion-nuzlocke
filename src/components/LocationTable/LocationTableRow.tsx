import { Row, flexRender } from '@tanstack/react-table';
import type { Location } from '@/loaders/locations';
import type { EncounterData } from '@/loaders/encounters';
import { EncounterCell } from './EncounterCell';
import { FusionSprite } from '../FusionSprite';
import ResetEncounterButton from './ResetEncounterButton';

interface LocationTableRowProps {
  row: Row<Location>;
  encounterData: EncounterData;
}

export default function LocationTableRow({
  row,
  encounterData,
}: LocationTableRowProps) {
  const routeId = row.original.routeId;
  const locationId = row.original.id;

  return (
    <tr
      key={row.id}
      role='row'
      className='hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors content-visibility-auto'
      style={{
        containIntrinsicHeight: '150px',
      }}
    >
      {row.getVisibleCells().map(cell => {
        // Special handling for encounter column
        if (cell.column.id === 'encounter') {
          return (
            <EncounterCell
              key={cell.id}
              routeId={routeId}
              locationId={locationId}
              encounterData={encounterData}
            />
          );
        }

        // Special handling for sprite column to avoid re-renders
        if (cell.column.id === 'sprite') {
          return (
            <td
              key={cell.id}
              className='p-1 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'
              role='cell'
            >
              <FusionSprite
                encounterData={encounterData}
                size='lg'
                className='scale-150'
              />
            </td>
          );
        }

        // Special handling for reset column to avoid re-renders
        if (cell.column.id === 'reset') {
          const hasEncounter = encounterData.head || encounterData.body;
          return (
            <ResetEncounterButton
              key={cell.id}
              locationId={locationId}
              locationName={row.original.name}
              hasEncounter={!!hasEncounter}
            />
          );
        }

        return (
          <td
            key={cell.id}
            className='px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'
            role='cell'
            aria-label={`${cell.column.columnDef.header as string}: ${flexRender(cell.column.columnDef.cell, cell.getContext())}`}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        );
      })}
    </tr>
  );
}
