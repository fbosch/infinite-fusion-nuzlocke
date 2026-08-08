"use client";

import {
  autoUpdate,
  FloatingPortal,
  flip,
  size,
  useFloating,
} from "@floating-ui/react";
import { Combobox, ComboboxInput, ComboboxOptions } from "@headlessui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import clsx from "clsx";
import { Loader2, Search } from "lucide-react";
import type React from "react";
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RouteEncounterPokemon } from "@/loaders/encounters";
import {
  isEgg,
  isPokemonEvolution,
  isPokemonPreEvolution,
  type PokemonOptionType,
  PokemonStatus,
  useAllPokemon,
  usePokemonSearch,
} from "@/loaders/pokemon";
import { useEncounters, useGameMode } from "@/stores/playthroughs/hooks";
import type { EncounterSource } from "@/types/encounters";
import { buildCapturedSpeciesIdSet } from "@/utils/encounter-utils";
import { DraggableComboboxSprite } from "./DraggableComboboxSprite";
import {
  applyEncounterDefaultStatus,
  getPokemonSources,
} from "./encounterSelection";

const NUMERIC_QUERY_REGEX = /^\d+$/;

import { resolveFusionCombination } from "./fusionCombination";
import { PokemonNicknameInput } from "./PokemonNicknameInput";
import {
  FusionCombinationOption,
  type FusionCombinationOption as FusionCombinationOptionType,
  isFusionCombinationOption,
  PokemonOption,
  PokemonOptions,
} from "./PokemonOptions";
import { PokemonStatusInput } from "./PokemonStatusInput";
import { PokemonEvolutionButton } from "./pokemon-evolution-button";
import { useComboboxDragAndDrop } from "./useComboboxDragAndDrop";

interface PokemonComboboxProps {
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
const EMPTY_POKEMON_OPTIONS: PokemonOptionType[] = [];

// Pokemon Combobox Component
export const PokemonCombobox = ({
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
}: PokemonComboboxProps) => {
  "use no memo";

  const [query, setQuery] = useState("");
  const [isPokemonDataEnabled, setIsPokemonDataEnabled] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const gameMode = useGameMode();
  const encounters = useEncounters();

  const activatePokemonData = () => {
    setIsPokemonDataEnabled(true);
    onActivate?.();
  };

  // Ref to maintain focus on input
  const inputRef = useRef<HTMLInputElement | null>(null);
  const optionsRef = useRef<HTMLDivElement | null>(null);

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

  const routePokemonIds = useMemo(
    () => new Set(routeEncounterData.map((pokemon) => pokemon.id)),
    [routeEncounterData],
  );

  const isRoutePokemon = useCallback(
    (pokemonId: number): boolean => routePokemonIds.has(pokemonId),
    [routePokemonIds],
  );

  const capturedSpeciesIds = useMemo(
    () => buildCapturedSpeciesIdSet(encounters),
    [encounters],
  );

  const isDuplicatePokemon = useCallback(
    (pokemonId: number): boolean => capturedSpeciesIds.has(pokemonId),
    [capturedSpeciesIds],
  );

  // Use the search hook
  const { data: resultsData, isLoading: isSearchLoading } = usePokemonSearch({
    enabled: isPokemonDataEnabled,
    query: deferredQuery,
  });
  const results = resultsData ?? EMPTY_POKEMON_OPTIONS;

  // Get all Pokemon for randomized mode
  const { data: allPokemonData, isLoading: isAllPokemonLoading } =
    useAllPokemon(isPokemonDataEnabled);
  const allPokemon = allPokemonData ?? EMPTY_POKEMON_OPTIONS;
  const fusionCombination =
    !isFusion && onFusionChange
      ? resolveFusionCombination(deferredQuery, allPokemon)
      : null;
  const fusionCombinationOption: FusionCombinationOptionType | null =
    fusionCombination
      ? { ...fusionCombination.head, fusionBody: fusionCombination.body }
      : null;

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

  // Function to get Pokemon source information
  const getPokemonSource = useCallback(
    (pokemonId: number): EncounterSource[] =>
      getPokemonSources(routeEncounterData, pokemonId),
    [routeEncounterData],
  );

  // Combine route matches with smart search results
  // fallow-ignore-next-line complexity -- Filtering, ordering, and deduplication must share one memoized option source.
  const finalOptions = useMemo(() => {
    if (isRouteEncounterDataLoading) {
      return [];
    }

    // Early return for empty query
    if (deferredQuery === "") {
      const shouldShowAllPokemon =
        gameMode === "randomized" ||
        isCustomLocation ||
        routeEncounterData.length === 0;

      // In randomized mode, custom locations, or locations without route data, show all Pokemon
      if (shouldShowAllPokemon) {
        // If still loading, return empty array to avoid showing incomplete data
        if (isAllPokemonLoading) {
          return [];
        }
        return allPokemon.flatMap((pokemon) => {
          const option = {
            id: pokemon.id,
            name: pokemon.name,
            nationalDexId: pokemon.nationalDexId,
          };

          return isFusion && isEgg(option) ? [] : [option];
        });
      }
      return routeEncounterData.filter(
        (pokemon) => !(isFusion && isEgg(pokemon)),
      );
    }

    // Early return if no search results and no route data
    if (results.length === 0 && routeEncounterData.length === 0) {
      return [];
    }

    // Check if query is numeric for route Pokemon
    const isNumericQuery = NUMERIC_QUERY_REGEX.test(deferredQuery.trim());

    let routeMatches: PokemonOptionType[] = [];

    if (isNumericQuery) {
      // For numeric queries, check both ID and National Dex ID
      const queryNum = Number.parseInt(deferredQuery, 10);
      routeMatches = routeEncounterData.filter(
        (pokemon) =>
          (pokemon.id === queryNum || pokemon.nationalDexId === queryNum) &&
          !(isFusion && isEgg(pokemon)),
      );
    } else {
      // For text queries, use name matching
      routeMatches = routeEncounterData.filter(
        (pokemon) =>
          pokemon.name.toLowerCase().includes(deferredQuery.toLowerCase()) &&
          !(isFusion && isEgg(pokemon)),
      );
    }

    // Filter search results to exclude eggs when in fusion mode
    const filteredResults = results.filter(
      (pokemon) => !(isFusion && isEgg(pokemon)),
    );

    // Combine results: route matches first, then smart search results
    const allResults = [...routeMatches, ...filteredResults];

    // Sort: in randomized mode, all Pokemon are equally available
    // In classic/remix modes, prioritize route Pokemon
    return allResults
      .sort((a, b) => {
        if (gameMode === "randomized") {
          // In randomized mode, maintain search relevance order
          return 0;
        }
        // In classic/remix modes, prioritize route Pokemon
        if (isRoutePokemon(a.id) && !isRoutePokemon(b.id)) {
          return -1;
        }
        if (!isRoutePokemon(a.id) && isRoutePokemon(b.id)) {
          return 1;
        }
        // For non-route Pokemon, maintain search order (already sorted by relevance)
        return 0;
      })
      .filter(
        (pokemon, index, self) =>
          index === self.findIndex((t) => t.id === pokemon.id),
      );
  }, [
    routeEncounterData,
    isRouteEncounterDataLoading,
    results,
    deferredQuery,
    isRoutePokemon,
    gameMode,
    allPokemon,
    isCustomLocation,
    isFusion,
    isAllPokemonLoading,
  ]);

  // Helper function to check if overwrite should be allowed
  const shouldAllowOverwrite = useCallback(
    async (
      currentValue: PokemonOptionType,
      newValue: PokemonOptionType,
    ): Promise<boolean> => {
      try {
        const [isEvolution, isPreEvolution] = await Promise.all([
          isPokemonEvolution(currentValue, newValue),
          isPokemonPreEvolution(currentValue, newValue),
        ]);
        const isEggHatching = isEgg(currentValue) && !isEgg(newValue);

        // Allow overwrite for natural progressions without confirmation
        return isEvolution || isPreEvolution || isEggHatching;
      } catch (error) {
        console.error("Error checking evolution relationship:", error);
        return false; // Err on the side of caution - require confirmation
      }
    },
    [],
  );

  // Helper function to apply egg hatching data preservation
  const applyEggHatchingPreservation = useCallback(
    (
      oldValue: PokemonOptionType,
      newValue: PokemonOptionType,
    ): PokemonOptionType => {
      if (!isEgg(oldValue) || isEgg(newValue)) {
        return newValue;
      }

      return {
        ...newValue,
        nickname: oldValue.nickname || newValue.nickname,
        status: oldValue.status || newValue.status,
      };
    },
    [],
  );

  // Helper function to apply default status based on Pokemon source
  const applyDefaultStatus = useCallback(
    (pokemon: PokemonOptionType): PokemonOptionType => {
      const sources = getPokemonSource(pokemon.id);
      return applyEncounterDefaultStatus(pokemon, sources);
    },
    [getPokemonSource],
  );

  const handleChange = useCallback(
    async (newValue: PokemonOptionType | null | undefined) => {
      // Early return for clearing value
      if (!newValue) {
        onChange(null);
        setQuery("");
        return;
      }

      if (isFusionCombinationOption(newValue)) {
        const { fusionBody, ...headOption } = newValue;
        const head = applyDefaultStatus(headOption);
        const body = applyDefaultStatus(fusionBody);
        onFusionChange?.(head, body);
        setQuery("");
        return;
      }

      // Early return if no current value or no overwrite callback
      if (!(value && onBeforeOverwrite)) {
        const finalValue = applyDefaultStatus(newValue);
        onChange(finalValue);
        setQuery("");
        return;
      }

      // Check if we should allow overwrite without confirmation
      const allowOverwrite = await shouldAllowOverwrite(value, newValue);
      if (!allowOverwrite) {
        const shouldOverwrite = await onBeforeOverwrite(value, newValue);
        if (!shouldOverwrite) {
          return;
        }
      }

      // Apply transformations in order
      let finalValue = applyEggHatchingPreservation(value, newValue);
      finalValue = applyDefaultStatus(finalValue);

      onChange(finalValue);
      setQuery("");
    },
    [
      onChange,
      value,
      onBeforeOverwrite,
      shouldAllowOverwrite,
      applyEggHatchingPreservation,
      applyDefaultStatus,
      onFusionChange,
    ],
  );

  // Memoize input change handler
  const handleInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = event.target.value;

      // Always update the query immediately for responsive UI
      startTransition(() => setQuery(inputValue));

      if (inputValue !== "") {
        return;
      }

      // If there's a current value and an onBeforeClear callback, check if clearing should proceed
      if (value && onBeforeClear) {
        const shouldClear = await onBeforeClear(value);
        if (!shouldClear) {
          // If clearing was cancelled, restore the input value to the pokemon name
          setQuery(value.name);
          return;
        }
      }

      // Clear the selection when input is cleared
      onChange(null);

      // Maintain focus on the input after clearing
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    },
    [onChange, value, onBeforeClear],
  );

  const handleClose = useCallback(() => {
    setQuery("");
  }, []);

  const displayValue = useCallback(
    (pokemon: PokemonOptionType | null | undefined) => {
      const displayPokemon = dragPreview || pokemon;
      return displayPokemon?.name || "";
    },
    [dragPreview],
  );

  const setInputReference = useCallback(
    (comboRef: HTMLInputElement | null) => {
      if (!comboRef) {
        return;
      }

      inputRef.current = comboRef;
      refs.setReference(comboRef);
      update();
      if (ref && "current" in ref) {
        ref.current = comboRef;
      }
    },
    [ref, refs, update],
  );

  const setOptionsReference = useCallback(
    (optionsElement: HTMLDivElement | null) => {
      if (!optionsElement) {
        return;
      }

      optionsRef.current = optionsElement;
      refs.setFloating(optionsElement);
    },
    [refs],
  );

  const isShowingLoading = useMemo(() => {
    // Show loading when:
    // 1. No query and all Pokemon are loading (for randomized/custom/empty-route locations)
    // 2. There's a query and search is loading, or all Pokemon are loading
    if (deferredQuery === "") {
      return (
        isRouteEncounterDataLoading ||
        ((gameMode === "randomized" ||
          isCustomLocation ||
          routeEncounterData.length === 0) &&
          isAllPokemonLoading)
      );
    }
    return !fusionCombination && (isSearchLoading || isAllPokemonLoading);
  }, [
    deferredQuery,
    gameMode,
    isCustomLocation,
    isAllPokemonLoading,
    isSearchLoading,
    routeEncounterData.length,
    isRouteEncounterDataLoading,
    fusionCombination,
  ]);

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

  let optionsContent: React.ReactNode;
  if (fusionCombinationOption) {
    optionsContent = (
      <FusionCombinationOption pokemon={fusionCombinationOption} />
    );
  } else if (isShowingLoading) {
    optionsContent = (
      <div className="relative cursor-default select-none px-4 py-2 text-center">
        <div className="text-gray-500 dark:text-gray-400">
          <p className="flex items-center justify-center gap-2 py-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading Pokémon...</span>
          </p>
        </div>
      </div>
    );
  } else if (shouldVirtualize) {
    optionsContent = virtualizer.getVirtualItems().map((virtualItem) => (
      <PokemonOption
        comboboxId={comboboxId || ""}
        disabled={virtualizer.isScrolling}
        gameMode={gameMode}
        getPokemonSource={getPokemonSource}
        index={virtualItem.index}
        isDuplicatePokemon={isDuplicatePokemon}
        isRoutePokemon={isRoutePokemon}
        key={virtualItem.key}
        locationId={locationId}
        pokemon={finalOptions[virtualItem.index]}
        style={{
          height: `${virtualItem.size}px`,
          left: "0.25rem",
          pointerEvents: virtualizer.isScrolling ? "none" : "auto",
          position: "absolute",
          top: "0",
          transform: `translateY(${virtualItem.start}px)`,
          width: "calc(100% - 8px)",
        }}
      />
    ));
  } else {
    optionsContent = (
      <PokemonOptions
        comboboxId={comboboxId || ""}
        deferredQuery={deferredQuery}
        finalOptions={finalOptions}
        gameMode={gameMode}
        getPokemonSource={getPokemonSource}
        isDuplicatePokemon={isDuplicatePokemon}
        isLoading={isShowingLoading}
        isRoutePokemon={isRoutePokemon}
        locationId={locationId}
      />
    );
  }

  return (
    <div
      className="relative"
      data-uid={dragPreview?.uid || value?.uid}
      id={value?.uid}
      onDragEnd={handleDragEnd}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        className="location-highlight-overlay pointer-events-none absolute inset-0 z-10 max-w-screen rounded-lg border-2 border-blue-500/60 bg-blue-500/20 opacity-0 transition-opacity duration-200 ease-in-out"
        data-combobox-id={comboboxId}
      />
      <Combobox
        disabled={disabled}
        immediate
        onChange={handleChange}
        onClose={handleClose}
        value={value || null}
      >
        {/* fallow-ignore-next-line complexity -- Headless UI render prop keeps combobox state colocated with its input and options. */}
        {({ open }) => (
          <div key={comboboxId}>
            <div className="relative">
              <ComboboxInput
                autoComplete="off"
                className={clsx(
                  "group/input rounded-t-md rounded-b-none border",
                  "w-full bg-white px-3 py-3.5 text-gray-900 text-sm outline-none focus:outline-none focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50",
                  "border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus-visible:ring-blue-400",
                  "hover:cursor-pointer focus:cursor-text",
                  (value || dragPreview) && "pl-16", // Add padding for sprite when value is selected or previewing
                  dragPreview &&
                    "border-blue-500 bg-blue-50 opacity-60 dark:bg-blue-900/20", // Highlight when showing preview with opacity,
                  {
                    "rounded-md": !(
                      placement.startsWith("bottom") ||
                      placement.startsWith("top")
                    ),
                    "rounded-t-md rounded-b-none":
                      open && placement.startsWith("bottom"),
                    "rounded-t-none rounded-b-md":
                      open && placement.startsWith("top"),
                  },
                )}
                displayValue={displayValue}
                onChange={handleInputChange}
                onFocus={activatePokemonData}
                onPointerEnter={activatePokemonData}
                placeholder={placeholder}
                ref={setInputReference}
                spellCheck={false}
              />
              <DraggableComboboxSprite
                comboboxId={comboboxId}
                dragPreview={dragPreview}
                locationId={locationId}
                value={value}
              />
              {open ||
              value?.status === PokemonStatus.DECEASED ||
              value?.status === PokemonStatus.MISSED ? null : (
                <PokemonEvolutionButton
                  locationId={locationId}
                  onChange={onChange}
                  shouldLoad={shouldLoad && isPokemonDataEnabled}
                  value={value}
                />
              )}
              {open ? (
                <Search
                  aria-hidden={true}
                  className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-600"
                />
              ) : null}
            </div>
            {open ? (
              <FloatingPortal id="location-table">
                <div
                  className={clsx(
                    // fallow-ignore-next-line css-token-drift -- Floating UI caps the list at 500px to match its middleware.
                    "relative z-40 h-full max-h-[31.25rem] overflow-y-auto",
                    "px-1 text-base shadow-lg focus:outline-none sm:text-sm",
                    "gap-x-2 bg-white dark:bg-gray-800",
                    "scrollbar-thin border border-gray-300 dark:border-gray-600",
                    {
                      "rounded-md": !(
                        placement.startsWith("bottom") ||
                        placement.startsWith("top")
                      ),
                      "rounded-t-md rounded-b-none border-b-0":
                        placement.startsWith("top"),
                      "rounded-t-none rounded-b-md border-t-0":
                        placement.startsWith("bottom"),
                    },
                  )}
                  ref={setOptionsReference}
                  style={{
                    ...floatingStyles,
                    height: shouldVirtualize
                      ? `${virtualizer.getTotalSize()}px`
                      : "auto",
                  }}
                >
                  <ComboboxOptions
                    className={clsx("h-full", {
                      "pointer-events-none": virtualizer.isScrolling,
                    })}
                  >
                    {optionsContent}
                  </ComboboxOptions>
                </div>
              </FloatingPortal>
            ) : null}
          </div>
        )}
      </Combobox>
      <div className="flex">
        <PokemonNicknameInput
          disabled={disabled}
          dragPreview={dragPreview}
          key={`${value?.uid}-${value?.nickname || "no-nickname"}`}
          onChange={onChange}
          placeholder={nicknamePlaceholder}
          value={value}
        />
        <PokemonStatusInput
          disabled={disabled}
          dragPreview={dragPreview}
          key={`${value?.uid}status`}
          onChange={onChange}
          value={value}
        />
      </div>
    </div>
  );
};
