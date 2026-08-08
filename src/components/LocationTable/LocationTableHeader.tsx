import type { HeaderGroup } from "@tanstack/react-table";
import ProgressBar from "@/components/ProgressBar";
import type { CombinedLocation } from "@/loaders/locations";
import { locationTableColumnWidths } from "./columnWidths";
import SortableHeaderCell from "./SortableHeaderCell";

interface LocationTableHeaderProps {
  headerGroups: HeaderGroup<CombinedLocation>[];
}

export default function LocationTableHeader({
  headerGroups,
}: LocationTableHeaderProps) {
  return (
    <thead
      className={
        // fallow-ignore-next-line css-token-drift -- The half-pixel separator matches the table skeleton.
        "sticky top-0 z-50 bg-gray-50 shadow-[0_0.5px_0_0_rgb(229,231,235)] dark:bg-gray-800 dark:shadow-[0_0.5px_0_0_rgb(55,65,81)]"
      }
    >
      {headerGroups.map((headerGroup) => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <SortableHeaderCell
              className={locationTableColumnWidths[header.column.id]}
              header={header}
              key={header.id}
            />
          ))}
        </tr>
      ))}
      <tr>
        <th className="p-0" colSpan={headerGroups[0]?.headers.length ?? 1}>
          <ProgressBar className="translate-y-px" />
        </th>
      </tr>
    </thead>
  );
}
