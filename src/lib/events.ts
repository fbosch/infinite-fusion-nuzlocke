import mitt from 'mitt';

export const EVOLUTION_EVENT = 'pokemon:evolved' as const;
export const LOCATIONS_SCROLL_TO = 'locations:scrollTo' as const;
export const LOCATIONS_FLASH_UIDS = 'locations:flashUids' as const;

type AppEvents = {
  [EVOLUTION_EVENT]: { locationId: string };
  [LOCATIONS_SCROLL_TO]: { locationId: string };
  [LOCATIONS_FLASH_UIDS]: { uids: string[]; durationMs?: number };
};

const emitter = mitt<AppEvents>();

export type EvolutionEventDetail = { locationId: string };

export function emitEvolutionEvent(locationId: string): void {
  if (!locationId) return;
  emitter.emit(EVOLUTION_EVENT, { locationId });
}

export function addEvolutionListener(
  handler: (detail: EvolutionEventDetail) => void
): () => void {
  const fn = (payload: EvolutionEventDetail) => handler(payload);
  emitter.on(EVOLUTION_EVENT, fn);
  return () => emitter.off(EVOLUTION_EVENT, fn);
}

export function emitScrollToLocation(locationId: string): void {
  if (!locationId) return;
  emitter.emit(LOCATIONS_SCROLL_TO, { locationId });
}

export function onScrollToLocation(
  handler: (payload: { locationId: string }) => void
): () => void {
  emitter.on(LOCATIONS_SCROLL_TO, handler);
  return () => emitter.off(LOCATIONS_SCROLL_TO, handler);
}

export function emitFlashUids(uids: string[], durationMs?: number): void {
  if (!uids || uids.length === 0) return;
  emitter.emit(LOCATIONS_FLASH_UIDS, { uids, durationMs });
}

export function onFlashUids(
  handler: (payload: { uids: string[]; durationMs?: number }) => void
): () => void {
  emitter.on(LOCATIONS_FLASH_UIDS, handler);
  return () => emitter.off(LOCATIONS_FLASH_UIDS, handler);
}
