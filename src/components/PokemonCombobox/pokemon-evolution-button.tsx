"use client";

import {
  autoUpdate,
  FloatingPortal,
  flip,
  size,
  useFloating,
} from "@floating-ui/react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import clsx from "clsx";
import { Atom, ChevronDown, Undo2 } from "lucide-react";
import type React from "react";
import { useShiftKey } from "@/hooks/use-key-pressed";
import { emitEvolutionEvent } from "@/lib/events";
import {
  type PokemonOptionType,
  usePokemonEvolutionData,
} from "@/loaders/pokemon";
import { CursorTooltip } from "../cursor-tooltip";
import { PokemonSprite } from "../PokemonSprite";

interface PokemonEvolutionButtonProps {
  locationId?: string;
  onChange: (value: PokemonOptionType | null) => void;
  shouldLoad?: boolean;
  value: PokemonOptionType | null | undefined;
}

interface EvolutionDropdownProps {
  availableEvolutions: PokemonOptionType[];
  isLoadingEvolutions: boolean;
  onSelectEvolution: (evolution: PokemonOptionType) => void;
}

interface DirectEvolutionButtonProps {
  isDevolutionMode: boolean;
  onClick: () => void;
  pokemon: PokemonOptionType;
  showDevolutionHint: boolean;
}

// Evolution Dropdown Component
const EvolutionDropdown: React.FC<EvolutionDropdownProps> = ({
  availableEvolutions,
  onSelectEvolution,
  isLoadingEvolutions,
}) => {
  // Floating UI setup for portal positioning
  const { refs, floatingStyles, update } = useFloating({
    middleware: [
      flip({ padding: 8 }),
      size({
        apply({ elements, availableHeight, availableWidth }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.min(300, availableHeight - 8)}px`,
            maxWidth: `${availableWidth - 16}px`,
            minWidth: "200px",
          });
        },
        padding: 8,
      }),
    ],
    placement: "bottom-end",
    whileElementsMounted: autoUpdate,
  });

  const handleSelectEvolution = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    const { evolutionId } = event.currentTarget.dataset;
    const evolution = availableEvolutions.find(({ id }) => id === evolutionId);

    if (!evolution) {
      return;
    }

    onSelectEvolution(evolution);
  };

  return (
    <Menu>
      <MenuButton
        className={clsx(
          "flex items-center justify-center gap-1 rounded-md px-2 py-1",
          "bg-gray-100 text-gray-600 text-xs",
          "border border-gray-300 hover:border-blue-300 dark:border-gray-600 dark:hover:border-blue-400",
          "transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-400",
          "hover:cursor-pointer",
          "hover:border-blue-300 hover:bg-blue-100 hover:text-blue-600 dark:bg-blue-900/20 dark:hover:border-blue-400 dark:hover:text-blue-400",
          "data-[open]:border-blue-300 data-[open]:bg-blue-100 data-[open]:text-blue-600 dark:data-[open]:border-blue-400 dark:data-[open]:bg-blue-900/20 dark:data-[open]:text-blue-400",
        )}
        disabled={isLoadingEvolutions}
        onFocus={update}
        ref={refs.setReference}
      >
        <CursorTooltip
          content={
            <div className="flex items-center gap-2 text-sm">
              <span className="text-sm">Choose evolution</span>
              <span className="text-gray-400 text-xs">
                ({availableEvolutions.length} options)
              </span>
            </div>
          }
          delay={300}
        >
          <div className="flex items-center gap-1">
            <Atom className="h-3 w-3" />
            <ChevronDown className="h-3 w-3" />
          </div>
        </CursorTooltip>
      </MenuButton>

      <FloatingPortal>
        {/* react-doctor-disable-next-line react-hooks-js/refs -- Floating UI callback refs run during commit, not render. */}
        <MenuItems
          className={clsx(
            "z-50 text-base shadow-lg focus:outline-none sm:text-sm",
            "bg-white dark:bg-gray-800",
            "border border-gray-300 dark:border-gray-600",
            "scrollbar-thin mt-1 overflow-y-auto rounded-md",
          )}
          ref={refs.setFloating}
          style={floatingStyles}
        >
          <div
            className={clsx(
              "sticky top-0 border-gray-200 border-b bg-white px-3 pt-2 pb-2 text-gray-500 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400",
            )}
          >
            Choose Evolution
          </div>
          <div className="flex flex-col gap-1 overflow-y-auto p-1">
            {availableEvolutions.map((evolution) => (
              <MenuItem key={evolution.id}>
                {({ focus }) => (
                  <button
                    aria-label={`Evolve to ${evolution.name}`}
                    className={clsx(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:cursor-pointer",
                      "text-left text-gray-900 dark:text-gray-100",
                      "focus:outline-none",
                      {
                        "bg-blue-600 text-white": focus,
                        "hover:bg-gray-100 dark:hover:bg-gray-700": !focus,
                      },
                    )}
                    data-evolution-id={evolution.id}
                    onClick={handleSelectEvolution}
                    type="button"
                  >
                    <div className="flex size-8 items-center justify-center">
                      <PokemonSprite
                        generation="gen7"
                        pokemonId={evolution.id}
                      />
                    </div>
                    <span className="">{evolution.name}</span>
                  </button>
                )}
              </MenuItem>
            ))}
          </div>
        </MenuItems>
      </FloatingPortal>
    </Menu>
  );
};

const DirectEvolutionButton: React.FC<DirectEvolutionButtonProps> = ({
  pokemon,
  isDevolutionMode,
  showDevolutionHint,
  onClick,
}) => (
  <div className="absolute inset-y-0 right-4 flex items-center">
    <CursorTooltip
      content={
        <div className="flex items-center gap-x-4">
          <div className="flex h-8 w-8 items-center justify-center">
            <PokemonSprite generation="gen7" pokemonId={pokemon.id} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span>
              {isDevolutionMode ? (
                <>
                  Devolve to{" "}
                  <span className="font-semibold">{pokemon.name}</span>
                </>
              ) : (
                <>
                  Evolve to{" "}
                  <span className="font-semibold">{pokemon.name}</span>
                </>
              )}
            </span>
            {showDevolutionHint ? (
              <span className="text-gray-400 text-xs">
                Hold shift to devolve
              </span>
            ) : null}
          </div>
        </div>
      }
      delay={300}
    >
      <button
        aria-label={isDevolutionMode ? "Devolve Pokemon" : "Evolve Pokemon"}
        className={clsx(
          "flex items-center justify-center gap-1 rounded-md px-2 py-1",
          "bg-gray-100 text-gray-600 text-xs",
          "border border-gray-300 hover:border-blue-300 dark:border-gray-600 dark:hover:border-blue-400",
          "transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-400",
          "hover:cursor-pointer",
          {
            "hover:border-blue-300 hover:bg-blue-100 hover:text-blue-600 dark:bg-blue-900/20 dark:hover:border-blue-400 dark:hover:text-blue-400":
              !isDevolutionMode,
            "hover:border-orange-300 hover:bg-orange-100 hover:text-orange-600 dark:hover:border-orange-400 dark:hover:bg-orange-900/20 dark:hover:text-orange-400":
              isDevolutionMode,
          },
        )}
        onClick={onClick}
        type="button"
      >
        {isDevolutionMode ? (
          <Undo2 className="h-3 w-3" />
        ) : (
          <Atom className="h-3 w-3" />
        )}
      </button>
    </CursorTooltip>
  </div>
);

export const PokemonEvolutionButton: React.FC<PokemonEvolutionButtonProps> = ({
  value,
  onChange,
  shouldLoad = true,
  locationId,
}) => {
  const isShiftPressed = useShiftKey();
  const { evolutions, preEvolution, isLoading } = usePokemonEvolutionData(
    value?.id,
    shouldLoad,
  );

  const availableEvolutions = evolutions.map((pokemon) => ({
    id: pokemon.id,
    name: pokemon.name,
    nationalDexId: pokemon.nationalDexId,
    originalLocation: value?.originalLocation,
  }));
  const availablePreEvolution = preEvolution
    ? {
        id: preEvolution.id,
        name: preEvolution.name,
        nationalDexId: preEvolution.nationalDexId,
        originalLocation: value?.originalLocation,
      }
    : null;

  const hasEvolutions = availableEvolutions.length > 0;
  const hasPreEvolution = !!availablePreEvolution;
  const isDevolutionMode = isShiftPressed && hasPreEvolution;

  const handleEvolution = (
    selectedEvolution?: PokemonOptionType,
    isDevolution = false,
  ) => {
    const nextPokemon =
      selectedEvolution ??
      (isDevolution ? availablePreEvolution : availableEvolutions.at(0));

    if (!nextPokemon) {
      return;
    }

    onChange({ ...value, ...nextPokemon });

    if (isDevolution) {
      return;
    }

    const id = locationId ?? value?.originalLocation ?? null;
    if (id) {
      emitEvolutionEvent(id);
    }
  };

  const handleDirectEvolution = () => {
    handleEvolution(undefined, isDevolutionMode);
  };

  // Don't render if no Pokemon is selected or no evolutions/devolutions available
  if (!(value && (hasEvolutions || isDevolutionMode)) || isLoading) {
    return null;
  }

  // For single evolution or devolution mode, render a simple button
  if (isDevolutionMode && availablePreEvolution) {
    return (
      <DirectEvolutionButton
        isDevolutionMode={isDevolutionMode}
        onClick={handleDirectEvolution}
        pokemon={availablePreEvolution}
        showDevolutionHint={false}
      />
    );
  }

  if (availableEvolutions.length === 1) {
    return (
      <DirectEvolutionButton
        isDevolutionMode={isDevolutionMode}
        onClick={handleDirectEvolution}
        pokemon={availableEvolutions[0]}
        showDevolutionHint={!isDevolutionMode && !!availablePreEvolution}
      />
    );
  }

  // For multiple evolutions, render the dropdown component
  return (
    <div className="absolute inset-y-0 right-4 flex items-center">
      <EvolutionDropdown
        availableEvolutions={availableEvolutions}
        isLoadingEvolutions={isLoading}
        onSelectEvolution={handleEvolution}
      />
    </div>
  );
};
