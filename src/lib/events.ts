import mitt from "mitt";

const EVOLUTION_EVENT = "pokemon:evolved" as const;
const LOCATIONS_SCROLL_TO = "locations:scrollTo" as const;
const LOCATIONS_FLASH_UIDS = "locations:flashUids" as const;

type AppEvents = {
  [EVOLUTION_EVENT]: { locationId: string };
  [LOCATIONS_SCROLL_TO]: ScrollToLocationDetail;
  [LOCATIONS_FLASH_UIDS]: { uids: string[]; durationMs?: number };
};

const emitter = mitt<AppEvents>();
let scrollToLocationHandlerCount = 0;

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
  handler: (payload: ScrollToLocationDetail) => void,
): () => void {
  emitter.on(LOCATIONS_SCROLL_TO, handler);
  scrollToLocationHandlerCount += 1;
  return () => {
    emitter.off(LOCATIONS_SCROLL_TO, handler);
    scrollToLocationHandlerCount -= 1;
  };
}

export function emitScrollToLocation(detail: ScrollToLocationDetail): boolean {
  if (!detail.locationId || scrollToLocationHandlerCount === 0) return false;
  emitter.emit(LOCATIONS_SCROLL_TO, detail);
  return true;
}

export function onFlashUids(
  handler: (payload: { uids: string[]; durationMs?: number }) => void,
): () => void {
  emitter.on(LOCATIONS_FLASH_UIDS, handler);
  return () => emitter.off(LOCATIONS_FLASH_UIDS, handler);
}
