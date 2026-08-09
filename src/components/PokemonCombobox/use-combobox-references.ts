import type { useFloating } from "@floating-ui/react";
import type React from "react";
import { useCallback, useRef, useState } from "react";

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
  const forwardedRefRef = useRef(forwardedRef);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const refsRef = useRef(refs);
  const updateRef = useRef(update);
  const [optionsElement, setOptionsElement] = useState<HTMLDivElement | null>(
    null,
  );
  forwardedRefRef.current = forwardedRef;
  refsRef.current = refs;
  updateRef.current = update;
  const setInputReference = useCallback((element: HTMLInputElement | null) => {
    if (!element) {
      return;
    }

    inputRef.current = element;
    refsRef.current.setReference(element);
    updateRef.current();
    const currentForwardedRef = forwardedRefRef.current;
    if (currentForwardedRef && "current" in currentForwardedRef) {
      currentForwardedRef.current = element;
    }
  }, []);
  const setOptionsReference = useCallback((element: HTMLDivElement | null) => {
    optionsRef.current = element;
    setOptionsElement((current) => (current === element ? current : element));
    refsRef.current.setFloating(element);
  }, []);

  return {
    inputRef,
    optionsElement,
    optionsRef,
    setInputReference,
    setOptionsReference,
  };
}
