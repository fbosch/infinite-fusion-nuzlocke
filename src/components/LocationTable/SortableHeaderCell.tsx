import { flexRender, type Header } from "@tanstack/react-table";
import clsx from "clsx";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import type { CombinedLocation } from "@/loaders/locations";

interface SortableHeaderCellProps {
  className?: string;
  header: Header<CombinedLocation, unknown>;
}

export default function SortableHeaderCell({
  header,
  className,
}: SortableHeaderCellProps) {
  const isSorted = header.column.getIsSorted();
  const sortingEnabled = header.column.getCanSort();
  const sortDirection =
    isSorted === "asc"
      ? "ascending"
      : isSorted === "desc"
        ? "descending"
        : "none";

  return (
    <th
      aria-label={sortingEnabled ? "Click to sort." : " No sorting available."}
      aria-sort={sortingEnabled ? sortDirection : undefined}
      className={clsx(
        "sticky top-0 z-20 bg-gray-50 px-4 py-3 text-left text-gray-500 text-xs uppercase tracking-wider transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset dark:bg-gray-800 dark:text-gray-300",
        sortingEnabled &&
          "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700",
        className,
      )}
      key={header.id}
      onClick={
        sortingEnabled ? header.column.getToggleSortingHandler() : undefined
      }
      onKeyDown={(e) => {
        if (sortingEnabled === false || e.target !== e.currentTarget) {
          return;
        }

        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          header.column.getToggleSortingHandler()?.(e);
        }
      }}
      role="columnheader"
      tabIndex={sortingEnabled ? 0 : -1}
    >
      <div className="flex items-center space-x-1">
        {flexRender(header.column.columnDef.header, header.getContext())}
        {header.column.getCanSort() && (
          <span aria-hidden="true" className="text-gray-400">
            {header.column.getIsSorted() === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : header.column.getIsSorted() === "desc" ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronsUpDown className="h-4 w-4" />
            )}
          </span>
        )}
      </div>
    </th>
  );
}
