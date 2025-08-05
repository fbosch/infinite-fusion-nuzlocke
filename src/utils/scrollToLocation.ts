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
