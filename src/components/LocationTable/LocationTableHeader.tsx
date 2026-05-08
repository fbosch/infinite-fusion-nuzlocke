import type { HeaderGroup } from "@tanstack/react-table";
import ProgressBar from "@/components/ProgressBar";
import type { CombinedLocation } from "@/loaders/locations";
import SortableHeaderCell from "./SortableHeaderCell";

interface LocationTableHeaderProps {
  headerGroups: HeaderGroup<CombinedLocation>[];
}

export default function LocationTableHeader({
  headerGroups,
}: LocationTableHeaderProps) {
  return (
    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-50">
      {headerGroups.map((headerGroup) => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <SortableHeaderCell key={header.id} header={header} />
          ))}
        </tr>
      ))}
      <tr>
        <th colSpan={headerGroups[0]?.headers.length ?? 1} className="p-0">
          <ProgressBar />
        </th>
      </tr>
    </thead>
  );
}
