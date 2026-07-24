import type { Table } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { onFlashUids, onScrollToLocation } from "@/lib/events";
import type { CombinedLocation } from "@/loaders/locations";
import {
  flashPokemonOverlaysByUids,
  runAfterScrollSettles,
} from "@/utils/scrollToLocation";

const LOCATION_ROW_HEIGHT_PX = 150;
const LOCATION_ROW_OVERSCAN_COUNT = 4;

function useContainerLayoutSnapshot(
  tableContainerElement: HTMLDivElement | null,
) {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!tableContainerElement) return () => {};

      const resizeObserver =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(notify);
      resizeObserver?.observe(tableContainerElement);
      document.fonts?.addEventListener("loadingdone", notify);

      return () => {
        resizeObserver?.disconnect();
        document.fonts?.removeEventListener("loadingdone", notify);
      };
    },
    [tableContainerElement],
  );
  const getSnapshot = useCallback(() => {
    const width = tableContainerElement?.clientWidth ?? 0;
    return `${width}:${document.fonts?.status ?? "unavailable"}`;
  }, [tableContainerElement]);

  return useSyncExternalStore(subscribe, getSnapshot, () => "0:unavailable");
}

export function useLocationTableVirtualization({
  table,
  tableContainerElement,
  tableContainerRef,
  tableRef,
}: {
  table: Table<CombinedLocation>;
  tableContainerElement: HTMLDivElement | null;
  tableContainerRef: RefObject<HTMLDivElement | null>;
  tableRef: RefObject<HTMLTableElement | null>;
}) {
  const [measuredTableLayout, setMeasuredTableLayout] = useState<{
    columnWidths: number[];
    snapshot: string;
    width: number;
  } | null>(null);
  const layoutSnapshot = useContainerLayoutSnapshot(tableContainerElement);
  const tableRows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  // react-doctor-disable-next-line react-hooks-js/incompatible-library -- TanStack Virtual owns imperative scroll state outside compiler memoization.
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
    if (virtualRows.length === 0) return;

    if (
      measuredTableLayout &&
      measuredTableLayout.snapshot !== layoutSnapshot
    ) {
      setMeasuredTableLayout(null);
      return;
    }
    if (measuredTableLayout) return;

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

    setMeasuredTableLayout({ columnWidths, snapshot: layoutSnapshot, width });
  }, [
    layoutSnapshot,
    measuredTableLayout,
    virtualRows.length,
    visibleColumns.length,
  ]);

  useEffect(() => {
    const offScroll = onScrollToLocation(
      ({ behavior = "smooth", durationMs, highlightUids, locationId }) => {
        const index = tableRows.findIndex(
          (row) => row.original.id === locationId,
        );
        if (index < 0) return false;

        rowVirtualizer.scrollToIndex(index, { align: "center", behavior });
        if (!highlightUids?.length) return true;

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
