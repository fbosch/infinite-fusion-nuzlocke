'use client';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import React, { useState, useMemo, useCallback, useDeferredValue, startTransition } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, Check } from 'lucide-react';
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { getLocationsSortedByOrder, getEncountersByRouteId, getPokemonNameMap } from '@/loaders';
import type { Location } from '@/loaders/locations';
import clsx from 'clsx';

const columnHelper = createColumnHelper<Location>();

const columns = [
  columnHelper.accessor('name', {
    header: 'Location',
    cell: (info) => (
      <span className="font-medium text-gray-900 dark:text-white">
        {info.getValue()}
      </span>
    ),
    enableSorting: true,
  }),
  columnHelper.accessor('routeId', {
    header: 'Encounter',
    cell: (info) => info.getValue(),
    enableSorting: false,
  }),
];

// Pokemon option type
interface PokemonOption {
  id: number;
  name: string;
  spriteUrl: string;
}

// Get Pokemon sprite URL
function getPokemonSpriteUrl(pokemonId: number): string {
  // Use PokeAPI sprites - these are the Infinite Fusion custom IDs, so we'll use the national dex ID
  // For now, we'll use a placeholder approach. In a real implementation, you'd map Infinite Fusion IDs to national dex IDs
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
}

// Pokemon Combobox Component - Memoized for performance
const PokemonCombobox = React.memo(({
  options,
  value,
  onChange,
  placeholder = "Select Pokemon...",
  disabled = false
}: {
  options: PokemonOption[];
  value: PokemonOption | null | undefined;
  onChange: (value: PokemonOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
}) => {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [isOpen, setIsOpen] = useState(false);

  // Memoize filtered options to prevent recalculation on every render
  const filteredOptions = useMemo(() => {
    if (deferredQuery === '') return options;
    return options.filter((pokemon) =>
      pokemon.name.toLowerCase().includes(deferredQuery.toLowerCase())
    );
  }, [options, deferredQuery]);

  // Optimized onChange handler without startTransition for immediate response
  const handleChange = useCallback((newValue: PokemonOption | null | undefined) => {
    if (newValue) {
      onChange(newValue);
    }
  }, [onChange]);


  return (
    <Combobox value={value || null} onChange={handleChange} disabled={disabled} immediate>
      <div className="relative">
        <div className="relative">
          <ComboboxInput
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            placeholder={placeholder}
            displayValue={(pokemon: PokemonOption | null | undefined) => pokemon?.name || ''}
            spellCheck={false}
            onChange={(event) => {
              const value = event.target.value;
              if (value === '') {
                // Immediate update for clearing
                setQuery(value);
              } else {
                // Deferred update for typing
                startTransition(() => setQuery(value));
              }
            }}
            onClick={() => {
              // Reopen dropdown when clicking on focused input
              const comboboxButton = document.querySelector('[data-headlessui-state]') as HTMLElement;
              if (comboboxButton) {
                comboboxButton.click();
              }
            }}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </div>
        </div>
        <ComboboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {filteredOptions.length === 0 && deferredQuery !== '' ? (
            <div className="relative cursor-default select-none px-4 py-2 text-gray-700 dark:text-gray-300">
              No Pokemon found.
            </div>
          ) : (
            filteredOptions.map((pokemon) => (
              <ComboboxOption
                key={pokemon.id}
                value={pokemon}
                className={({ active }) =>
                  clsx(
                    'relative cursor-default select-none py-2 pr-4 pl-10',
                    {
                      'bg-blue-600 text-white': active,
                      'text-gray-900 dark:text-gray-100': !active
                    }
                  )
                }
              >
                {({ selected, active }) => (
                  <>
                    <div className="flex items-center gap-4 cursor-pointer">
                      {/* Pokemon Sprite */}
                      <img
                        src={pokemon.spriteUrl}
                        alt={pokemon.name}
                        className="w-12 h-12 object-contain object-center scale-180 antialiased"
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
                        className={clsx(
                          'absolute inset-y-0 left-2 flex items-center pl-2',
                          {
                            'text-white': active,
                            'text-blue-600': !active
                          }
                        )}
                      >
                        <Check className="w-6 h-6" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
      </div>
    </Combobox>
  );
});

PokemonCombobox.displayName = 'PokemonCombobox';

export default function LocationList() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [encounters, setEncounters] = useState<Record<number, PokemonOption | null>>({});

  // Memoize the data to prevent unnecessary re-computations
  const data = useMemo(() => {
    try {
      return getLocationsSortedByOrder();
    } catch (error) {
      console.error('Failed to load locations:', error);
      return [];
    }
  }, []);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
  });

  // Optimized encounter selection handler for immediate response
  const handleEncounterSelect = useCallback((routeId: number, pokemon: PokemonOption | null) => {
    setEncounters(prev => ({
      ...prev,
      [routeId]: pokemon
    }));
  }, []);

  // Memoize Pokemon name map to prevent recalculation
  const pokemonNameMap = useMemo(() => getPokemonNameMap(), []);

  // Lazy load encounter data only when needed
  const [encounterData, setEncounterData] = useState<Map<number, PokemonOption[]>>(new Map());

  const loadEncounterData = useCallback((routeId: number) => {
    if (encounterData.has(routeId)) return encounterData.get(routeId);

    try {
      const encounter = getEncountersByRouteId(routeId, 'classic');
      if (encounter) {
        const pokemonOptions: PokemonOption[] = encounter.pokemonIds
          .map(id => ({
            id,
            name: pokemonNameMap.get(id) || `Unknown Pokemon (${id})`,
            spriteUrl: getPokemonSpriteUrl(id)
          }))
          .filter(pokemon => pokemon.name !== `Unknown Pokemon (${pokemon.id})`);

        setEncounterData(prev => new Map(prev).set(routeId, pokemonOptions));
        return pokemonOptions;
      }
    } catch (error) {
      console.error(`Error loading encounter data for route ${routeId}:`, error);
    }
    return [];
  }, [encounterData, pokemonNameMap]);

  // Show loading state if no data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8" role="status" aria-live="polite">
        <div className="text-gray-500 dark:text-gray-400">
          No location data available
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
        role="table"
        aria-label="Locations table"
      >
        <thead className="bg-gray-50 dark:bg-gray-800">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const isSorted = header.column.getIsSorted();
                const sortDirection = isSorted === 'asc' ? 'ascending' : isSorted === 'desc' ? 'descending' : 'none';

                return (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                    onClick={header.column.getToggleSortingHandler()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        header.column.getToggleSortingHandler()?.(e);
                      }
                    }}
                    tabIndex={0}
                    role="columnheader"
                    aria-sort={sortDirection}
                    aria-label={`${header.column.columnDef.header as string} column. Click to sort.`}
                  >
                    <div className="flex items-center space-x-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getCanSort() && (
                        <span
                          className="text-gray-400"
                          aria-hidden="true"
                        >
                          {header.column.getIsSorted() === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronsUpDown className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              role="row"
            >
              {row.getVisibleCells().map((cell) => {
                // Special handling for encounter column
                if (cell.column.id === 'routeId') {
                  const routeId = cell.getValue() as number;
                  if (!routeId) {
                    return (
                      <td
                        key={cell.id}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                        role="cell"
                      >
                        <span className="text-gray-400 dark:text-gray-500 italic">
                          No encounters
                        </span>
                      </td>
                    );
                  }

                  const pokemonOptions = encounterData.get(routeId) || loadEncounterData(routeId);
                  if (!pokemonOptions || pokemonOptions.length === 0) {
                    return (
                      <td
                        key={cell.id}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                        role="cell"
                      >
                        <span className="text-gray-400 dark:text-gray-500 italic">
                          No encounters
                        </span>
                      </td>
                    );
                  }

                  const selectedPokemon = encounters[routeId] || null;

                  return (
                    <td
                      key={cell.id}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                      role="cell"
                    >
                      <PokemonCombobox
                        options={pokemonOptions}
                        value={selectedPokemon}
                        onChange={(pokemon) => handleEncounterSelect(routeId, pokemon)}
                        placeholder={`Select Pokemon for ${row.original.name}...`}
                      />
                    </td>
                  );
                }

                // Default cell rendering
                return (
                  <td
                    key={cell.id}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                    role="cell"
                    aria-label={`${cell.column.columnDef.header as string}: ${flexRender(cell.column.columnDef.cell, cell.getContext())}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 