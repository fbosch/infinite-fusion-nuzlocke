'use client';

import React, { useState, useMemo, useDeferredValue, startTransition, useCallback, useEffect } from 'react';
import { Search, Check, X, Loader2 } from 'lucide-react';
import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption, ComboboxButton } from '@headlessui/react';
import clsx from 'clsx';
import Image from 'next/image';
import { getNationalDexIdFromInfiniteFusionId, getInfiniteFusionToNationalDexMap } from '@/loaders/pokemon';
import { getEncountersByRouteId, getPokemonNameMap } from '@/loaders';

// Pokemon option type
export interface PokemonOption {
  id: number;
  name: string;
}

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

// Get Pokemon sprite URL (sync version for immediate use)
export function getPokemonSpriteUrl(pokemonId: number): string {
  // Use National Dex ID if mapping is available, otherwise fallback to original ID
  const nationalDexId = nationalDexMapping?.get(pokemonId);
  const spriteId = nationalDexId || pokemonId;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId}.png`;
}

// Async version for when we need the actual National Dex ID
export async function getPokemonSpriteUrlAsync(pokemonId: number): Promise<string> {
  try {
    const nationalDexId = await getNationalDexIdFromInfiniteFusionId(pokemonId);
    const spriteId = nationalDexId || pokemonId; // Fallback to original ID if conversion fails
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId}.png`;
  } catch (error) {
    console.error('Error getting National Dex ID:', error);
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
  }
}



// Pokemon Option Component
const PokemonOption = ({
  pokemon,
  selected,
}: {
  pokemon: PokemonOption;
  selected: boolean;
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
            src={getPokemonSpriteUrl(pokemon.id)}
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
}: {
  options: PokemonOption[];
}) => {


  return (
    <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
      {options.map((pokemon) => (
        <ComboboxOption
          key={pokemon.id}
          value={pokemon}
          className={({ active, selected }) => clsx(
            'relative cursor-pointer select-none py-2 pr-4 pl-13 content-visibility-auto',
            "hover:bg-gray-100 dark:hover:bg-gray-700",
            {
              'bg-blue-600 text-white': active,
              'text-gray-900 dark:text-gray-100': !active
            }
          )}
          style={{ containIntrinsicSize: '0 60px' }}
        >
          {({ selected, active }) => (
            <>
              <div className={"flex items-center gap-8"}>
                <Image
                  src={getPokemonSpriteUrl(pokemon.id)}
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

  // Async data loading state
  const [encounterData, setEncounterData] = useState<PokemonOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [pokemonNameMap, setPokemonNameMap] = useState<Map<number, string> | null>(null);

  // Initialize sprite mapping on component mount
  useEffect(() => {
    initializeSpriteMapping().catch(console.error);
  }, []);

  // Async function to load encounter data
  const loadEncounterData = useCallback(async () => {
    if (!routeId || hasLoaded || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load Pokemon name map asynchronously first
      let nameMap = pokemonNameMap;
      if (!nameMap) {
        nameMap = await getPokemonNameMap();
        setPokemonNameMap(nameMap);
      }

      // Load encounter data asynchronously
      const encounter = await getEncountersByRouteId(routeId, gameMode);

      if (encounter) {
        const pokemonOptions: PokemonOption[] = encounter.pokemonIds
          .map(id => ({
            id,
            name: nameMap.get(id) || `Unknown Pokemon (${id})`,
          }))
          .filter(pokemon => pokemon.name !== `Unknown Pokemon (${pokemon.id})`);

        setEncounterData(pokemonOptions);
        setHasLoaded(true);
      } else {
        setError('No encounters found for this route');
      }
    } catch (err) {
      console.error(`Error loading encounter data for route ${routeId}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to load Pokemon data');
    } finally {
      setIsLoading(false);
    }
  }, [routeId, gameMode, pokemonNameMap, hasLoaded, isLoading]);

  // Load data when combobox opens or when user starts typing
  const handleInteraction = useCallback(() => {
    if (!hasLoaded && !isLoading) {
      loadEncounterData();
    }
  }, [hasLoaded, isLoading, loadEncounterData]);

  // Memoize filtered options to prevent recalculation on every render
  const filteredOptions = useMemo(() => {
    if (deferredQuery === '') return encounterData;
    return encounterData.filter((pokemon) =>
      pokemon.name.toLowerCase().includes(deferredQuery.toLowerCase())
    );
  }, [encounterData, deferredQuery]);

  // Optimized onChange handler without startTransition for immediate response
  const handleChange = (newValue: PokemonOption | null | undefined) => {
    // Only set a value if there's actually a selection
    if (newValue) {
      onChange(newValue);
    } else if (!newValue) {
      // Allow clearing the selection
      onChange(null);
    }
  };

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
            onChange={(event) => {
              const value = event.target.value;
              if (value === '') {
                // Clear the selection when input is cleared
                onChange(null);
                setQuery(value);
              } else {
                // Deferred update for typing
                startTransition(() => setQuery(value));
              }
            }}
            onFocus={handleInteraction}
            onClick={handleInteraction}
          />
          {value && (
            <div className="absolute inset-y-0 left-1.5 flex items-center">
              <Image
                src={getPokemonSpriteUrl(value.id)}
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
            options={filteredOptions}
          />
        </ComboboxOptions>
      </div>
    </Combobox>
  );
}; 