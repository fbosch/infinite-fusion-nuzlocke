'use client';

import React, {
  useState,
  useMemo,
  useDeferredValue,
  startTransition,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { Check, Search } from 'lucide-react';
import {
  Combobox,
  ComboboxInput,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/react';
import {
  useFloating,
  autoUpdate,
  flip,
  size,
  FloatingPortal,
} from '@floating-ui/react';
import clsx from 'clsx';
import Image from 'next/image';
import { useSnapshot } from 'valtio';
import {
  getInfiniteFusionToNationalDexMap,
  getPokemon,
  searchPokemon,
  PokemonStatus,
  type PokemonOption,
} from '@/loaders/pokemon';
import { getEncountersByRouteId, getPokemonNameMap } from '@/loaders';
import { dragStore, dragActions } from '@/stores/dragStore';
import { playthroughActions, useIsRemixMode } from '@/stores/playthroughs';
import { PokemonEvolutionButton } from './PokemonEvolutionButton';
import { PokemonNicknameInput } from './PokemonNicknameInput';
import { PokemonStatusInput } from './PokemonStatusInput';

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
export function getPokemonSpriteUrlFromOption(pokemon: PokemonOption): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.nationalDexId}.png`;
}

// Pokemon Option Component
const PokemonOption = ({
  pokemon,
  selected,
  isRoutePokemon,
  comboboxId,
}: {
  pokemon: PokemonOption;
  selected: boolean;
  isRoutePokemon: boolean;
  comboboxId: string;
}) => {
  const handleDragStart = (e: React.DragEvent<HTMLImageElement>) => {
    e.dataTransfer.setData('text/plain', pokemon.name);
    e.dataTransfer.effectAllowed = 'copy';
    dragActions.startDrag(pokemon.name, comboboxId || '', pokemon);
  };

  return (
    <ComboboxOption
      value={pokemon}
      className={clsx(
        'relative cursor-default select-none py-2 px-4',
        'hover:bg-gray-100 dark:hover:bg-gray-700',
        {
          'bg-blue-400 text-white': selected,
          'text-gray-900 dark:text-gray-100': !selected,
        }
      )}
    >
      {({ selected }) => (
        <div className={'flex items-center gap-8'}>
          <Image
            src={getPokemonSpriteUrlFromOption(pokemon)}
            alt={pokemon.name}
            width={40}
            height={40}
            className='object-contain object-center scale-180 image-render-high-quality cursor-grab active:cursor-grabbing'
            loading='lazy'
            decoding='async'
            unoptimized
            draggable
            onDragStart={handleDragStart}
            placeholder='blur'
            blurDataURL={TRANSPARENT_PIXEL}
          />
          <span
            className={clsx('block truncate flex-1', {
              'font-medium': selected,
              'font-normal': !selected,
            })}
          >
            {pokemon.name}
          </span>
          <div className='flex items-center gap-2'>
            {isRoutePokemon && (
              <span className='text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded'>
                Route
              </span>
            )}
            <div className='w-5 h-5 flex items-center justify-center'>
              {selected && (
                <Check
                  className={clsx('w-5 h-5', {
                    'text-white': selected,
                    'text-blue-400': !selected,
                  })}
                  aria-hidden='true'
                />
              )}
            </div>
          </div>
        </div>
      )}
    </ComboboxOption>
  );
};

// Pokemon Options Component
const PokemonOptions = ({
  options,
  isRoutePokemon,
  query,
  comboboxId,
}: {
  options: PokemonOption[];
  isRoutePokemon: (pokemonId: number) => boolean;
  query: string;
  comboboxId: string;
}) => {
  const handleDragStart = (
    e: React.DragEvent<HTMLImageElement>,
    pokemon: PokemonOption
  ) => {
    e.dataTransfer.setData('text/plain', pokemon.name);
    e.dataTransfer.effectAllowed = 'copy';
    dragActions.startDrag(pokemon.name, comboboxId || '', pokemon);
  };

  if (options.length === 0) {
    return (
      <div className='h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent'>
        <div className='relative cursor-default select-none py-2 px-4 text-center'>
          <div className='text-gray-500 dark:text-gray-400'>
            {query ? (
              <>
                <p className='text-sm'>
                  No Pokémon found for &quot;{query}&quot;
                </p>
                <p className='text-xs mt-1'>Try a different search term</p>
              </>
            ) : (
              <p className='text-sm flex items-center gap-2 justify-center py-2'>
                <Search className='w-4 h-4' />
                <span>Search for Pokémon</span>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        ' overflow-y-auto space-y-2',
        'scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600',
        'scrollbar-track-transparent py-1'
      )}
    >
      {options.map((pokemon, index) => (
        <ComboboxOption
          key={`${pokemon.id}-${index}`}
          value={pokemon}
          className={({ active }) =>
            clsx(
              'relative cursor-pointer select-none py-2 px-4 content-visibility-auto',
              'rounded-md mx-2',
              {
                'bg-blue-600 text-white ': active,
                'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700':
                  !active,
              }
            )
          }
          style={{ containIntrinsicSize: '0 56px' }}
        >
          {({ selected }) => (
            <div className={'flex items-center gap-8 group'}>
              <Image
                src={getPokemonSpriteUrlFromOption(pokemon)}
                alt={pokemon.name}
                width={40}
                height={40}
                className='object-contain object-center scale-140 image-render-high-quality cursor-grab active:cursor-grabbing'
                loading={
                  index < 5 || isRoutePokemon(pokemon.id) ? 'eager' : 'lazy'
                }
                draggable
                unoptimized
                decoding='async'
                priority={
                  index < 5 || isRoutePokemon(pokemon.id) ? true : false
                }
                onDragStart={e => handleDragStart(e, pokemon)}
              />
              <span
                className={clsx('block truncate flex-1', {
                  'font-medium': selected,
                  'font-normal': !selected,
                })}
              >
                {pokemon.name}
              </span>
              <div className='flex items-center gap-3'>
                {isRoutePokemon(pokemon.id) && (
                  <span className='text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded'>
                    Route
                  </span>
                )}
                <span
                  className={clsx(
                    'text-xs dark:text-gray-400 group-hover:text-white',
                    {
                      'group-hover:text-white ': selected,
                    }
                  )}
                >
                  {pokemon.id.toString().padStart(3, '0')}
                </span>
                <div className='w-5 h-5 flex items-center justify-center'>
                  {selected && (
                    <Check
                      className={clsx(
                        'size-5 group-hover:text-white text-blue-400 dark:text-white'
                      )}
                      aria-hidden='true'
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </ComboboxOption>
      ))}
    </div>
  );
};

// Pokemon Combobox Component
export const PokemonCombobox = ({
  routeId,
  locationId,
  value,
  onChange,
  shouldLoad = false,
  placeholder = 'Select Pokemon',
  nicknamePlaceholder = 'Enter nickname',
  disabled = false,
  comboboxId,
  ref,
}: {
  routeId?: number;
  locationId?: string;
  value: PokemonOption | null | undefined;
  onChange: (value: PokemonOption | null) => void;
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
  const dragSnapshot = useSnapshot(dragStore);
  const isRemixMode = useIsRemixMode();

  // Ref to track pending animation frame for drag leave operations
  const dragLeaveAnimationRef = useRef<number | null>(null);

  // Ref to maintain focus on input
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  // State for route encounters and all Pokemon
  const [routeEncounterData, setRouteEncounterData] = useState<PokemonOption[]>(
    []
  );

  // Predicate function to check if a Pokemon is in the current route
  const isRoutePokemon = useCallback(
    (pokemonId: number): boolean => {
      if (routeId === 0) return false;
      return routeEncounterData.some(pokemon => pokemon.id === pokemonId);
    },
    [routeEncounterData, routeId]
  );

  // Async function to load route encounter data
  const loadRouteEncounterData = useCallback(async () => {
    try {
      // Load Pokemon data, name map, and encounter data in parallel
      const currentGameMode = isRemixMode ? 'remix' : 'classic';
      const [allPokemon, nameMap, encounter] = await Promise.all([
        getPokemon(),
        getPokemonNameMap(),
        getEncountersByRouteId(routeId, currentGameMode),
      ]);

      if (encounter) {
        const pokemonOptions: PokemonOption[] = encounter.pokemonIds.map(id => {
          const pokemon = allPokemon.find(p => p.id === id);
          return {
            id,
            name: nameMap.get(id) || `Unknown Pokemon (${id})`,
            nationalDexId: pokemon?.nationalDexId || 0,
            originalLocation: locationId,
          };
        });

        setRouteEncounterData(pokemonOptions);
      }
    } catch (err) {
      console.error(`Error loading encounter data for route ${routeId}:`, err);
    }
  }, [routeId, isRemixMode, locationId]);

  // Load route data when combobox opens or when user starts typing
  const handleInteraction = useCallback(() => {
    loadRouteEncounterData();
    window.requestAnimationFrame(update);
  }, [loadRouteEncounterData, update]);

  // Smart search function that handles both name and ID searches
  const performSmartSearch = useCallback(
    async (
      searchQuery: string,
      pokemonList: PokemonOption[]
    ): Promise<PokemonOption[]> => {
      try {
        // Use the smart search function that handles both numeric and text searches
        const allResults = await searchPokemon(searchQuery);

        // Filter results to only include Pokemon from the provided list
        return allResults.filter(item =>
          pokemonList.some(pokemon => pokemon.id === item.id)
        );
      } catch (err) {
        console.error('Error performing smart search:', err);
        // Fallback to simple search if smart search is not available
        return pokemonList.filter(pokemon =>
          pokemon.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
    },
    []
  );

  const [fuzzyResults, setFuzzyResults] = useState<PokemonOption[]>([]);
  const [dragPreview, setDragPreview] = useState<PokemonOption | null>(null);

  // Perform smart search when query changes
  useEffect(() => {
    if (deferredQuery === '') {
      setFuzzyResults([]);
      return;
    }

    const performSearch = async () => {
      const allPokemon = await getPokemon();
      const nonRoutePokemon = allPokemon.filter(p => !isRoutePokemon(p.id));
      const results = await performSmartSearch(deferredQuery, nonRoutePokemon);
      startTransition(() => {
        setFuzzyResults(results);
      });
    };

    performSearch();
  }, [deferredQuery, isRoutePokemon, performSmartSearch]);

  // Reload encounter data when playthrough data changes
  useEffect(() => {
    if (routeId !== undefined && routeId !== 0 && shouldLoad) {
      loadRouteEncounterData();
    }
  }, [isRemixMode, loadRouteEncounterData, routeId, shouldLoad]);

  // Clear query when value changes to ensure component reflects the new selection

  // Combine route matches with smart search results
  const finalOptions = useMemo(() => {
    if (deferredQuery === '') {
      return routeEncounterData;
    }

    // Check if query is numeric for route Pokemon
    const isNumericQuery = /^\d+$/.test(deferredQuery.trim());

    let routeMatches: PokemonOption[] = [];

    if (isNumericQuery) {
      // For numeric queries, check both ID and National Dex ID
      const queryNum = parseInt(deferredQuery, 10);
      routeMatches = routeEncounterData.filter(
        pokemon => pokemon.id === queryNum || pokemon.nationalDexId === queryNum
      );
    } else {
      // For text queries, use name matching
      routeMatches = routeEncounterData.filter(pokemon =>
        pokemon.name.toLowerCase().includes(deferredQuery.toLowerCase())
      );
    }

    // Combine results: route matches first, then smart search results
    const allResults = [...routeMatches, ...fuzzyResults];

    // Sort: route Pokemon first, then by search relevance
    return allResults
      .sort((a, b) => {
        // First prioritize route Pokemon
        if (isRoutePokemon(a.id) && !isRoutePokemon(b.id)) return -1;
        if (!isRoutePokemon(a.id) && isRoutePokemon(b.id)) return 1;

        // For non-route Pokemon, maintain search order (already sorted by relevance)
        return 0;
      })
      .filter(
        (pokemon, index, self) =>
          index === self.findIndex(t => t.id === pokemon.id)
      );
  }, [routeEncounterData, fuzzyResults, deferredQuery, isRoutePokemon]);

  const handleChange = useCallback(
    (newValue: PokemonOption | null | undefined) => {
      onChange(newValue || null);
      setQuery('');
    },
    [onChange]
  );

  // Memoize input change handler
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      if (value === '') {
        // Clear the selection when input is cleared
        onChange(null);
        setQuery(value);

        // Maintain focus on the input after clearing
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      } else {
        // Deferred update for typing
        startTransition(() => setQuery(value));
      }
    },
    [onChange]
  );

  // Handle drop events on the input
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const pokemonName = e.dataTransfer.getData('text/plain');
      if (pokemonName) {
        // Clear the preview
        setDragPreview(null);

        const isFromDifferentCombobox =
          dragSnapshot.currentDragSource &&
          dragSnapshot.currentDragSource !== comboboxId;

        const canSwitch =
          isFromDifferentCombobox &&
          dragSnapshot.currentDragValue &&
          value &&
          dragSnapshot.currentDragValue.uid !== value.uid;

        if (canSwitch && dragSnapshot.currentDragSource) {
          const { locationId: sourceLocationId, field: sourceField } =
            playthroughActions.getLocationFromComboboxId(
              dragSnapshot.currentDragSource
            );
          const { locationId: targetLocationId, field: targetField } =
            playthroughActions.getLocationFromComboboxId(comboboxId || '');

          playthroughActions.swapEncounters(
            sourceLocationId,
            targetLocationId,
            sourceField,
            targetField
          );
        } else {
          if (dragSnapshot.currentDragValue) {
            if (isFromDifferentCombobox && dragSnapshot.currentDragSource) {
              // Use atomic move to avoid duplicate intermediate states
              const { locationId: sourceLocationId, field: sourceField } =
                playthroughActions.getLocationFromComboboxId(
                  dragSnapshot.currentDragSource
                );
              const { locationId: targetLocationId, field: targetField } =
                playthroughActions.getLocationFromComboboxId(comboboxId || '');

              playthroughActions.moveEncounterAtomic(
                sourceLocationId,
                sourceField,
                targetLocationId,
                targetField,
                dragSnapshot.currentDragValue
              );
            } else {
              // Not from different combobox, just set normally
              onChange(dragSnapshot.currentDragValue);
            }
          } else {
            setQuery(pokemonName);
            const findPokemonByName = async () => {
              try {
                const allPokemon = await getPokemon();
                const nameMap = await getPokemonNameMap();

                const foundPokemon = allPokemon.find(
                  p =>
                    nameMap.get(p.id)?.toLowerCase() ===
                    pokemonName.toLowerCase()
                );

                if (foundPokemon) {
                  const pokemonOption: PokemonOption = {
                    id: foundPokemon.id,
                    name: pokemonName,
                    nationalDexId: foundPokemon.nationalDexId,
                    originalLocation: locationId,
                    ...(dragSnapshot.currentDragValue && {
                      nickname: dragSnapshot.currentDragValue.nickname,
                      status: dragSnapshot.currentDragValue.status,
                    }),
                  };

                  if (
                    isFromDifferentCombobox &&
                    dragSnapshot.currentDragSource
                  ) {
                    // Use atomic move to avoid duplicate intermediate states
                    const { locationId: sourceLocationId, field: sourceField } =
                      playthroughActions.getLocationFromComboboxId(
                        dragSnapshot.currentDragSource
                      );
                    const { locationId: targetLocationId, field: targetField } =
                      playthroughActions.getLocationFromComboboxId(
                        comboboxId || ''
                      );

                    playthroughActions.moveEncounterAtomic(
                      sourceLocationId,
                      sourceField,
                      targetLocationId,
                      targetField,
                      pokemonOption
                    );
                  } else {
                    // Not from different combobox, just set normally
                    onChange(pokemonOption);
                  }
                }
              } catch (err) {
                console.error('Error finding Pokemon by name:', err);
              }
            };

            findPokemonByName();
          }
        }
      }
    },
    [onChange, comboboxId, value, dragSnapshot, locationId]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';

      if (
        dragSnapshot.currentDragValue &&
        (!dragPreview ||
          dragPreview.name !== dragSnapshot.currentDragValue.name)
      ) {
        setDragPreview(dragSnapshot.currentDragValue);
      } else if (
        dragSnapshot.currentDragData &&
        (!dragPreview || dragPreview.name !== dragSnapshot.currentDragData)
      ) {
        const pokemonName = dragSnapshot.currentDragData;
        const findPokemonForPreview = async () => {
          try {
            const allPokemon = await getPokemon();
            const nameMap = await getPokemonNameMap();

            // Find Pokemon by name (case insensitive)
            const foundPokemon = allPokemon.find(
              p =>
                nameMap.get(p.id)?.toLowerCase() === pokemonName.toLowerCase()
            );

            if (foundPokemon) {
              const pokemonOption: PokemonOption = {
                id: foundPokemon.id,
                name: pokemonName,
                nationalDexId: foundPokemon.nationalDexId,
                // Preserve existing properties for preview
                ...(dragSnapshot.currentDragValue && {
                  nickname: dragSnapshot.currentDragValue.nickname,
                  status: dragSnapshot.currentDragValue.status,
                  originalLocation:
                    dragSnapshot.currentDragValue.originalLocation,
                }),
              };
              setDragPreview(pokemonOption);
            }
          } catch (err) {
            console.error('Error finding Pokemon for preview:', err);
          }
        };

        findPokemonForPreview();
      }
    },
    [dragPreview, dragSnapshot.currentDragValue, dragSnapshot.currentDragData]
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // Use relatedTarget to check if we're moving to a child element
    // This is much more performant than getBoundingClientRect()
    const target = e.currentTarget;
    const relatedTarget = e.relatedTarget as Node | null;

    // Only clear preview when actually leaving the component
    // If relatedTarget is null or not contained within our component, we're leaving
    const isLeavingComponent =
      !relatedTarget || !target.contains(relatedTarget);

    if (isLeavingComponent) {
      // Cancel any pending animation frame
      if (dragLeaveAnimationRef.current !== null) {
        cancelAnimationFrame(dragLeaveAnimationRef.current);
      }

      // Schedule preview clearing for next animation frame for smoother performance
      dragLeaveAnimationRef.current = requestAnimationFrame(() => {
        setDragPreview(null);
        dragLeaveAnimationRef.current = null;
      });
    }

    // Alternative optimization: Could also throttle this function if called too frequently
    // const throttledClearPreview = useCallback(throttle(() => setDragPreview(null), 16), []);
  }, []);

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (dragLeaveAnimationRef.current !== null) {
        cancelAnimationFrame(dragLeaveAnimationRef.current);
      }
    };
  }, []);

  // Ensure floating UI reference is properly set
  useEffect(() => {
    if (inputRef.current) {
      refs.setReference(inputRef.current);
      update();
    }
  }, [refs, update]);

  const handleDragEnd = useCallback(() => {
    // Clear global drag data when drag ends
    dragActions.clearDrag();
  }, []);

  return (
    <div
      className='relative'
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDragEnd={handleDragEnd}
    >
      <Combobox
        value={value || null}
        onChange={handleChange}
        disabled={disabled}
        immediate
      >
        {({ open }) => (
          <div>
            <div className='relative'>
              <ComboboxInput
                ref={comboRef => {
                  inputRef.current = comboRef;
                  if (ref && 'current' in ref && comboRef) {
                    ref.current = comboRef;
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
                displayValue={(pokemon: PokemonOption | null | undefined) => {
                  const displayPokemon = dragPreview || pokemon;
                  return displayPokemon?.name || '';
                }}
                spellCheck={false}
                autoComplete='off'
                onChange={handleInputChange}
                onFocus={handleInteraction}
                onClick={handleInteraction}
                onMouseEnter={handleInteraction}
              />
              {(value || dragPreview) && (
                <div className='absolute inset-y-0 px-1.5 flex items-center bg-gray-300/20 border-r border-gray-300 dark:bg-gray-500/20 dark:border-gray-600 rounded-tl-md'>
                  <Image
                    src={getPokemonSpriteUrlFromOption(dragPreview || value!)}
                    alt={(dragPreview || value)!.name}
                    width={40}
                    height={40}
                    className={clsx(
                      'object-center object-contain cursor-grab active:cursor-grabbing',
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
                <ComboboxOptions
                  ref={refs.setFloating}
                  style={floatingStyles}
                  className={clsx(
                    'z-50 overflow-y-auto py-1 text-base shadow-lg focus:outline-none sm:text-sm',
                    'bg-white dark:bg-gray-800',
                    'border border-gray-300 dark:border-gray-600',
                    // Conditional border radius and borders based on menu placement
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
                  <PokemonOptions
                    options={finalOptions}
                    isRoutePokemon={isRoutePokemon}
                    query={deferredQuery}
                    comboboxId={comboboxId || ''} // Provide a default value for comboboxId
                  />
                </ComboboxOptions>
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
};
