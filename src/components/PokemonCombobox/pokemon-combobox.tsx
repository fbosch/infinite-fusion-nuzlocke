"use client";

import { autoUpdate, flip, size, useFloating } from "@floating-ui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type React from "react";
import { useDeferredValue, useState } from "react";
import type { RouteEncounterPokemon } from "@/loaders/encounters";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { PokemonComboboxOptionContent } from "./pokemon-combobox-option-content";
import { PokemonComboboxShell } from "./pokemon-combobox-shell";
import { useComboboxDragAndDrop } from "./use-combobox-drag-and-drop";
import { useComboboxInputHandlers } from "./use-combobox-input-handlers";
import { useComboboxReferences } from "./use-combobox-references";
import { useComboboxSelection } from "./use-combobox-selection";
import { usePokemonComboboxOptions } from "./use-pokemon-combobox-options";

interface PokemonComboboxConfig {
  comboboxId?: string;
  disabled?: boolean;
  gameMode?: "classic" | "remix";
  isCustomLocation?: boolean;
  isFusion?: boolean;
  isRouteEncounterDataLoading?: boolean;
  locationId?: string;
  nicknamePlaceholder?: string;
  onActivate?: () => void;
  onBeforeClear?: (
    currentValue: PokemonOptionType,
  ) => Promise<boolean> | boolean;
  onBeforeOverwrite?: (
    currentValue: PokemonOptionType,
    newValue: PokemonOptionType,
  ) => Promise<boolean> | boolean;
  onChange: (value: PokemonOptionType | null) => void;
  onFusionChange?: (head: PokemonOptionType, body: PokemonOptionType) => void;
  placeholder?: string;
  ref?: React.RefObject<HTMLInputElement | null>;
  routeEncounterData?: RouteEncounterPokemon[];
  shouldLoad?: boolean;
  value: PokemonOptionType | null | undefined;
}

const DEFAULT_ROUTE_ENCOUNTER_DATA: RouteEncounterPokemon[] = [];

export const PokemonCombobox = ({
  config,
}: {
  config: PokemonComboboxConfig;
}) => {
  "use no memo";

  const {
    locationId,
    value,
    onChange,
    onFusionChange,
    onBeforeClear,
    onBeforeOverwrite,
    placeholder = "Select Pokemon",
    nicknamePlaceholder = "Enter nickname",
    disabled = false,
    comboboxId,
    ref,
    isFusion = false,
    shouldLoad = true,
    routeEncounterData = DEFAULT_ROUTE_ENCOUNTER_DATA,
    isRouteEncounterDataLoading = false,
    isCustomLocation = false,
    onActivate,
  } = config;

  const [query, setQuery] = useState("");
  const [isPokemonDataEnabled, setIsPokemonDataEnabled] = useState(false);
  const deferredQuery = useDeferredValue(query);

  // Use the drag and drop hook
  const {
    dragPreview,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleDragEnd,
  } = useComboboxDragAndDrop({
    comboboxId,
    locationId,
    onChange,
    value,
  });

  // Floating UI setup
  const { refs, floatingStyles, update, placement } = useFloating({
    middleware: [
      flip({ padding: 8 }),
      size({
        apply({ rects, elements, availableHeight, availableWidth }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.min(500, availableHeight - 8)}px`,
            minWidth: `${Math.min(rects.reference.width, availableWidth - 16)}px`,
          });
        },
        padding: 8,
      }),
    ],
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
  });
  const { inputRef, optionsRef, setInputReference, setOptionsReference } =
    useComboboxReferences({ floating: { refs, update }, forwardedRef: ref });

  const {
    finalOptions,
    fusionCombinationOption,
    gameMode,
    getPokemonSource,
    isDuplicatePokemon,
    isRoutePokemon,
    isShowingLoading,
  } = usePokemonComboboxOptions({
    deferredQuery,
    isCustomLocation,
    isFusion,
    isPokemonDataEnabled,
    isRouteEncounterDataLoading,
    onFusionChange,
    routeEncounterData,
  });

  const handleChange = useComboboxSelection({
    onBeforeOverwrite,
    onChange,
    onFusionChange,
    routeEncounterData,
    setQuery,
    value,
  });

  const { activatePokemonData, displayValue, handleClose, handleInputChange } =
    useComboboxInputHandlers({
      dragPreview,
      inputRef,
      onActivate,
      onBeforeClear,
      onChange,
      setIsPokemonDataEnabled,
      setQuery,
      value,
    });

  const shouldVirtualize = finalOptions.length > 30;

  // react-doctor-disable-next-line react-hooks-js/incompatible-library -- TanStack Virtual is intentionally excluded from compiler memoization above.
  const virtualizer = useVirtualizer({
    count: finalOptions.length,
    enabled: shouldVirtualize,
    estimateSize: () => 56,
    gap: 4,
    getScrollElement: () => optionsRef.current,
    overscan: 10,
    scrollPaddingEnd: 16,
    scrollPaddingStart: 16,
  });

  const optionsContent = (
    <PokemonComboboxOptionContent
      comboboxId={comboboxId}
      deferredQuery={deferredQuery}
      finalOptions={finalOptions}
      fusionCombinationOption={fusionCombinationOption}
      gameMode={gameMode}
      getPokemonSource={getPokemonSource}
      isDuplicatePokemon={isDuplicatePokemon}
      isRoutePokemon={isRoutePokemon}
      isShowingLoading={isShowingLoading}
      locationId={locationId}
      shouldVirtualize={shouldVirtualize}
      virtualizer={virtualizer}
    />
  );

  return (
    <PokemonComboboxShell
      combobox={{ disabled, handleChange, handleClose, value }}
      content={{
        comboboxId,
        displayValue,
        dragPreview,
        floatingStyles,
        locationId,
        onActivate: activatePokemonData,
        onChange,
        onInputChange: handleInputChange,
        optionsContent,
        placeholder,
        placement,
        setInputReference,
        setOptionsReference,
        shouldLoad: shouldLoad && isPokemonDataEnabled,
        shouldVirtualize,
        value,
        virtualizer,
      }}
      details={{
        disabled,
        dragPreview,
        nicknamePlaceholder,
        onChange,
        value,
      }}
      drag={{
        onDragEnd: handleDragEnd,
        onDragLeave: handleDragLeave,
        onDragOver: handleDragOver,
        onDrop: handleDrop,
      }}
    />
  );
};
