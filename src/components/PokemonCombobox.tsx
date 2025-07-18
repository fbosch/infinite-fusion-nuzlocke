'use client';

import React, {
  useState,
  useMemo,
  useDeferredValue,
  startTransition,
  useCallback,
  useEffect,
} from 'react';
import { Check, Loader2, Search } from 'lucide-react';
import {
  Combobox,
  ComboboxInput,
  ComboboxOptions,
  ComboboxOption,
  ComboboxButton,
} from '@headlessui/react';
import clsx from 'clsx';
import Image from 'next/image';
import { useSnapshot } from 'valtio';
import {
  getInfiniteFusionToNationalDexMap,
  getPokemon,
  searchPokemon,
  type PokemonOption,
} from '@/loaders/pokemon';
import { getEncountersByRouteId, getPokemonNameMap } from '@/loaders';
import { dragStore, dragActions } from '@/stores/dragStore';

// Global cache for National Dex ID mapping
let nationalDexMapping: Map<number, number> | null = null;
let mappingPromise: Promise<void> | null = null;

// Initialize the National Dex mapping
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
        <>
          <div className={'flex items-center gap-8'}>
            <Image
              src={getPokemonSpriteUrlFromOption(pokemon)}
              alt={pokemon.name}
              width={40}
              height={40}
              className='object-contain object-center scale-180 image-render-high-quality cursor-grab active:cursor-grabbing'
              loading='lazy'
              unoptimized
              draggable
              onDragStart={handleDragStart}
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
        </>
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
      <div className='max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent'>
        <div className='relative cursor-default select-none py-2 px-4 text-center'>
          <div className='text-gray-500 dark:text-gray-400'>
            {query ? (
              <>
                <p className='text-sm'>
                  No Pokemon found for &quot;{query}&quot;
                </p>
                <p className='text-xs mt-1'>Try a different search term</p>
              </>
            ) : (
              <p className='text-sm flex items-center gap-2 justify-center py-2'>
                <Search className='w-4 h-4' />
                <span>Search for Pokemon</span>
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
        'max-h-60 overflow-y-auto space-y-2',
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
            <>
              <div className={'flex items-center gap-8'}>
                <Image
                  src={getPokemonSpriteUrlFromOption(pokemon)}
                  alt={pokemon.name}
                  width={40}
                  height={40}
                  className='object-contain object-center scale-140 image-render-high-quality cursor-grab active:cursor-grabbing'
                  loading={
                    index < 5 || isRoutePokemon(pokemon.id) ? 'eager' : 'lazy'
                  }
                  unoptimized
                  draggable
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
            </>
          )}
        </ComboboxOption>
      ))}
    </div>
  );
};

// Pokemon Combobox Component
export const PokemonCombobox = ({
  routeId,
  value,
  onChange,
  placeholder = 'Select Pokemon',
  nicknamePlaceholder = 'Enter nickname',
  disabled = false,
  gameMode = 'classic',
  comboboxId,
  showNickname = true,
}: {
  routeId?: number;
  value: PokemonOption | null | undefined;
  onChange: (value: PokemonOption | null) => void;
  placeholder?: string;
  nicknamePlaceholder?: string;
  disabled?: boolean;
  gameMode?: 'classic' | 'remix';
  comboboxId?: string;
  showNickname?: boolean;
}) => {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const dragSnapshot = useSnapshot(dragStore);
  
  // Local nickname state for smooth typing
  const [localNickname, setLocalNickname] = useState(value?.nickname || '');
  
  // Sync local nickname when value changes (but not during typing)
  useEffect(() => {
    if (value?.nickname !== localNickname) {
      setLocalNickname(value?.nickname || '');
    }
  }, [value?.nickname]);
  


  // State for route encounters and all Pokemon
  const [routeEncounterData, setRouteEncounterData] = useState<PokemonOption[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);

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
    setIsLoading(true);

    try {
      // Load Pokemon data, name map, and encounter data in parallel
      const [allPokemon, nameMap, encounter] = await Promise.all([
        getPokemon(),
        getPokemonNameMap(),
        getEncountersByRouteId(routeId, gameMode),
      ]);

      if (encounter) {
        const pokemonOptions: PokemonOption[] = encounter.pokemonIds.map(id => {
          const pokemon = allPokemon.find(p => p.id === id);
          return {
            id,
            name: nameMap.get(id) || `Unknown Pokemon (${id})`,
            nationalDexId: pokemon?.nationalDexId || 0,
          };
        });

        setRouteEncounterData(pokemonOptions);
      }
    } catch (err) {
      console.error(`Error loading encounter data for route ${routeId}:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [routeId, gameMode]);

  // Load route data when combobox opens or when user starts typing
  const handleInteraction = useCallback(() => {
    loadRouteEncounterData();
  }, [loadRouteEncounterData]);

  // Smart search function that handles both name and ID searches
  const performSmartSearch = useCallback(
    async (
      searchQuery: string,
      pokemonList: PokemonOption[]
    ): Promise<PokemonOption[]> => {
      if (!searchQuery.trim()) {
        return pokemonList;
      }

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
    return allResults.sort((a, b) => {
      // First prioritize route Pokemon
      if (isRoutePokemon(a.id) && !isRoutePokemon(b.id)) return -1;
      if (!isRoutePokemon(a.id) && isRoutePokemon(b.id)) return 1;

      // For non-route Pokemon, maintain search order (already sorted by relevance)
      return 0;
    });
  }, [routeEncounterData, fuzzyResults, deferredQuery, isRoutePokemon]);

  // Optimized onChange handler without startTransition for immediate response
  const handleChange = useCallback(
    (newValue: PokemonOption | null | undefined) => {
      // Only set a value if there's actually a selection
      if (newValue) {
        onChange(newValue);
      } else if (!newValue) {
        // Allow clearing the selection
        onChange(null);
      }
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
      } else {
        // Deferred update for typing
        startTransition(() => setQuery(value));
      }
    },
    [onChange]
  );

  // Handle nickname input change with local state
  const handleNicknameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newNickname = event.target.value;
      // Update local state immediately for responsive typing
      setLocalNickname(newNickname);
      
      if (value) {
        // Use startTransition to defer the state update
        startTransition(() => {
          const updatedPokemon: PokemonOption = {
            ...value,
            nickname: newNickname,
          };
          onChange(updatedPokemon);
        });
      }
    },
    [value, onChange]
  );

  // Handle drop events on the input
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const pokemonName = e.dataTransfer.getData('text/plain');
      if (pokemonName) {
        // Clear the preview
        setDragPreview(null);

        // Check if this drop is from a different combobox
        const isFromDifferentCombobox =
          dragSnapshot.currentDragSource &&
          dragSnapshot.currentDragSource !== comboboxId;

        // Check if both comboboxes have values for switching
        // This will work for any two different comboboxes (like head/body) that both have values
        const canSwitch =
          isFromDifferentCombobox &&
          dragSnapshot.currentDragValue &&
          value &&
          dragSnapshot.currentDragValue.name !== value.name;

        if (canSwitch && dragSnapshot.currentDragValue) {
          // Switch values between the two comboboxes
          const targetValue = value;
          const sourceValue = dragSnapshot.currentDragValue;

          // Convert readonly arrays to mutable arrays for the source value
          const mutableSourceValue: PokemonOption = {
            id: sourceValue.id,
            name: sourceValue.name,
            nationalDexId: sourceValue.nationalDexId,
          };

          // Set this combobox to the source value
          onChange(mutableSourceValue);

          // Dispatch a custom event to set the source combobox to this value
          window.dispatchEvent(
            new CustomEvent('switchCombobox', {
              detail: {
                comboboxId: dragSnapshot.currentDragSource,
                value: targetValue,
              },
            })
          );
        } else {
          // Original logic for normal drag and drop
          // Use the full PokemonOption from drag store if available
          if (dragSnapshot.currentDragValue) {
            onChange(dragSnapshot.currentDragValue);
            
            // If this is from a different combobox, clear the source
            if (isFromDifferentCombobox) {
              // Dispatch a custom event to notify the source combobox to clear
              window.dispatchEvent(
                new CustomEvent('clearCombobox', {
                  detail: { comboboxId: dragSnapshot.currentDragSource },
                })
              );
            }
          } else {
            // Fallback to name-based search if drag value is not available
            setQuery(pokemonName);
            const findPokemonByName = async () => {
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
                  };
                  onChange(pokemonOption);

                  // If this is from a different combobox, clear the source
                  if (isFromDifferentCombobox) {
                    // Dispatch a custom event to notify the source combobox to clear
                    window.dispatchEvent(
                      new CustomEvent('clearCombobox', {
                        detail: { comboboxId: dragSnapshot.currentDragSource },
                      })
                    );
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
    [onChange, comboboxId, value, dragSnapshot]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';

      // Show preview of what will be dropped using global drag data
      if (dragSnapshot.currentDragValue && (!dragPreview || dragPreview.name !== dragSnapshot.currentDragValue.name)) {
        // Use the full PokemonOption from drag store for preview
        setDragPreview(dragSnapshot.currentDragValue);
      } else if (dragSnapshot.currentDragData && (!dragPreview || dragPreview.name !== dragSnapshot.currentDragData)) {
        // Fallback to name-based search if drag value is not available
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

  const handleDragLeave = useCallback(() => {
    // Clear preview when dragging away
    setDragPreview(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    // Clear global drag data when drag ends
    dragActions.clearDrag();
  }, []);



  // Listen for clear and switch events from other comboboxes
  useEffect(() => {
    const handleClearEvent = (event: CustomEvent) => {
      if (event.detail.comboboxId === comboboxId) {
        onChange(null);
        setQuery('');
      }
    };

    const handleSwitchEvent = (event: CustomEvent) => {
      if (event.detail.comboboxId === comboboxId) {
        onChange(event.detail.value);
        setQuery('');
      }
    };

    window.addEventListener('clearCombobox', handleClearEvent as EventListener);
    window.addEventListener(
      'switchCombobox',
      handleSwitchEvent as EventListener
    );

    return () => {
      window.removeEventListener(
        'clearCombobox',
        handleClearEvent as EventListener
      );
      window.removeEventListener(
        'switchCombobox',
        handleSwitchEvent as EventListener
      );
    };
  }, [comboboxId, onChange]);

  return (
    <div className=''>
      <Combobox
        value={value || null}
        onChange={handleChange}
        disabled={disabled}
        immediate
      >
        <div className='relative'>
          <div
            className='relative'
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
          >
            <ComboboxInput
              className={clsx(
                'rounded-t-md rounded-b-none border',
                'w-full px-3 py-3.5 text-sm  bg-white text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed',
                'border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus-visible:ring-blue-400',
                'focus:cursor-text hover:cursor-pointer',
                (value || dragPreview) && 'pl-12', // Add padding for sprite when value is selected or previewing
                dragPreview &&
                  'border-blue-500 bg-blue-50 dark:bg-blue-900/20 opacity-60' // Highlight when showing preview with opacity
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
              <div className='absolute inset-y-0 left-1.5 flex items-center'>
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
            <ComboboxButton className='absolute inset-y-0 right-0 flex items-center pr-2'>
              {isLoading ? (
                <Loader2
                  className='h-4 w-4 animate-spin text-gray-400'
                  aria-hidden='true'
                />
              ) : null}
            </ComboboxButton>
          </div>
          <ComboboxOptions
            className={clsx(
              'absolute z-20 w-full overflow-hidden rounded-b-md py-1 text-base shadow-lg focus:outline-none sm:text-sm',
              'bg-white dark:bg-gray-800',
              'border border-gray-400 dark:border-gray-600'
            )}
          >
            <PokemonOptions
              options={finalOptions}
              isRoutePokemon={isRoutePokemon}
              query={deferredQuery}
              comboboxId={comboboxId || ''} // Provide a default value for comboboxId
            />
          </ComboboxOptions>
        </div>
      </Combobox>
      
      {showNickname && (
        <input
          type='text'
          value={localNickname}
          onChange={handleNicknameChange}
          placeholder={nicknamePlaceholder}
          className={clsx(
            'rounded-b-md border-t-0 rounded-t-none relative',
            'w-full px-3 py-3.5 text-sm border rounded-md bg-white text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed',
            'border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus-visible:ring-blue-400',
            'placeholder-gray-500 dark:placeholder-gray-400'
          )}
          maxLength={12}
          spellCheck={false}
          autoComplete='off'
        />
      )}
    </div>
  );
};
