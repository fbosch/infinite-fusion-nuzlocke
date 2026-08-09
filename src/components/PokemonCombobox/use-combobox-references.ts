import type { useFloating } from "@floating-ui/react";
import type React from "react";
import { useCallback, useRef } from "react";

interface UseComboboxReferencesProps {
  forwardedRef: React.RefObject<HTMLInputElement | null> | undefined;
  refs: ReturnType<typeof useFloating>["refs"];
  update: ReturnType<typeof useFloating>["update"];
}

export function useComboboxReferences({
  forwardedRef,
  refs,
  update,
}: UseComboboxReferencesProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const setInputReference = useCallback(
    (element: HTMLInputElement | null) => {
      if (!element) {
        return;
      }

      inputRef.current = element;
      refs.setReference(element);
      update();
      if (forwardedRef && "current" in forwardedRef) {
        forwardedRef.current = element;
      }
    },
    [forwardedRef, refs, update],
  );
  const setOptionsReference = useCallback(
    (element: HTMLDivElement | null) => {
      optionsRef.current = element;
      refs.setFloating(element);
    },
    [refs],
  );

  return {
    inputRef,
    optionsRef,
    setInputReference,
    setOptionsReference,
  };
}
