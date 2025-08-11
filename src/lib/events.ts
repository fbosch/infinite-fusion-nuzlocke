import mitt from 'mitt';

export const EVOLUTION_EVENT = 'pokemon:evolved' as const;

type AppEvents = {
  [EVOLUTION_EVENT]: { locationId: string };
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
