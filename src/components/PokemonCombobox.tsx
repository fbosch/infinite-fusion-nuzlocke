'use client';

/**
 * PokemonCombobox Component
 * 
 * IMPORTANT RULE: Always use National Dex IDs for sprite URLs, never fall back to Infinite Fusion IDs.
 * Infinite Fusion IDs and National Dex IDs are different and using the wrong one will result in
 * incorrect sprite URLs (e.g., showing wrong Pokemon sprites).
 * 
 * - Infinite Fusion ID: Used for game logic and data storage
 * - National Dex ID: Used for sprite URLs and external API calls
 */

import React, { useState, useMemo, useDeferredValue, startTransition, useCallback, useEffect } from 'react';
import { Search, Check, X, Loader2 } from 'lucide-react';
import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption, ComboboxButton } from '@headlessui/react';
import clsx from 'clsx';
import Image from 'next/image';
import Fuse from 'fuse.js';
import { getNationalDexIdFromInfiniteFusionId, getInfiniteFusionToNationalDexMap, getPokemon, getPokemonFuseInstance, type PokemonOption } from '@/loaders/pokemon';
import { getEncountersByRouteId, getPokemonNameMap } from '@/loaders';

// Global cache for National Dex ID mapping
let nationalDexMapping: Map<number, number> | null = null;
let mappingPromise: Promise<void> | null = null;

// Initialize the National Dex mapping
export async function initializeSpriteMapping(): Promise<void> {
  if (nationalDexMapping) {
    return; // Already loaded
  }

  if (mappingPromise) {
    return mappingPromise; // Already loading
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

// Async version for when we need the actual National Dex ID
export async function getPokemonSpriteUrlAsync(pokemonId: number): Promise<string> {
  const nationalDexId = await getNationalDexIdFromInfiniteFusionId(pokemonId);
  const spriteId = nationalDexId; // Fallback to original ID if conversion fails
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId}.png`;
}

// Pokemon Option Component
const PokemonOption = ({
  pokemon,
  selected,
  isRoutePokemon,
}: {
  pokemon: PokemonOption;
  selected: boolean;
  isRoutePokemon: boolean;
}) => (
  <ComboboxOption
    value={pokemon}
    className={clsx(
      'relative cursor-default select-none py-2 pr-4 pl-13',
      "hover:bg-gray-100 dark:hover:bg-gray-700",
      {
        'bg-blue-400 text-white': selected,
        'text-gray-900 dark:text-gray-100': !selected
      }
    )}
  >
    {({ selected }) => (
      <>
        <div className={"flex items-center gap-8"}>
          <Image
            src={getPokemonSpriteUrlFromOption(pokemon)}
            alt={pokemon.name}
            width={40}
            height={40}
            className="object-contain object-center scale-180 image-render-high-quality"
            loading="lazy"
            unoptimized
          />
          <span className={clsx('block truncate ', {
            'font-medium': selected,
            'font-normal': !selected
          })}>
            {pokemon.name}
          </span>
          {isRoutePokemon && (
            <span className="ml-auto text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
              Route
            </span>
          )}
        </div>
        {selected ? (
          <span
            className="absolute inset-y-0 left-2 flex items-center pl-2"
            aria-hidden="true"
          >
            <Check className={clsx("w-6 h-6", {
              'text-white': selected,
              'text-blue-400': !selected
            })} aria-hidden="true" />
          </span>
        ) : null}
      </>
    )}
  </ComboboxOption>
);

// Pokemon Options Component
const PokemonOptions = ({
  options,
  isRoutePokemonPredicate,
  query,
}: {
  options: PokemonOption[];
  isRoutePokemonPredicate: (pokemonId: number) => boolean;
  query: string;
}) => {
  if (options.length === 0) {
    return (
      <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
        <div className="relative cursor-default select-none py-2 px-4 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            {query ? (
              <>
                <p className="text-sm">No Pokemon found for "{query}"</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </>
            ) : (
              <p className="text-sm">No Pokemon available</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
      {options.map((pokemon) => (
        <ComboboxOption
          key={pokemon.id}
          value={pokemon}
          className={({ active, selected }) => clsx(
            'relative cursor-pointer select-none py-2 pr-4 pl-13 content-visibility-auto',
            {
              'bg-blue-600 text-white ': active,
              'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700': !active
            }
          )}
          style={{ containIntrinsicSize: '0 60px' }}
        >
          {({ selected, active }) => (
            <>
              <div className={"flex items-center gap-8"}>
                <Image
                  src={getPokemonSpriteUrlFromOption(pokemon)}
                  alt={pokemon.name}
                  width={40}
                  height={40}
                  className="object-contain object-center scale-180 image-render-high-quality"
                  loading="lazy"
                  unoptimized
                />
                <span className={clsx('block truncate', {
                  'font-medium': selected,
                  'font-normal': !selected
                })}>
                  {pokemon.name}
                </span>
                {isRoutePokemonPredicate(pokemon.id) && (
                  <span className="ml-auto text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                    Route
                  </span>
                )}
              </div>
              {selected ? (
                <span
                  className="absolute inset-y-0 left-2 flex items-center pl-2"
                  aria-hidden="true"
                >
                  <Check className={clsx("w-6 h-6", {
                    'text-white': active,
                    'text-blue-400': !active
                  })} aria-hidden="true" />
                </span>
              ) : null}
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
  placeholder = "Select Pokemon",
  disabled = false,
  gameMode = 'classic'
}: {
  routeId?: number;
  value: PokemonOption | null | undefined;
  onChange: (value: PokemonOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
  gameMode?: 'classic' | 'remix';
}) => {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  // State for route encounters and all Pokemon
  const [routeEncounterData, setRouteEncounterData] = useState<PokemonOption[]>([]);
  const [allPokemonData, setAllPokemonData] = useState<PokemonOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track what data has been loaded
  const [hasLoadedRouteData, setHasLoadedRouteData] = useState(false);
  const [hasLoadedAllPokemon, setHasLoadedAllPokemon] = useState(false);

  // Computed values
  const shouldLoadRouteData = routeId && !hasLoadedRouteData && !isLoading;
  const shouldLoadAllPokemon = deferredQuery !== '' && !hasLoadedAllPokemon && !isLoading;

  // Predicate function to check if a Pokemon is in the current route
  const isRoutePokemon = useCallback((pokemonId: number): boolean => {
    return routeEncounterData.some(pokemon => pokemon.id === pokemonId);
  }, [routeEncounterData]);

  // Async function to load route encounter data
  const loadRouteEncounterData = useCallback(async () => {
    if (!shouldLoadRouteData) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load Pokemon data, name map, and encounter data in parallel
      const [allPokemon, nameMap, encounter] = await Promise.all([
        getPokemon(),
        getPokemonNameMap(),
        getEncountersByRouteId(routeId, gameMode)
      ]);

      if (encounter) {
        const pokemonOptions: PokemonOption[] = encounter.pokemonIds
          .map(id => {
            const pokemon = allPokemon.find(p => p.id === id);
            return {
              id,
              name: nameMap.get(id) || `Unknown Pokemon (${id})`,
              nationalDexId: pokemon?.nationalDexId || 0
            };
          })

        setRouteEncounterData(pokemonOptions);
      } else {
        setError('No encounters found for this route');
      }
    } catch (err) {
      console.error(`Error loading encounter data for route ${routeId}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to load Pokemon data');
    } finally {
      setIsLoading(false);
      setHasLoadedRouteData(true);
    }
  }, [routeId, gameMode, shouldLoadRouteData]);

  // Async function to load all Pokemon data
  const loadAllPokemonData = useCallback(async () => {
    if (!shouldLoadAllPokemon) return;

    setIsLoading(true);
    setError(null);

    try {
      const allPokemon = await getPokemon();
      const pokemonOptions: PokemonOption[] = allPokemon.map(pokemon => ({
        id: pokemon.id,
        name: pokemon.name,
        nationalDexId: pokemon.nationalDexId,
      }));

      setAllPokemonData(pokemonOptions);
    } catch (err) {
      console.error('Error loading all Pokemon data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Pokemon data');
    } finally {
      setIsLoading(false);
      setHasLoadedAllPokemon(true);
    }
  }, [shouldLoadAllPokemon]);

  // Load route data when combobox opens or when user starts typing
  const handleInteraction = useCallback(() => {
    if (shouldLoadRouteData) {
      loadRouteEncounterData();
    }
  }, [shouldLoadRouteData, loadRouteEncounterData]);

  // Load all Pokemon data when user starts searching
  useEffect(() => {
    if (shouldLoadAllPokemon) {
      loadAllPokemonData();
    }
  }, [shouldLoadAllPokemon, loadAllPokemonData]);

  // Fuzzy search function using shared Fuse instance
  const performFuzzySearch = useCallback(async (searchQuery: string, pokemonList: PokemonOption[]): Promise<PokemonOption[]> => {
    if (!searchQuery.trim()) {
      return pokemonList;
    }

    try {
      const fuseInstance = await getPokemonFuseInstance();
      const searchResults = fuseInstance.search(searchQuery);
      const resultItems = searchResults.map(result => result.item);

      // Filter results to only include Pokemon from the provided list
      return resultItems.filter(item =>
        pokemonList.some(pokemon => pokemon.id === item.id)
      );
    } catch (err) {
      console.error('Error performing fuzzy search:', err);
      // Fallback to simple search if Fuse instance is not available
      return pokemonList.filter(pokemon =>
        pokemon.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  }, []);

  // Memoize filtered options with fuzzy search and prioritization logic
  const filteredOptions = useMemo(() => {
    // If no search query, show only route encounters
    if (deferredQuery === '') {
      return routeEncounterData;
    }

    // For route Pokemon, use exact string matching
    const routeMatches = routeEncounterData.filter(pokemon =>
      pokemon.name.toLowerCase().includes(deferredQuery.toLowerCase())
    );

    // For non-route Pokemon, use fuzzy search
    const nonRoutePokemon = allPokemonData.filter(p => !isRoutePokemon(p.id));

    // Note: This will be handled in a useEffect since fuzzy search is now async
    return [...routeMatches, ...nonRoutePokemon];
  }, [routeEncounterData, allPokemonData, deferredQuery, isRoutePokemon]);

  // State for fuzzy search results
  const [fuzzyResults, setFuzzyResults] = useState<PokemonOption[]>([]);

  // Perform fuzzy search when query changes
  useEffect(() => {
    if (deferredQuery === '') {
      setFuzzyResults([]);
      return;
    }

    const performSearch = async () => {
      const nonRoutePokemon = allPokemonData.filter(p => !isRoutePokemon(p.id));
      const results = await performFuzzySearch(deferredQuery, nonRoutePokemon);
      setFuzzyResults(results);
    };

    if (allPokemonData.length > 0) {
      performSearch();
    }
  }, [deferredQuery, allPokemonData, isRoutePokemon, performFuzzySearch]);

  // Combine route matches with fuzzy results
  const finalOptions = useMemo(() => {
    if (deferredQuery === '') {
      return routeEncounterData;
    }

    // For route Pokemon, use exact string matching
    const routeMatches = routeEncounterData.filter(pokemon =>
      pokemon.name.toLowerCase().includes(deferredQuery.toLowerCase())
    );

    // Combine results: route matches first, then fuzzy results
    const allResults = [...routeMatches, ...fuzzyResults];

    // Sort: route Pokemon first, then by fuzzy search relevance
    return allResults.sort((a, b) => {
      // First prioritize route Pokemon
      if (isRoutePokemon(a.id) && !isRoutePokemon(b.id)) return -1;
      if (!isRoutePokemon(a.id) && isRoutePokemon(b.id)) return 1;

      // For non-route Pokemon, maintain fuzzy search order (already sorted by relevance)
      return 0;
    });
  }, [routeEncounterData, fuzzyResults, deferredQuery, isRoutePokemon]);

  // Optimized onChange handler without startTransition for immediate response
  const handleChange = useCallback((newValue: PokemonOption | null | undefined) => {
    // Only set a value if there's actually a selection
    if (newValue) {
      onChange(newValue);
    } else if (!newValue) {
      // Allow clearing the selection
      onChange(null);
    }
  }, [onChange]);

  // Memoize input change handler
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === '') {
      // Clear the selection when input is cleared
      onChange(null);
      setQuery(value);
    } else {
      // Deferred update for typing
      startTransition(() => setQuery(value));
    }
  }, [onChange]);

  return (
    <Combobox
      value={value || null}
      onChange={handleChange}
      disabled={disabled}
      immediate
    >
      <div className="relative">
        <div className="relative">
          <ComboboxInput
            className={clsx(
              "w-full px-3 py-2 text-sm border rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
              "border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-400",
              value && "pl-12" // Add padding for sprite when value is selected
            )}
            placeholder={placeholder}
            displayValue={(pokemon: PokemonOption | null | undefined) => pokemon?.name || ''}
            spellCheck={false}
            autoComplete="off"
            onChange={handleInputChange}
            onFocus={handleInteraction}
            onClick={handleInteraction}
            onMouseEnter={handleInteraction}
          />
          {value && (
            <div className="absolute inset-y-0 left-1.5 flex items-center">
              <Image
                src={getPokemonSpriteUrlFromOption(value)}
                alt={value.name}
                width={40}
                height={40}
                className="object-center object-contain"
                quality={70}
                priority={true}
              />
            </div>
          )}
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
            )}
          </ComboboxButton>
        </div>
        <ComboboxOptions
          className={clsx(
            "absolute z-10 mt-1 w-full overflow-hidden rounded-md py-1 text-base shadow-lg focus:outline-none sm:text-sm",
            "bg-white dark:bg-gray-800",
            "border border-gray-400 dark:border-gray-600"
          )}
        >
          <PokemonOptions
            options={finalOptions}
            isRoutePokemonPredicate={isRoutePokemon}
            query={deferredQuery}
          />
        </ComboboxOptions>
      </div>
    </Combobox>
  );
}; 