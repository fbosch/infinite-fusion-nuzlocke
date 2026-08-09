import type { DragEvent, ReactNode } from "react";
import { useEffect, useRef } from "react";

interface PokemonComboboxDragSurfaceProps {
  children: ReactNode;
  className: string;
  dataUid: string | undefined;
  id: string | undefined;
  onDragEnd: () => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}

export function PokemonComboboxDragSurface({
  children,
  className,
  dataUid,
  id,
  onDragEnd,
  onDragLeave,
  onDragOver,
  onDrop,
}: PokemonComboboxDragSurfaceProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (surface === null) {
      return;
    }

    const toReactDragEvent = (event: globalThis.DragEvent) =>
      event as unknown as DragEvent<HTMLDivElement>;
    const handleDragLeave = (event: globalThis.DragEvent) =>
      onDragLeave(toReactDragEvent(event));
    const handleDragOver = (event: globalThis.DragEvent) =>
      onDragOver(toReactDragEvent(event));
    const handleDrop = (event: globalThis.DragEvent) =>
      onDrop(toReactDragEvent(event));

    surface.addEventListener("dragend", onDragEnd);
    surface.addEventListener("dragleave", handleDragLeave);
    surface.addEventListener("dragover", handleDragOver);
    surface.addEventListener("drop", handleDrop);

    return () => {
      surface.removeEventListener("dragend", onDragEnd);
      surface.removeEventListener("dragleave", handleDragLeave);
      surface.removeEventListener("dragover", handleDragOver);
      surface.removeEventListener("drop", handleDrop);
    };
  }, [onDragEnd, onDragLeave, onDragOver, onDrop]);

  return (
    <div className={className} data-uid={dataUid} id={id} ref={surfaceRef}>
      {children}
    </div>
  );
}
