import type { Table } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type RefObject, useEffect } from "react";
import { onFlashUids, onScrollToLocation } from "@/lib/events";
import type { CombinedLocation } from "@/loaders/locations";
import {
  flashPokemonOverlaysByUids,
  runAfterScrollSettles,
} from "@/utils/scrollToLocation";

const LOCATION_ROW_HEIGHT_PX = 150;
const LOCATION_ROW_OVERSCAN_COUNT = 12;

export function useLocationTableVirtualization({
  table,
  tableContainerRef,
}: {
  table: Table<CombinedLocation>;
  tableContainerRef: RefObject<HTMLDivElement | null>;
}) {
  const tableRows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  // react-doctor-disable-next-line react-hooks-js/incompatible-library -- TanStack Virtual owns imperative scroll state outside compiler memoization.
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    estimateSize: () => LOCATION_ROW_HEIGHT_PX,
    getScrollElement: () => tableContainerRef.current,
    overscan: LOCATION_ROW_OVERSCAN_COUNT,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const virtualPaddingTop = virtualRows[0]?.start ?? 0;
  const virtualPaddingBottom = virtualRows.length
    ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
    : 0;

  useEffect(() => {
    const offScroll = onScrollToLocation(
      ({ behavior = "smooth", durationMs, highlightUids, locationId }) => {
        const index = tableRows.findIndex(
          (row) => row.original.id === locationId,
        );
        if (index < 0) {
          return false;
        }

        rowVirtualizer.scrollToIndex(index, { align: "center", behavior });
        if (!highlightUids?.length) {
          return true;
        }

        const flash = () =>
          flashPokemonOverlaysByUids(highlightUids, durationMs);
        const scrollElement = tableContainerRef.current;
        if (behavior === "smooth" && scrollElement) {
          runAfterScrollSettles(scrollElement, flash);
          return true;
        }
        window.requestAnimationFrame(flash);
        return true;
      },
    );
    const offFlash = onFlashUids(({ uids, durationMs }) => {
      flashPokemonOverlaysByUids(uids, durationMs);
    });
    return () => {
      offScroll();
      offFlash();
    };
  }, [rowVirtualizer, tableContainerRef, tableRows]);

  return {
    tableRows,
    virtualPaddingBottom,
    virtualPaddingTop,
    virtualRows,
    visibleColumns,
  };
}
