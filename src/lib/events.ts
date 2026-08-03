import mitt from "mitt";

const EVOLUTION_EVENT = "pokemon:evolved" as const;
const LOCATIONS_FLASH_UIDS = "locations:flashUids" as const;

type AppEvents = {
  [EVOLUTION_EVENT]: { locationId: string };
  [LOCATIONS_FLASH_UIDS]: { uids: string[]; durationMs?: number };
};

const emitter = mitt<AppEvents>();
const scrollToLocationHandlers = new Set<
  (payload: ScrollToLocationDetail) => boolean
>();

export type EvolutionEventDetail = { locationId: string };
export type ScrollToLocationDetail = {
  locationId: string;
  behavior?: ScrollBehavior;
  highlightUids?: string[];
  durationMs?: number;
};

export function emitEvolutionEvent(locationId: string): void {
  if (!locationId) return;
  emitter.emit(EVOLUTION_EVENT, { locationId });
}

export function addEvolutionListener(
  handler: (detail: EvolutionEventDetail) => void,
): () => void {
  const fn = (payload: EvolutionEventDetail) => handler(payload);
  emitter.on(EVOLUTION_EVENT, fn);
  return () => emitter.off(EVOLUTION_EVENT, fn);
}

export function onScrollToLocation(
  handler: (payload: ScrollToLocationDetail) => boolean,
): () => void {
  scrollToLocationHandlers.add(handler);
  return () => {
    scrollToLocationHandlers.delete(handler);
  };
}

export function emitScrollToLocation(detail: ScrollToLocationDetail): boolean {
  if (!detail.locationId || scrollToLocationHandlers.size === 0) return false;

  let wasHandled = false;
  for (const handler of scrollToLocationHandlers) {
    wasHandled = handler(detail) || wasHandled;
  }
  return wasHandled;
}

export function onFlashUids(
  handler: (payload: { uids: string[]; durationMs?: number }) => void,
): () => void {
  emitter.on(LOCATIONS_FLASH_UIDS, handler);
  return () => emitter.off(LOCATIONS_FLASH_UIDS, handler);
}
