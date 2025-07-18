'use client';

import React, { useState, useMemo, useCallback, useDeferredValue, startTransition } from 'react';
import { Search, Check } from 'lucide-react';
import { Combobox, ComboboxInput, ComboboxOptions } from '@headlessui/react';
import { FixedSizeList as List } from 'react-window';
import clsx from 'clsx';
import { getNationalDexIdFromInfiniteFusionId } from '@/loaders/pokemon';

// Pokemon option type
export interface PokemonOption {
  id: number;
  name: string;
}

// Get Pokemon sprite URL
export function getPokemonSpriteUrl(pokemonId: number): string {
  // Convert Infinite Fusion ID to National Pokédex number for sprite URL
  const nationalDexId = getNationalDexIdFromInfiniteFusionId(pokemonId);
  const spriteId = nationalDexId || pokemonId; // Fallback to original ID if conversion fails
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId}.png`;
}

// Virtualized Pokemon Option Component
const VirtualizedPokemonOption = React.memo(({
  pokemon,
  selected,
  active,
  onSelect,
  index
}: {
  pokemon: PokemonOption;
  selected: boolean;
  active: boolean;
  onSelect: () => void;
  index: number;
}) => (
  <div
    id={`pokemon-option-${index}`}
    className={clsx(
      'relative cursor-default select-none py-2 pr-4 pl-13',
      {
        'bg-blue-600 text-white': active,
        'text-gray-900 dark:text-gray-100': !active
      }
    )}
    onClick={onSelect}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect();
      }
    }}
    role="option"
    aria-selected={selected}
    aria-label={`${pokemon.name}${selected ? ' (selected)' : ''}`}
    tabIndex={active ? 0 : -1}
  >
    <div className="flex items-center gap-4 cursor-pointer">
      {/* Pokemon Sprite */}
      <img
        src={getPokemonSpriteUrl(pokemon.id)}
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
        className="absolute inset-y-0 left-2 flex items-center pl-2"
        aria-hidden="true"
      >
        <Check className={clsx("w-6 h-6", {
          'text-white': active,
          'text-blue-400': !active
        })} aria-hidden="true" />
      </span>
    ) : null}
  </div>
));

VirtualizedPokemonOption.displayName = 'VirtualizedPokemonOption';

// Virtualized List Component for Combobox Options
const VirtualizedComboboxOptions = React.memo(({
  options,
  selectedValue,
  onSelect,
  itemHeight = 60,
  maxHeight = 240
}: {
  options: PokemonOption[];
  selectedValue: PokemonOption | null;
  onSelect: (pokemon: PokemonOption) => void;
  itemHeight?: number;
  maxHeight?: number;
}) => {
  const itemCount = options.length;
  const listHeight = Math.min(itemCount * itemHeight, maxHeight);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  // Reset active index when options change
  React.useEffect(() => {
    setActiveIndex(-1);
  }, [options]);

  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const pokemon = options[index];
    const isSelected = selectedValue?.id === pokemon.id;
    const isActive = index === activeIndex;

    return (
      <div style={style}>
        <VirtualizedPokemonOption
          pokemon={pokemon}
          selected={isSelected}
          active={isActive}
          onSelect={() => onSelect(pokemon)}
          index={index}
        />
      </div>
    );
  }, [options, selectedValue, onSelect, activeIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, itemCount - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (activeIndex >= 0 && activeIndex < options.length) {
          onSelect(options[activeIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        // Close the combobox (this will be handled by Headless UI)
        break;
    }
  }, [itemCount, activeIndex, options, onSelect]);

  if (itemCount === 0) {
    return (
      <div className="relative cursor-default select-none px-4 py-2 text-gray-700 dark:text-gray-300">
        No Pokemon found.
      </div>
    );
  }

  return (
    <div
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="listbox"
      aria-label="Pokemon options"
      aria-activedescendant={activeIndex >= 0 ? `pokemon-option-${activeIndex}` : undefined}
    >
      <List
        height={listHeight}
        itemCount={itemCount}
        itemSize={itemHeight}
        width="100%"
        className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
        overscanCount={5} // Render 5 items above and below the visible area for smoother scrolling
        onItemsRendered={({ visibleStartIndex }) => {
          // Update active index when items are rendered
          if (activeIndex === -1 && visibleStartIndex >= 0) {
            setActiveIndex(visibleStartIndex);
          }
        }}
      >
        {Row}
      </List>
    </div>
  );
});

VirtualizedComboboxOptions.displayName = 'VirtualizedComboboxOptions';

// Pokemon Combobox Component - Memoized for performance with virtualization
export const PokemonCombobox = React.memo(({
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

  // Handle option selection from virtualized list
  const handleOptionSelect = useCallback((pokemon: PokemonOption) => {
    onChange(pokemon);
  }, [onChange]);

  return (
    <Combobox value={value || null} onChange={handleChange} disabled={disabled} immediate>
      <div className="relative">
        <div className="relative">
          <ComboboxInput
            className={clsx(
              "w-full px-3 py-2 text-sm border rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
              "border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:ring-blue-400"
            )}
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
        <ComboboxOptions
          className={clsx(
            "absolute z-10 mt-1 w-full overflow-hidden rounded-md py-1 text-base shadow-lg focus:outline-none sm:text-sm",
            "bg-white dark:bg-gray-800",
            "border border-gray-400 dark:border-gray-600"
          )}
        >
          <VirtualizedComboboxOptions
            options={filteredOptions}
            selectedValue={value || null}
            onSelect={handleOptionSelect}
            itemHeight={60}
            maxHeight={240}
          />
        </ComboboxOptions>
      </div>
    </Combobox>
  );
});

PokemonCombobox.displayName = 'PokemonCombobox'; 