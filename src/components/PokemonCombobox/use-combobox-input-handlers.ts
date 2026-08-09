import type React from "react";
import { startTransition, useCallback } from "react";
import type { PokemonOptionType } from "@/loaders/pokemon";

interface UseComboboxInputHandlersProps {
  dragPreview: PokemonOptionType | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onActivate: (() => void) | undefined;
  onBeforeClear:
    | ((currentValue: PokemonOptionType) => Promise<boolean> | boolean)
    | undefined;
  onChange: (value: PokemonOptionType | null) => void;
  setIsPokemonDataEnabled: (enabled: boolean) => void;
  setQuery: (query: string) => void;
  value: PokemonOptionType | null | undefined;
}

export function useComboboxInputHandlers({
  dragPreview,
  inputRef,
  onActivate,
  onBeforeClear,
  onChange,
  setIsPokemonDataEnabled,
  setQuery,
  value,
}: UseComboboxInputHandlersProps) {
  const activatePokemonData = useCallback(() => {
    setIsPokemonDataEnabled(true);
    onActivate?.();
  }, [onActivate, setIsPokemonDataEnabled]);
  const handleClose = useCallback(() => setQuery(""), [setQuery]);
  const displayValue = useCallback(
    (pokemon: PokemonOptionType | null | undefined) =>
      (dragPreview || pokemon)?.name || "",
    [dragPreview],
  );
  const handleInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = event.target.value;
      startTransition(() => setQuery(inputValue));

      if (inputValue !== "") {
        return;
      }

      if (value && onBeforeClear && !(await onBeforeClear(value))) {
        setQuery(value.name);
        return;
      }

      onChange(null);
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [inputRef, onBeforeClear, onChange, setQuery, value],
  );

  return { activatePokemonData, displayValue, handleClose, handleInputChange };
}
