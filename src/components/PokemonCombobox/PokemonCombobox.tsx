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
import Image from 'next/image';
import {
  getInfiniteFusionToNationalDexMap,
  PokemonStatus,
  type PokemonOptionType,
  useAllPokemon,
} from '@/loaders/pokemon';
import { dragActions } from '@/stores/dragStore';
import { useGameMode } from '@/stores/playthroughs';
import { PokemonEvolutionButton } from './PokemonEvolutionButton';
import { PokemonNicknameInput } from './PokemonNicknameInput';
import { PokemonStatusInput } from './PokemonStatusInput';
import { useComboboxDragAndDrop } from './useComboboxDragAndDrop';
import { useEncounterData } from './useEncounterData';
import { usePokemonSearch } from './usePokemonSearch';
import { useVirtualizer } from '@tanstack/react-virtual';
import { PokemonOption, PokemonOptions } from './PokemonOptions';

let nationalDexMapping: Map<number, number> | null = null;
let mappingPromise: Promise<void> | null = null;

const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export async function initializeSpriteMapping(): Promise<void> {
  if (nationalDexMapping) {
    return; // Already loaded
  }

  if (mappingPromise) {
    return mappingPromise;
  }

  mappingPromise = getInfiniteFusionToNationalDexMap().then(map => {
    nationalDexMapping = map;
    mappingPromise = null;
  });

  return mappingPromise;
}

// Get Pokemon sprite URL from PokemonOption
export function getPokemonSpriteUrlFromOption(
  pokemon: PokemonOptionType
): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.nationalDexId}.png`;
}

// Pokemon Combobox Component
export const PokemonCombobox = React.memo(
  ({
    routeId,
    locationId,
    value,
    onChange,
    onBeforeClear,
    shouldLoad = false,
    placeholder = 'Select Pokemon',
    nicknamePlaceholder = 'Enter nickname',
    disabled = false,
    comboboxId,
    ref,
  }: {
    routeId?: number;
    locationId?: string;
    value: PokemonOptionType | null | undefined;
    onChange: (value: PokemonOptionType | null) => void;
    onBeforeClear?: (
      currentValue: PokemonOptionType
    ) => Promise<boolean> | boolean;
    shouldLoad?: boolean;
    placeholder?: string;
    nicknamePlaceholder?: string;
    disabled?: boolean;
    gameMode?: 'classic' | 'remix';
    comboboxId?: string;
    ref?: React.RefObject<HTMLInputElement | null>;
  }) => {
    const [query, setQuery] = useState('');
    const deferredQuery = useDeferredValue(query);
    const gameMode = useGameMode();

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

    // Use the encounter data hook (now handles custom locations automatically)
    const { routeEncounterData, isRoutePokemon } = useEncounterData({
      routeId,
      locationId,
      enabled: shouldLoad,
    });
    // Use the search hook
    const { data: results = [] } = usePokemonSearch({
      query: deferredQuery,
    });

    // Get all Pokemon for randomized mode
    const { data: allPokemon = [] } = useAllPokemon();

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

    // Combine route matches with smart search results
    const finalOptions = useMemo(() => {
      // Early return for empty query
      if (deferredQuery === '') {
        // In randomized mode, show all Pokemon when query is empty
        if (gameMode === 'randomized') {
          return allPokemon.map(p => ({
            id: p.id,
            name: p.name,
            nationalDexId: p.nationalDexId,
          }));
        }
        return routeEncounterData;
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
            pokemon.id === queryNum || pokemon.nationalDexId === queryNum
        );
      } else {
        // For text queries, use name matching
        routeMatches = routeEncounterData.filter(pokemon =>
          pokemon.name.toLowerCase().includes(deferredQuery.toLowerCase())
        );
      }

      // Combine results: route matches first, then smart search results
      const allResults = [...routeMatches, ...results];

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
    ]);

    const handleChange = useCallback(
      (newValue: PokemonOptionType | null | undefined) => {
        onChange(newValue || null);
        setQuery('');
      },
      [onChange]
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
        {/* Location highlight overlay */}
        <div className='absolute inset-0 bg-blue-500/20 border-2 border-blue-500/60 rounded-lg pointer-events-none z-10 opacity-0 transition-opacity duration-200 ease-in-out location-highlight-overlay' />
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
                      if (
                        ref &&
                        'current' in ref &&
                        typeof ref.current === 'function'
                      ) {
                        ref.current = comboRef;
                      }
                    }
                  }}
                  className={clsx(
                    'rounded-t-md rounded-b-none border',
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
                  <div className='absolute inset-y-0 px-1.5 flex items-center bg-gray-300/20 border-r border-gray-300 dark:bg-gray-500/20 dark:border-gray-600 rounded-tl-md'>
                    <Image
                      src={getPokemonSpriteUrlFromOption(dragPreview || value!)}
                      alt={(dragPreview || value)!.name}
                      width={40}
                      height={40}
                      className={clsx(
                        'object-center object-contain cursor-grab active:cursor-grabbing rounded-sm transform-gpu',
                        dragPreview && 'opacity-60 pointer-none' // Make preview sprite opaque
                      )}
                      quality={70}
                      priority={true}
                      loading='eager'
                      placeholder='blur'
                      blurDataURL={TRANSPARENT_PIXEL}
                      draggable
                      onDragStart={e => {
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
                    key={value?.uid + 'evolution'}
                    onChange={onChange}
                    shouldLoad={shouldLoad}
                  />
                )}
              </div>
              {open && (
                <FloatingPortal>
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
                      'max-h-[500px] h-full overflow-y-auto z-50 relative',
                      'px-1  text-base shadow-lg focus:outline-none sm:text-sm',
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
                      {shouldVirtualize ? (
                        virtualizer.getVirtualItems().map(virtualItem => (
                          <PokemonOption
                            key={virtualItem.key}
                            pokemon={finalOptions[virtualItem.index]}
                            index={virtualItem.index}
                            disabled={virtualizer.isScrolling}
                            isRoutePokemon={isRoutePokemon}
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
                          comboboxId={comboboxId || ''}
                          finalOptions={finalOptions}
                          deferredQuery={deferredQuery}
                          isRoutePokemon={isRoutePokemon}
                          gameMode={gameMode}
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
