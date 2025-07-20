import { HeaderGroup } from '@tanstack/react-table';
import type { Location } from '@/loaders/locations';
import SortableHeaderCell from './SortableHeaderCell';

interface LocationTableHeaderProps {
  headerGroups: HeaderGroup<Location>[];
}

export default function LocationTableHeader({ headerGroups }: LocationTableHeaderProps) {
  return (
    <thead className='bg-gray-50 dark:bg-gray-800'>
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