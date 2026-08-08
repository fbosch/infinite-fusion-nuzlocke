"use client";

import { ComboboxOption } from "@headlessui/react";
import clsx from "clsx";
import { Check, Loader2, Search } from "lucide-react";
import type React from "react";
import {
  getEncounterDisplayName,
  isEgg,
  type PokemonOptionType,
} from "@/loaders/pokemon";
import type { EncounterSource } from "@/types/encounters";
import { PokemonSprite } from "../PokemonSprite";
import { SourceTag } from "./SourceTag";

export interface FusionCombinationOption extends PokemonOptionType {
  fusionBody: PokemonOptionType;
}

export function isFusionCombinationOption(
  pokemon: PokemonOptionType,
): pokemon is FusionCombinationOption {
  return "fusionBody" in pokemon;
}

interface PokemonOptionsProps {
  comboboxId: string;
  deferredQuery: string;
  finalOptions: PokemonOptionType[];
  gameMode: "classic" | "remix" | "randomized";
  getPokemonSource: (pokemonId: number) => EncounterSource[];
  isDuplicatePokemon: (pokemonId: number) => boolean;
  isLoading?: boolean;
  isRoutePokemon: (pokemonId: number) => boolean;
  locationId: string | undefined;
}

interface PokemonOptionProps {
  className?: string;
  comboboxId?: string;
  disabled?: boolean;
  gameMode: "classic" | "remix" | "randomized";
  getPokemonSource: (pokemonId: number) => EncounterSource[];
  index?: number;
  isDuplicatePokemon: (pokemonId: number) => boolean;
  isRoutePokemon: (pokemonId: number) => boolean;
  locationId: string | undefined;
  pokemon: PokemonOptionType;
  style?: React.CSSProperties;
}

interface PokemonOptionContentProps {
  gameMode: "classic" | "remix" | "randomized";
  getPokemonSource: (pokemonId: number) => EncounterSource[];
  isActive?: boolean;
  isDuplicatePokemon: (pokemonId: number) => boolean;
  isRoutePokemon: (pokemonId: number) => boolean;
  isSelected?: boolean;
  locationId: string | undefined;
  pokemon: PokemonOptionType;
}

function PokemonOptionContent({
  pokemon,
  isRoutePokemon,
  isDuplicatePokemon,
  getPokemonSource,
  gameMode,
  locationId,
  isActive = false,
  isSelected = false,
}: PokemonOptionContentProps) {
  const displayName = getEncounterDisplayName(pokemon);
  const isDuplicate = isDuplicatePokemon(pokemon.id);

  return (
    <div className={"group flex w-full items-center gap-4"}>
      <div className="flex size-10 items-center justify-center">
        <PokemonSprite generation="gen7" pokemonId={pokemon.id} />
      </div>
      <span
        className={clsx(
          "block flex-1 truncate",
          "group-data-selected:",
          "not:group-data-selected:font-normal",
          isSelected && "",
        )}
      >
        {displayName}
      </span>
      <div className="group flex items-center gap-2">
        {gameMode !== "randomized" && isRoutePokemon(pokemon.id) && (
          <SourceTag
            locationId={locationId}
            sources={getPokemonSource(pokemon.id)}
          />
        )}
        {isDuplicate && (
          <span
            className={clsx(
              "rounded-sm px-1.5 py-0.5 font-medium text-xs leading-none",
              "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200",
              "border border-amber-200/60 dark:border-amber-700/40",
              isActive && "group-hover:border-white/60 group-hover:text-white",
            )}
            title="Already captured"
          >
            Dup
          </span>
        )}
        <span
          className={clsx(
            "inline-block w-8 text-right text-xs dark:text-gray-400",
            isActive &&
              "group-hover:text-white group-data-selected:group-hover:text-white",
          )}
        >
          {isEgg(pokemon) ? "???" : pokemon.id.toString().padStart(3, "0")}
        </span>
        <div className="flex h-5 w-5 items-center justify-center">
          <Check
            aria-hidden="true"
            className={clsx(
              "size-5 text-blue-400 dark:text-white",
              isActive && "group-hover:text-white",
              isSelected ? "visible" : "invisible group-data-selected:visible",
            )}
          />
        </div>
      </div>
    </div>
  );
}

export function PokemonOption({
  pokemon,
  isRoutePokemon,
  isDuplicatePokemon,
  getPokemonSource,
  gameMode,
  style,
  disabled,
  locationId,
  className,
}: PokemonOptionProps) {
  const baseClassName = clsx(
    "relative my-1 cursor-pointer select-none p-2 content-visibility-auto",
    "flex w-full items-center rounded-md",
    "group h-14",
    className,
  );

  return (
    <ComboboxOption
      className={({ active }) =>
        clsx(
          baseClassName,
          {
            // Disable active state when user is scrolling to prevent auto-scroll
            "bg-blue-600 text-white": active,
            "text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700":
              !active,
          },
          className,
        )
      }
      disabled={disabled}
      style={style}
      value={pokemon}
    >
      {({ active, selected }) => (
        <PokemonOptionContent
          gameMode={gameMode}
          getPokemonSource={getPokemonSource}
          isActive={active}
          isDuplicatePokemon={isDuplicatePokemon}
          isRoutePokemon={isRoutePokemon}
          isSelected={selected}
          locationId={locationId}
          pokemon={pokemon}
        />
      )}
    </ComboboxOption>
  );
}

interface FusionCombinationOptionProps {
  pokemon: FusionCombinationOption;
}

export function FusionCombinationOption({
  pokemon,
}: FusionCombinationOptionProps) {
  return (
    <ComboboxOption
      className={({ active }) =>
        clsx(
          "group relative my-1 flex h-14 w-full cursor-pointer select-none items-center rounded-md p-2",
          active
            ? "bg-blue-600 text-white"
            : "text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700",
        )
      }
      value={pokemon}
    >
      {({ active }) => (
        <div className="group flex w-full items-center gap-4">
          <div aria-hidden="true" className="flex -space-x-2">
            <div className="flex size-10 items-center justify-center">
              <PokemonSprite
                aria-hidden="true"
                generation="gen7"
                pokemonId={pokemon.id}
              />
            </div>
            <div className="flex size-10 items-center justify-center">
              <PokemonSprite
                aria-hidden="true"
                generation="gen7"
                pokemonId={pokemon.fusionBody.id}
              />
            </div>
          </div>
          <span className="block flex-1 truncate">
            {pokemon.name} / {pokemon.fusionBody.name}
          </span>
          <span
            className={clsx(
              "whitespace-nowrap text-xs dark:text-gray-400",
              active && "text-white",
            )}
          >
            {pokemon.id}.{pokemon.fusionBody.id}
          </span>
        </div>
      )}
    </ComboboxOption>
  );
}

export const PokemonOptions: React.FC<PokemonOptionsProps> = ({
  finalOptions,
  deferredQuery,
  isRoutePokemon,
  isDuplicatePokemon,
  getPokemonSource,
  locationId,
  gameMode,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="relative cursor-default select-none p-2 text-center">
        <div className="text-gray-500 dark:text-gray-400">
          <p className="flex items-center justify-center gap-2 py-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading Pokémon...</span>
          </p>
        </div>
      </div>
    );
  }

  if (finalOptions.length === 0) {
    return (
      <div className="relative cursor-default select-none p-2 text-center">
        <div className="text-gray-500 dark:text-gray-400">
          {deferredQuery ? (
            <>
              <p className="text-sm">
                No Pokémon found for &quot;{deferredQuery}&quot;
              </p>
              <p className="mt-1 text-xs">Try a different search term</p>
            </>
          ) : (
            <p className="flex items-center justify-center gap-2 py-2 text-sm">
              <Search className="h-4 w-4" />
              <span>Search for Pokémon</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  // Use the PokemonOption component
  return finalOptions.map((pokemon) => (
    <PokemonOption
      gameMode={gameMode}
      getPokemonSource={getPokemonSource}
      isDuplicatePokemon={isDuplicatePokemon}
      isRoutePokemon={isRoutePokemon}
      key={
        pokemon.uid ?? `${pokemon.id}-${pokemon.nationalDexId}-${pokemon.name}`
      }
      locationId={locationId}
      pokemon={pokemon}
    />
  ));
};

PokemonOptions.displayName = "PokemonOptions";
