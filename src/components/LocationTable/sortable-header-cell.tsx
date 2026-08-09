import { flexRender, type Header } from "@tanstack/react-table";
import clsx from "clsx";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { type KeyboardEvent, useCallback } from "react";
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
  let sortDirection: "ascending" | "descending" | "none" = "none";
  let sortIcon = <ChevronsUpDown className="h-4 w-4" />;
  if (isSorted === "asc") {
    sortDirection = "ascending";
    sortIcon = <ChevronUp className="h-4 w-4" />;
  } else if (isSorted === "desc") {
    sortDirection = "descending";
    sortIcon = <ChevronDown className="h-4 w-4" />;
  }

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTableCellElement>) => {
      if (sortingEnabled === false || event.target !== event.currentTarget) {
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        header.column.getToggleSortingHandler()?.(event);
      }
    },
    [header, sortingEnabled],
  );

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
      onKeyDown={handleKeyDown}
      role="columnheader"
      tabIndex={sortingEnabled ? 0 : -1}
    >
      <div className="flex items-center space-x-1">
        {flexRender(header.column.columnDef.header, header.getContext())}
        {header.column.getCanSort() && (
          <span aria-hidden="true" className="text-gray-400">
            {sortIcon}
          </span>
        )}
      </div>
    </th>
  );
}
