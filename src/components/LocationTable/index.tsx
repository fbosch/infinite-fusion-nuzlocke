"use client";

import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import clsx from "clsx";
import { LocateIcon, PlusIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMounted } from "@/hooks/use-mounted";
import { getLocationsSortedWithCustom } from "@/loaders";
import type { CombinedLocation } from "@/loaders/locations";
import { useCustomLocations, useIsLoading } from "@/stores/playthroughs/hooks";
import { playthroughActions } from "@/stores/playthroughs/index";
import type { EncounterData } from "@/stores/playthroughs/types";
import { scrollToMostRecentLocation } from "@/utils/scrollToLocation";
import { CursorTooltip } from "../cursor-tooltip";
import { locationTableColumnWidths } from "./columnWidths";
import LocationCell from "./location-cell";
import LocationTableHeader from "./LocationTableHeader";
import LocationTableRow from "./LocationTableRow";
import LocationTableSkeleton from "./LocationTableSkeleton";
import { useLocationTableVirtualization } from "./useLocationTableVirtualization";

const columnHelper = createColumnHelper<CombinedLocation>();

// Dynamically import the modal to reduce initial bundle size
const AddCustomLocationModal = dynamic(
  () =>
    import("./customLocations/AddCustomLocationModal").then(
      (mod) => mod.default,
    ),
  {
    loading: () => null,
    ssr: false,
  },
);

export default function LocationTable() {
  "use no memo";

  const [sorting, setSorting] = useState<SortingState>([]);
  const [isCustomLocationModalOpen, setIsCustomLocationModalOpen] =
    useState(false);
  const mounted = useMounted();
  const isLoading = useIsLoading();
  const customLocations = useCustomLocations();

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const data = useMemo(() => {
    try {
      return getLocationsSortedWithCustom(customLocations);
    } catch (error) {
      console.error("Failed to load locations:", error);
      return [];
    }
  }, [customLocations]);

  // Auto-scroll to recent encounter on page load
  useEffect(() => {
    if (mounted === false || isLoading || data.length === 0) {
      return;
    }

    window.requestAnimationFrame(() => {
      scrollToMostRecentLocation(
        (playthroughActions.getEncounters() || {}) as Record<
          string,
          EncounterData
        >,
        tableContainerRef.current,
        tableRef.current,
        "auto",
      );
    });
  }, [mounted, isLoading, data.length]);

  // Manual scroll handler
  const handleScrollToRecent = useCallback(() => {
    scrollToMostRecentLocation(
      (playthroughActions.getEncounters() || {}) as Record<
        string,
        EncounterData
      >,
      tableContainerRef.current,
      tableRef.current,
      "smooth",
    );
  }, []);

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        cell: (info) => (
          <LocationCell
            location={info.row.original}
            locationName={info.getValue()}
          />
        ),
        enableSorting: true,
        header: () => (
          <div className="flex w-full items-center">
            <span>Location</span>
            <div className="ml-2 flex items-center gap-1">
              <CursorTooltip
                content={"Scroll to most recent encounter"}
                delay={300}
              >
                <button
                  aria-label="Scroll to most recent encounter"
                  className={clsx(
                    "rounded-sm p-0.5 transition-colors duration-200",
                    "bg-gray-100 text-gray-600",
                    "border border-gray-200",
                    "dark:bg-gray-700 dark:text-gray-400",
                    "dark:border-gray-600",
                    "hover:border-green-500 hover:bg-green-600 hover:text-white",
                    "cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-1",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleScrollToRecent();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      handleScrollToRecent();
                    }
                  }}
                  type="button"
                >
                  <LocateIcon className="size-2.5" />
                </button>
              </CursorTooltip>
              <CursorTooltip content={"Add a custom location"} delay={300}>
                <button
                  aria-label="Add custom location"
                  className={clsx(
                    "rounded-sm p-0.5 transition-colors duration-200",
                    "bg-gray-100 text-gray-600",
                    "border border-gray-200",
                    "dark:bg-gray-700 dark:text-gray-400",
                    "dark:border-gray-600",
                    "hover:border-blue-500 hover:bg-blue-600 hover:text-white",
                    "cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCustomLocationModalOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      setIsCustomLocationModalOpen(true);
                    }
                  }}
                  type="button"
                >
                  <PlusIcon className="size-2.5" />
                </button>
              </CursorTooltip>
            </div>
          </div>
        ),
      }),
      columnHelper.display({
        cell: () => null, // Handled in render loop
        enableSorting: false,
        header: "",
        id: "sprite",
      }),
      columnHelper.display({
        cell: () => null, // Handled in render loop
        enableSorting: false,
        header: "Encounter",
        id: "encounter",
      }),
      columnHelper.display({
        cell: () => null, // Handled in render loop
        enableSorting: false,
        header: "",
        id: "actions",
      }),
    ],
    [handleScrollToRecent],
  );

  // react-doctor-disable-next-line react-hooks-js/incompatible-library -- TanStack Table is intentionally excluded from compiler memoization above.
  const table = useReactTable({
    columns,
    data,
    enableColumnFilters: false,
    // Performance optimizations
    enableColumnResizing: false,
    // Disable features we don't use to reduce bundle size
    enableGlobalFilter: false,
    enableMultiSort: false,
    enableRowSelection: false,
    enableSorting: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });
  const {
    tableRows,
    virtualPaddingBottom,
    virtualPaddingTop,
    virtualRows,
    visibleColumns,
  } = useLocationTableVirtualization({
    table,
    tableContainerRef,
  });

  // Show skeleton loading state while component is mounting or store is initializing from IndexedDB
  if (mounted === false || isLoading) {
    return <LocationTableSkeleton />;
  }

  // Show loading state if no data
  if (data.length === 0) {
    return (
      <div
        aria-live="polite"
        className="flex items-center justify-center p-8"
        role="status"
      >
        <div className="text-gray-500 dark:text-gray-400">
          No location data available
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border-gray-200 border-y md:border xl:shadow-sm 2xl:rounded-lg dark:border-gray-700">
      <div
        className="scrollbar-thin relative max-h-[93.5vh] overflow-auto overscroll-x-none"
        ref={tableContainerRef}
      >
        <table
          aria-label="Locations table"
          aria-rowcount={tableRows.length + 1}
          className="w-full min-w-full table-fixed divide-y divide-gray-200 overscroll-y-auto overscroll-x-contain dark:divide-gray-700"
          data-scroll-container
          ref={tableRef}
        >
          <colgroup>
            {visibleColumns.map((column) => (
              <col
                className={
                  column.id === "encounter"
                    ? undefined
                    : locationTableColumnWidths[column.id]
                }
                key={column.id}
              />
            ))}
          </colgroup>
          <LocationTableHeader headerGroups={table.getHeaderGroups()} />
          <tbody
            className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900"
            id="location-table"
          >
            {virtualPaddingTop > 0 && (
              // biome-ignore lint/a11y/noAriaHiddenOnFocusable: virtual spacer rows never receive focus.
              <tr aria-hidden="true" className="border-0">
                <td
                  colSpan={visibleColumns.length}
                  style={{ height: virtualPaddingTop }}
                />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const row = tableRows[virtualRow.index];
              return (
                <LocationTableRow
                  key={row.id}
                  row={row}
                  rowIndex={virtualRow.index}
                />
              );
            })}
            {virtualPaddingBottom > 0 && (
              // biome-ignore lint/a11y/noAriaHiddenOnFocusable: virtual spacer rows never receive focus.
              <tr aria-hidden="true" className="border-0">
                <td
                  colSpan={visibleColumns.length}
                  style={{ height: virtualPaddingBottom }}
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <AddCustomLocationModal
        isOpen={isCustomLocationModalOpen}
        onClose={() => setIsCustomLocationModalOpen(false)}
      />
    </div>
  );
}
