import type { EncounterData } from '@/stores/playthroughs';

/**
 * Find the most recently filled out location based on encounter updatedAt timestamps
 */
export function findMostRecentlyFilledLocation(
  encounters: Record<string, EncounterData>
): string | null {
  if (!encounters || Object.keys(encounters).length === 0) {
    return null;
  }

  let mostRecentLocationId: string | null = null;
  let mostRecentTimestamp = 0;

  for (const [locationId, encounter] of Object.entries(encounters)) {
    // Check if the encounter has any Pokemon (head or body)
    const hasEncounter = encounter.head || encounter.body;

    if (hasEncounter && encounter.updatedAt > mostRecentTimestamp) {
      mostRecentTimestamp = encounter.updatedAt;
      mostRecentLocationId = locationId;
    }
  }

  return mostRecentLocationId;
}

/**
 * Scroll to a specific table row within the table container
 */
export function scrollToTableRow(
  tableContainerElement: HTMLElement,
  targetRowElement: HTMLElement,
  behavior: ScrollBehavior = 'smooth'
): void {
  if (!tableContainerElement || !targetRowElement) {
    return;
  }

  // Simple: scroll the target row to the center of the container
  const containerHeight = tableContainerElement.clientHeight;
  const targetTop = targetRowElement.offsetTop;
  const targetHeight = targetRowElement.offsetHeight;

  tableContainerElement.scrollTo({
    top: targetTop - containerHeight / 2 + targetHeight / 2,
    behavior,
  });
}

/**
 * Find a table row element by location ID
 */
export function findTableRowByLocationId(
  tableElement: HTMLElement,
  locationId: string
): HTMLElement | null {
  return tableElement.querySelector(
    `tbody tr[data-location-id="${locationId}"]`
  ) as HTMLElement | null;
}

/**
 * Scroll to the most recently filled out location
 */
export function scrollToMostRecentLocation(
  encounters: Record<string, EncounterData>,
  tableContainerElement: HTMLElement | null,
  tableElement: HTMLElement | null,
  behavior: ScrollBehavior = 'smooth'
): boolean {
  if (!tableContainerElement || !tableElement) return false;

  const recentLocationId = findMostRecentlyFilledLocation(encounters);
  if (!recentLocationId) return false;

  const targetRow = findTableRowByLocationId(tableElement, recentLocationId);
  if (!targetRow) return false;

  scrollToTableRow(tableContainerElement, targetRow, behavior);
  return true;
}

/**
 * Temporarily highlight a table row element
 */
export function flashTableRow(
  rowElement: HTMLElement,
  durationMs: number = 1200
): void {
  if (!rowElement) return;
  const highlightClasses = [
    'ring-2',
    'ring-green-500/60',
    'bg-green-50',
    'dark:bg-green-900/20',
  ];

  rowElement.classList.add(...highlightClasses);
  window.setTimeout(() => {
    rowElement.classList.remove(...highlightClasses);
  }, durationMs);
}

/**
 * Temporarily highlight Pokemon combobox overlays by their data-uid
 */
export function flashPokemonOverlaysByUids(
  uids: string[],
  durationMs: number = 1200
): void {
  if (!uids || uids.length === 0) return;

  // Keep teardown timers per element to avoid blink when re-applied
  const hideTimers = new WeakMap<HTMLElement, number>();

  const apply = () => {
    uids.forEach(uid => {
      if (!uid) return;
      const root = document.querySelector(
        `[data-uid="${CSS.escape(uid)}"]`
      ) as HTMLElement | null;
      if (!root) return;
      const overlay = root.querySelector(
        '.location-highlight-overlay'
      ) as HTMLElement | null;
      if (!overlay) return;

      // Inline style overrides Tailwind opacity classes; do not toggle classes
      overlay.style.transition =
        overlay.style.transition || 'opacity 180ms ease-in-out';
      overlay.style.opacity = '1';

      const prev = hideTimers.get(overlay);
      if (prev) window.clearTimeout(prev);
      const timeout = window.setTimeout(() => {
        overlay.style.removeProperty('opacity');
      }, durationMs);
      hideTimers.set(overlay, timeout);
    });
  };

  // Apply now and on next frame to cover DOM updates during smooth scroll
  apply();
  window.requestAnimationFrame(apply);
}

/**
 * Run a callback after scrolling settles for a short debounce window
 */
export function runAfterScrollSettles(
  container: HTMLElement,
  callback: () => void,
  settleDelayMs: number = 150,
  maxWaitMs: number = 1200
): void {
  let timeoutId: number | null = null;
  let totalWait = 0;

  const done = () => {
    container.removeEventListener('scroll', onScroll, listenerOptions);
    callback();
  };

  const onScroll = () => {
    if (timeoutId) window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => done(), settleDelayMs);
  };

  const listenerOptions: AddEventListenerOptions & EventListenerOptions = {
    passive: true,
  };
  container.addEventListener('scroll', onScroll, listenerOptions);

  // Fallback in case no scroll events fire or smooth-scroll is instantaneous
  const interval = window.setInterval(() => {
    totalWait += settleDelayMs;
    if (totalWait >= maxWaitMs) {
      window.clearInterval(interval);
      done();
    }
  }, settleDelayMs);
}

/**
 * Scroll to a specific location row by id and optionally flash highlights
 */
export function scrollToLocationById(
  locationId: string,
  options?: {
    behavior?: ScrollBehavior;
    highlightUids?: string[];
    durationMs?: number;
  }
): boolean {
  if (!locationId) return false;

  const behavior = options?.behavior ?? 'smooth';

  const tableElement = document.querySelector(
    'table[aria-label="Locations table"]'
  ) as HTMLElement | null;
  if (!tableElement) return false;

  const tableContainerElement =
    tableElement.parentElement as HTMLElement | null;
  if (!tableContainerElement) return false;

  const targetRow = findTableRowByLocationId(tableElement, locationId);
  if (!targetRow) return false;

  // Determine if target row is already fully visible within container
  const containerHeight = tableContainerElement.clientHeight;
  const rowTop = targetRow.offsetTop;
  const rowHeight = targetRow.offsetHeight;
  const rowBottom = rowTop + rowHeight;
  const viewTop = tableContainerElement.scrollTop;
  const viewBottom = viewTop + containerHeight;
  const margin = 8; // small margin
  const isInView =
    rowTop >= viewTop - margin && rowBottom <= viewBottom + margin;

  if (!isInView) {
    scrollToTableRow(tableContainerElement, targetRow, behavior);
  }

  if (options?.highlightUids && options.highlightUids.length > 0) {
    const uids = options.highlightUids as string[];
    const durationMs = options.durationMs ?? 1200;

    // Always attempt immediate highlight (fast feedback)
    flashPokemonOverlaysByUids(uids, durationMs);

    // If we scrolled or lazy content may mount, re-apply after scroll settles
    if (!isInView) {
      runAfterScrollSettles(
        tableContainerElement,
        () => flashPokemonOverlaysByUids(uids, durationMs),
        120,
        1200
      );
    }
  }

  return true;
}
