import type { useFloating } from "@floating-ui/react";
import type React from "react";
import { useCallback, useRef } from "react";

interface UseComboboxReferencesProps {
  floating: Pick<ReturnType<typeof useFloating>, "refs" | "update">;
  forwardedRef: React.RefObject<HTMLInputElement | null> | undefined;
}

export function useComboboxReferences({
  floating,
  forwardedRef,
}: UseComboboxReferencesProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const setInputReference = useCallback(
    (element: HTMLInputElement | null) => {
      if (!element) {
        return;
      }

      inputRef.current = element;
      floating.refs.setReference(element);
      floating.update();
      if (forwardedRef && "current" in forwardedRef) {
        forwardedRef.current = element;
      }
    },
    [floating, forwardedRef],
  );
  const setOptionsReference = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) {
        return;
      }

      optionsRef.current = element;
      floating.refs.setFloating(element);
    },
    [floating],
  );

  return { inputRef, optionsRef, setInputReference, setOptionsReference };
}
