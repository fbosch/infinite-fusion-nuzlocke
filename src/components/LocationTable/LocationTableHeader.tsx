import { HeaderGroup } from '@tanstack/react-table';
import type { CombinedLocation } from '@/loaders/locations';
import SortableHeaderCell from './SortableHeaderCell';

interface LocationTableHeaderProps {
  headerGroups: HeaderGroup<CombinedLocation>[];
}

export default function LocationTableHeader({
  headerGroups,
}: LocationTableHeaderProps) {
  return (
    <thead className='bg-gray-50 dark:bg-gray-800 sticky top-0 z-20 shadow-[0_0.5px_0_0_rgb(229,231,235)] dark:shadow-[0_0.5px_0_0_rgb(55,65,81)]'>
      {headerGroups.map(headerGroup => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map(header => (
            <SortableHeaderCell key={header.id} header={header} />
          ))}
        </tr>
      ))}
    </thead>
  );
}
