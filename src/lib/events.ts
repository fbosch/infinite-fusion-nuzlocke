export const EVOLUTION_EVENT = 'pokemon:evolved';

export type EvolutionEventDetail = {
  locationId: string;
};

export function emitEvolutionEvent(locationId: string): void {
  if (typeof window === 'undefined' || !locationId) return;
  const event = new CustomEvent<EvolutionEventDetail>(EVOLUTION_EVENT, {
    detail: { locationId },
  });
  window.dispatchEvent(event);
}

export function addEvolutionListener(
  handler: (detail: EvolutionEventDetail) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const listener = (e: Event) => {
    const custom = e as CustomEvent<EvolutionEventDetail>;
    if (custom?.detail) handler(custom.detail);
  };

  window.addEventListener(EVOLUTION_EVENT, listener as EventListener);
  return () =>
    window.removeEventListener(EVOLUTION_EVENT, listener as EventListener);
}
