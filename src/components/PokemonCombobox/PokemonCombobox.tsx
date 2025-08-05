'use client';

import React, {
  useState,
  useMemo,
  useDeferredValue,
  startTransition,
  useCallback,
  useRef,
} from 'react';
import { Combobox, ComboboxInput, ComboboxOptions } from '@headlessui/react';
import {
  useFloating,
  autoUpdate,
  flip,
  size,
  FloatingPortal,
} from '@floating-ui/react';
import clsx from 'clsx';
import { Loader2, Search } from 'lucide-react';
import {
  PokemonStatus,
  type PokemonOptionType,
  type PokemonStatusType,
  useAllPokemon,
  isPokemonEvolution,
  isPokemonPreEvolution,
  isEgg,
} from '@/loaders/pokemon';
import { dragActions } from '@/stores/dragStore';
import { useActivePlaythrough, useGameMode } from '@/stores/playthroughs';
import { PokemonEvolutionButton } from './PokemonEvolutionButton';
import { PokemonNicknameInput } from './PokemonNicknameInput';
import { PokemonStatusInput } from './PokemonStatusInput';
import { useComboboxDragAndDrop } from './useComboboxDragAndDrop';
import {
  EncounterSource,
  useEncountersForLocation,
} from '@/loaders/encounters';
import { usePokemonSearch } from '@/loaders/pokemon';
import { useVirtualizer } from '@tanstack/react-virtual';
import { PokemonOption, PokemonOptions } from './PokemonOptions';
import { PokemonSprite } from '../PokemonSprite';

interface PokemonComboboxProps {
  locationId?: string;
  value: PokemonOptionType | null | undefined;
  onChange: (value: PokemonOptionType | null) => void;
  onBeforeClear?: (
    currentValue: PokemonOptionType
  ) => Promise<boolean> | boolean;
  onBeforeOverwrite?: (
    currentValue: PokemonOptionType,
    newValue: PokemonOptionType
  ) => Promise<boolean> | boolean;
  placeholder?: string;
  nicknamePlaceholder?: string;
  disabled?: boolean;
  gameMode?: 'classic' | 'remix';
  comboboxId?: string;
  ref?: React.RefObject<HTMLInputElement | null>;
  isFusion?: boolean;
  shouldLoad?: boolean;
}

// Pokemon Combobox Component
export const PokemonCombobox = React.memo(
  ({
    locationId,
    value,
    onChange,
    onBeforeClear,
    onBeforeOverwrite,
    placeholder = 'Select Pokemon',
    nicknamePlaceholder = 'Enter nickname',
    disabled = false,
    comboboxId,
    ref,
    isFusion = false,
    shouldLoad = true,
  }: PokemonComboboxProps) => {
    const [query, setQuery] = useState('');
    const deferredQuery = useDeferredValue(query);
    const gameMode = useGameMode();
    const playthrough = useActivePlaythrough();

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
      value,
      onChange,
    });

    const isCustomLocation = useMemo(() => {
      return playthrough?.customLocations?.some(
        location => location.id === locationId
      );
    }, [playthrough, locationId]);

    // Use the encounter data hook (now handles custom locations automatically)
    const { routeEncounterData, isRoutePokemon } = useEncountersForLocation({
      locationId,
      enabled: !isCustomLocation && gameMode !== 'randomized',
      gameMode: gameMode === 'randomized' ? 'classic' : gameMode,
    });
    // Use the search hook
    const { data: results = [], isLoading: isSearchLoading } = usePokemonSearch(
      {
        query: deferredQuery,
      }
    );

    // Get all Pokemon for randomized mode
    const { data: allPokemon = [], isLoading: isAllPokemonLoading } =
      useAllPokemon();

    // Floating UI setup
    const { refs, floatingStyles, update, placement } = useFloating({
      placement: 'bottom-start',
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
      whileElementsMounted: autoUpdate,
    });

    // Function to get Pokemon source information
    const getPokemonSource = useCallback(
      (pokemonId: number): EncounterSource[] => {
        const pokemonData = routeEncounterData.find(p => p.id === pokemonId);
        return pokemonData?.sources || [];
      },
      [routeEncounterData]
    );

    // Combine route matches with smart search results
    const finalOptions = useMemo(() => {
      // Early return for empty query
      if (deferredQuery === '') {
        // In randomized mode or custom location, show all Pokemon
        if (gameMode === 'randomized' || isCustomLocation) {
          // If still loading, return empty array to avoid showing incomplete data
          if (isAllPokemonLoading) {
            return [];
          }
          return allPokemon
            .map(p => ({
              id: p.id,
              name: p.name,
              nationalDexId: p.nationalDexId,
            }))
            .filter(pokemon => !isFusion || !isEgg(pokemon));
        }
        return routeEncounterData.filter(
          pokemon => !isFusion || !isEgg(pokemon)
        );
      }

      // Early return if no search results and no route data
      if (results.length === 0 && routeEncounterData.length === 0) {
        return [];
      }

      // Check if query is numeric for route Pokemon
      const isNumericQuery = /^\d+$/.test(deferredQuery.trim());

      let routeMatches: PokemonOptionType[] = [];

      if (isNumericQuery) {
        // For numeric queries, check both ID and National Dex ID
        const queryNum = parseInt(deferredQuery, 10);
        routeMatches = routeEncounterData.filter(
          pokemon =>
            (pokemon.id === queryNum || pokemon.nationalDexId === queryNum) &&
            (!isFusion || !isEgg(pokemon))
        );
      } else {
        // For text queries, use name matching
        routeMatches = routeEncounterData.filter(
          pokemon =>
            pokemon.name.toLowerCase().includes(deferredQuery.toLowerCase()) &&
            (!isFusion || !isEgg(pokemon))
        );
      }

      // Filter search results to exclude eggs when in fusion mode
      const filteredResults = results.filter(
        pokemon => !isFusion || !isEgg(pokemon)
      );

      // Combine results: route matches first, then smart search results
      const allResults = [...routeMatches, ...filteredResults];

      // Sort: in randomized mode, all Pokemon are equally available
      // In classic/remix modes, prioritize route Pokemon
      return allResults
        .sort((a, b) => {
          if (gameMode === 'randomized') {
            // In randomized mode, maintain search relevance order
            return 0;
          } else {
            // In classic/remix modes, prioritize route Pokemon
            if (isRoutePokemon(a.id) && !isRoutePokemon(b.id)) return -1;
            if (!isRoutePokemon(a.id) && isRoutePokemon(b.id)) return 1;
            // For non-route Pokemon, maintain search order (already sorted by relevance)
            return 0;
          }
        })
        .filter(
          (pokemon, index, self) =>
            index === self.findIndex(t => t.id === pokemon.id)
        );
    }, [
      routeEncounterData,
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
        newValue: PokemonOptionType
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
          console.error('Error checking evolution relationship:', error);
          return false; // Err on the side of caution - require confirmation
        }
      },
      []
    );

    // Helper function to apply egg hatching data preservation
    const applyEggHatchingPreservation = useCallback(
      (
        oldValue: PokemonOptionType,
        newValue: PokemonOptionType
      ): PokemonOptionType => {
        if (!isEgg(oldValue) || isEgg(newValue)) return newValue;

        return {
          ...newValue,
          nickname: oldValue.nickname || newValue.nickname,
          status: oldValue.status || newValue.status,
        };
      },
      []
    );

    // Helper function to apply default status based on Pokemon source
    const applyDefaultStatus = useCallback(
      (pokemon: PokemonOptionType): PokemonOptionType => {
        const sources = getPokemonSource(pokemon.id);
        let defaultStatus: PokemonStatusType | undefined = pokemon.status;

        if (sources.includes(EncounterSource.GIFT)) {
          defaultStatus = PokemonStatus.RECEIVED;
        } else if (sources.includes(EncounterSource.TRADE)) {
          defaultStatus = PokemonStatus.TRADED;
        }

        if (!defaultStatus || defaultStatus === pokemon.status) return pokemon;

        return {
          ...pokemon,
          status: defaultStatus,
        };
      },
      [getPokemonSource]
    );

    const handleChange = useCallback(
      async (newValue: PokemonOptionType | null | undefined) => {
        // Early return for clearing value
        if (!newValue) {
          onChange(null);
          setQuery('');
          return;
        }

        // Early return if no current value or no overwrite callback
        if (!value || !onBeforeOverwrite) {
          const finalValue = applyDefaultStatus(newValue);
          onChange(finalValue);
          setQuery('');
          return;
        }

        // Check if we should allow overwrite without confirmation
        const allowOverwrite = await shouldAllowOverwrite(value, newValue);
        if (!allowOverwrite) {
          const shouldOverwrite = await onBeforeOverwrite(value, newValue);
          if (!shouldOverwrite) return;
        }

        // Apply transformations in order
        let finalValue = applyEggHatchingPreservation(value, newValue);
        finalValue = applyDefaultStatus(finalValue);

        onChange(finalValue);
        setQuery('');
      },
      [
        onChange,
        value,
        onBeforeOverwrite,
        shouldAllowOverwrite,
        applyEggHatchingPreservation,
        applyDefaultStatus,
      ]
    );

    // Memoize input change handler
    const handleInputChange = useCallback(
      async (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = event.target.value;

        // Always update the query immediately for responsive UI
        startTransition(() => setQuery(inputValue));

        if (inputValue === '') {
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
        }
      },
      [onChange, value, onBeforeClear]
    );

    // Determine if we should show loading
    const isShowingLoading = useMemo(() => {
      // Show loading when:
      // 1. No query and all Pokemon are loading (for randomized/custom locations)
      // 2. There's a query and search is loading, or all Pokemon are loading
      if (deferredQuery === '') {
        return (
          (gameMode === 'randomized' || isCustomLocation) && isAllPokemonLoading
        );
      }
      return isSearchLoading || isAllPokemonLoading;
    }, [
      deferredQuery,
      gameMode,
      isCustomLocation,
      isAllPokemonLoading,
      isSearchLoading,
    ]);

    const shouldVirtualize = finalOptions.length > 30;

    const virtualizer = useVirtualizer({
      count: finalOptions.length,
      getScrollElement: () => optionsRef.current,
      estimateSize: () => 56,
      enabled: shouldVirtualize,
      overscan: 10,
      gap: 4,
      scrollPaddingEnd: 16,
      scrollPaddingStart: 16,
    });

    return (
      <div
        id={value?.uid}
        className='relative'
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnd={handleDragEnd}
        data-uid={dragPreview?.uid || value?.uid}
      >
        {}
        <div className='absolute inset-0 bg-blue-500/20 border-2 border-blue-500/60 rounded-lg pointer-events-none z-10 opacity-0 transition-opacity duration-200 ease-in-out location-highlight-overlay max-w-screen' />
        <Combobox
          value={value || null}
          onChange={handleChange}
          disabled={disabled}
          immediate
          onClose={() => setQuery('')}
        >
          {({ open }) => (
            <div key={comboboxId}>
              <div className='relative'>
                <ComboboxInput
                  ref={comboRef => {
                    if (comboRef) {
                      inputRef.current = comboRef;
                      refs.setReference(comboRef);
                      update();
                      if (ref && 'current' in ref) {
                        ref.current = comboRef;
                      }
                    }
                  }}
                  className={clsx(
                    'rounded-t-md rounded-b-none border group/input',
                    'w-full px-3 py-3.5 text-sm  bg-white text-gray-900 outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-500 focus-visible:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed',
                    'border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus-visible:ring-blue-400',
                    'focus:cursor-text hover:cursor-pointer',
                    (value || dragPreview) && 'pl-16', // Add padding for sprite when value is selected or previewing
                    dragPreview &&
                      'border-blue-500 bg-blue-50 dark:bg-blue-900/20 opacity-60', // Highlight when showing preview with opacity,
                    {
                      'rounded-t-md rounded-b-none ':
                        open && placement.startsWith('bottom'),
                      'rounded-b-md rounded-t-none ':
                        open && placement.startsWith('top'),
                      'rounded-md':
                        !placement.startsWith('bottom') &&
                        !placement.startsWith('top'),
                    }
                  )}
                  placeholder={placeholder}
                  displayValue={(
                    pokemon: PokemonOptionType | null | undefined
                  ) => {
                    const displayPokemon = dragPreview || pokemon;
                    return displayPokemon?.name || '';
                  }}
                  spellCheck={false}
                  autoComplete='off'
                  onChange={handleInputChange}
                />
                {(value || dragPreview) && (
                  <div
                    className={clsx(
                      'absolute inset-y-0 px-1.5 flex items-center bg-gray-300/20 border-r border-gray-300 dark:bg-gray-500/20 dark:border-gray-600 rounded-tl-md',
                      'size-12.5 flex items-center justify-center',
                      'group-focus-within/input:border-blue-500'
                    )}
                  >
                    <PokemonSprite
                      pokemonId={(dragPreview || value)!.id}
                      className={clsx(
                        'cursor-grab',
                        dragPreview && 'opacity-60 pointer-none' // Make preview sprite opaque
                      )}
                      draggable={true}
                      onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                        e.dataTransfer.setData(
                          'text/plain',
                          (dragPreview || value)!.name
                        );
                        e.dataTransfer.effectAllowed = 'copy';
                        dragActions.startDrag(
                          (dragPreview || value)!.name,
                          comboboxId || '',
                          dragPreview || value || null
                        );
                      }}
                    />
                  </div>
                )}
                {open ||
                value?.status === PokemonStatus.DECEASED ||
                value?.status === PokemonStatus.MISSED ? null : (
                  <PokemonEvolutionButton
                    value={value}
                    onChange={onChange}
                    shouldLoad={shouldLoad}
                  />
                )}
                {open ? (
                  <Search
                    className='absolute right-4 top-1/2 -translate-y-1/2 size-4 text-gray-400 dark:text-gray-600 pointer-events-none'
                    aria-hidden={true}
                  />
                ) : null}
              </div>
              {open && (
                <FloatingPortal id='location-table'>
                  <div
                    ref={ref => {
                      if (ref) {
                        optionsRef.current = ref;
                        refs.setFloating(ref);
                      }
                    }}
                    style={{
                      ...floatingStyles,
                      height: shouldVirtualize
                        ? `${virtualizer.getTotalSize()}px`
                        : 'auto',
                    }}
                    className={clsx(
                      'max-h-[500px] h-full overflow-y-auto z-40 relative',
                      'px-1 text-base shadow-lg focus:outline-none sm:text-sm',
                      'bg-white dark:bg-gray-800 gap-x-2',
                      'border border-gray-300 dark:border-gray-600 scrollbar-thin',
                      {
                        'rounded-b-md rounded-t-none border-t-0':
                          placement.startsWith('bottom'),
                        'rounded-t-md rounded-b-none border-b-0':
                          placement.startsWith('top'),
                        'rounded-md':
                          !placement.startsWith('bottom') &&
                          !placement.startsWith('top'),
                      }
                    )}
                  >
                    <ComboboxOptions
                      className={clsx('h-full', {
                        'pointer-events-none': virtualizer.isScrolling,
                      })}
                    >
                      {isShowingLoading ? (
                        <div className='relative cursor-default select-none py-2 px-4 text-center'>
                          <div className='text-gray-500 dark:text-gray-400'>
                            <p className='text-sm flex items-center gap-2 justify-center py-2'>
                              <Loader2 className='w-4 h-4 animate-spin' />
                              <span>Loading Pokémon...</span>
                            </p>
                          </div>
                        </div>
                      ) : shouldVirtualize ? (
                        virtualizer.getVirtualItems().map(virtualItem => (
                          <PokemonOption
                            locationId={locationId}
                            key={virtualItem.key}
                            pokemon={finalOptions[virtualItem.index]}
                            index={virtualItem.index}
                            disabled={virtualizer.isScrolling}
                            isRoutePokemon={isRoutePokemon}
                            getPokemonSource={getPokemonSource}
                            comboboxId={comboboxId || ''}
                            gameMode={gameMode}
                            style={{
                              position: 'absolute',
                              top: '0',
                              left: '0.25rem',
                              width: 'calc(100% - 8px)',
                              height: `${virtualItem.size}px`,
                              transform: `translateY(${virtualItem.start}px)`,
                              pointerEvents: virtualizer.isScrolling
                                ? 'none'
                                : 'auto',
                            }}
                          />
                        ))
                      ) : (
                        <PokemonOptions
                          locationId={locationId}
                          comboboxId={comboboxId || ''}
                          finalOptions={finalOptions}
                          deferredQuery={deferredQuery}
                          isRoutePokemon={isRoutePokemon}
                          getPokemonSource={getPokemonSource}
                          gameMode={gameMode}
                          isLoading={isShowingLoading}
                        />
                      )}
                    </ComboboxOptions>
                  </div>
                </FloatingPortal>
              )}
            </div>
          )}
        </Combobox>
        <div className='flex'>
          <PokemonNicknameInput
            key={value?.uid + 'nickname'}
            value={value}
            onChange={onChange}
            placeholder={nicknamePlaceholder}
            disabled={disabled}
            dragPreview={dragPreview}
          />
          <PokemonStatusInput
            value={value}
            key={value?.uid + 'status'}
            onChange={onChange}
            disabled={disabled}
            dragPreview={dragPreview}
          />
        </div>
      </div>
    );
  }
);

PokemonCombobox.displayName = 'PokemonCombobox';
