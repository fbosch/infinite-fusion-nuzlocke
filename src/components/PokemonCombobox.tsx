'use client';

import React, { useState, useMemo, useDeferredValue, startTransition, useCallback } from 'react';
import { Search, Check, X, Loader2 } from 'lucide-react';
import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption, ComboboxButton } from '@headlessui/react';
import clsx from 'clsx';
import { getNationalDexIdFromInfiniteFusionId } from '@/loaders/pokemon';
import { getEncountersByRouteId, getPokemonNameMap } from '@/loaders';

// Pokemon option type
export interface PokemonOption {
  id: number;
  name: string;
}

// Get Pokemon sprite URL (sync version for immediate use)
export function getPokemonSpriteUrl(pokemonId: number): string {
  // For now, use the pokemonId directly since we can't make this async
  // The sprite URL will still work with the Infinite Fusion ID
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
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
          <img
            src={getPokemonSpriteUrl(pokemon.id)}
            alt={pokemon.name}
            className="w-10 h-10 object-contain object-center scale-180 antialiased"
            loading="lazy"
            decoding="async"
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
  isLoading,
  error
}: {
  options: PokemonOption[];
  isLoading?: boolean;
  error?: string | null;
}) => {
  if (isLoading) {
    return (
      <div className="relative cursor-default select-none px-4 py-8 text-center">
        <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading Pokemon...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative cursor-default select-none px-4 py-2 text-red-600 dark:text-red-400">
        Error loading Pokemon: {error}
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="relative cursor-default select-none px-4 py-2 text-gray-700 dark:text-gray-300">
        No Pokemon found.
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
                <img
                  src={getPokemonSpriteUrl(pokemon.id)}
                  alt={pokemon.name}
                  className="w-10 h-10 object-contain object-center scale-180 antialiased"
                  loading="lazy"
                  decoding="async"
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
            <div className="absolute inset-y-0 left-3 flex items-center">
              <img
                src={getPokemonSpriteUrl(value.id)}
                alt={value.name}
                className="w-6 h-6 object-contain object-center scale-180 antialiased"
                loading="lazy"
                decoding="async"
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
            isLoading={isLoading}
            error={error}
          />
        </ComboboxOptions>
      </div>
    </Combobox>
  );
}; 