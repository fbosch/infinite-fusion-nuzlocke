import type { Table } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type RefObject, useEffect, useLayoutEffect, useState } from "react";
import { onFlashUids, onScrollToLocation } from "@/lib/events";
import type { CombinedLocation } from "@/loaders/locations";
import {
  flashPokemonOverlaysByUids,
  runAfterScrollSettles,
} from "@/utils/scrollToLocation";

const LOCATION_ROW_HEIGHT_PX = 150;
const LOCATION_ROW_OVERSCAN_COUNT = 4;

export function useLocationTableVirtualization({
  table,
  tableContainerRef,
  tableRef,
}: {
  table: Table<CombinedLocation>;
  tableContainerRef: RefObject<HTMLDivElement | null>;
  tableRef: RefObject<HTMLTableElement | null>;
}) {
  const [measuredTableLayout, setMeasuredTableLayout] = useState<{
    columnWidths: number[];
    width: number;
  } | null>(null);
  const tableRows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => LOCATION_ROW_HEIGHT_PX,
    overscan: LOCATION_ROW_OVERSCAN_COUNT,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const virtualPaddingTop = virtualRows[0]?.start ?? 0;
  const virtualPaddingBottom = virtualRows.length
    ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
    : 0;

  useLayoutEffect(() => {
    if (measuredTableLayout || virtualRows.length === 0) return;

    const tableElement = tableRef.current;
    if (!tableElement) return;

    const headerCells = Array.from(
      tableElement.querySelectorAll<HTMLTableCellElement>(
        "thead tr:first-child > th",
      ),
    );
    const width = tableElement.getBoundingClientRect().width;
    const columnWidths = headerCells.map(
      (headerCell) => headerCell.getBoundingClientRect().width,
    );

    if (
      width === 0 ||
      columnWidths.length !== visibleColumns.length ||
      columnWidths.some((columnWidth) => columnWidth === 0)
    ) {
      return;
    }

    setMeasuredTableLayout({ columnWidths, width });
  }, [measuredTableLayout, virtualRows.length, visibleColumns.length]);

  useEffect(() => {
    const offScroll = onScrollToLocation(
      ({ behavior = "smooth", durationMs, highlightUids, locationId }) => {
        const index = tableRows.findIndex(
          (row) => row.original.id === locationId,
        );
        if (index < 0) return;

        rowVirtualizer.scrollToIndex(index, { align: "center", behavior });
        if (!highlightUids?.length) return;

        const flash = () =>
          flashPokemonOverlaysByUids(highlightUids, durationMs);
        const scrollElement = tableContainerRef.current;
        if (behavior === "smooth" && scrollElement) {
          runAfterScrollSettles(scrollElement, flash);
          return;
        }
        window.requestAnimationFrame(flash);
      },
    );
    const offFlash = onFlashUids(({ uids, durationMs }) => {
      flashPokemonOverlaysByUids(uids, durationMs);
    });
    return () => {
      offScroll();
      offFlash();
    };
  }, [rowVirtualizer, tableRows]);

  return {
    measuredTableLayout,
    tableRows,
    virtualPaddingBottom,
    virtualPaddingTop,
    virtualRows,
    visibleColumns,
  };
}
