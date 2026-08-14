import { ArrowLeftRight } from "lucide-react";
import Image from "next/image";
import type React from "react";
import type { RefObject } from "react";
import { CursorTooltip } from "@/components/cursor-tooltip";
import { PokemonCombobox } from "@/components/PokemonCombobox/pokemon-combobox";
import { DNA_REVERSER_ICON } from "@/constants/items";
import type { RouteEncounterPokemon } from "@/loaders/encounters";
import type { PokemonOptionType } from "@/loaders/pokemon";

interface EncounterPokemonSelectorsProps {
  bodyComboboxRef: RefObject<HTMLInputElement | null>;
  bodyPokemon: PokemonOptionType | null;
  headPokemon: PokemonOptionType | null;
  isCustomLocation: boolean;
  isFusion: boolean;
  isRouteEncounterDataLoading: boolean;
  locationId: string;
  onBeforeBodyClear: (pokemon: PokemonOptionType) => Promise<boolean>;
  onBeforeBodyOverwrite: (
    currentPokemon: PokemonOptionType,
    nextPokemon: PokemonOptionType,
  ) => Promise<boolean>;
  onBeforeHeadClear: (pokemon: PokemonOptionType) => Promise<boolean>;
  onBeforeHeadOverwrite: (
    currentPokemon: PokemonOptionType,
    nextPokemon: PokemonOptionType,
  ) => Promise<boolean>;
  onBodyChange: (pokemon: PokemonOptionType | null) => void;
  onFlip: () => void;
  onHeadChange: (pokemon: PokemonOptionType | null) => void;
  onSingleFusionChange: (
    head: PokemonOptionType,
    body: PokemonOptionType,
  ) => void;
  routeEncounterData: RouteEncounterPokemon[];
  shouldLoad: boolean;
}

export function EncounterPokemonSelectors({
  bodyComboboxRef,
  bodyPokemon,
  headPokemon,
  isCustomLocation,
  isFusion,
  isRouteEncounterDataLoading,
  locationId,
  onBeforeBodyClear,
  onBeforeBodyOverwrite,
  onBeforeHeadClear,
  onBeforeHeadOverwrite,
  onBodyChange,
  onFlip,
  onHeadChange,
  onSingleFusionChange,
  routeEncounterData,
  shouldLoad,
}: EncounterPokemonSelectorsProps) {
  const comboboxProps = {
    isCompact: true,
    isCustomLocation,
    isFusion,
    isRouteEncounterDataLoading,
    locationId,
    nicknamePlaceholder: "Enter nickname",
    placeholder: "Select Pokémon",
    routeEncounterData,
    shouldLoad,
  };

  if (isFusion === false) {
    return (
      <PokemonCombobox
        config={{
          ...comboboxProps,
          comboboxId: `${locationId}-single`,
          onBeforeClear: onBeforeHeadClear,
          onBeforeOverwrite: onBeforeHeadOverwrite,
          onChange: onHeadChange,
          onFusionChange: onSingleFusionChange,
          value: headPokemon,
        }}
        key={`${locationId}-single`}
      />
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-4 sm:mt-0 sm:flex-row sm:items-center sm:gap-2">
      <LabeledPokemonCombobox
        config={{
          ...comboboxProps,
          comboboxId: `${locationId}-head`,
          onBeforeClear: onBeforeHeadClear,
          onBeforeOverwrite: onBeforeHeadOverwrite,
          onChange: onHeadChange,
          value: headPokemon,
        }}
        label="Head"
      />
      <div className="flex justify-center sm:contents">
        <FusionFlipButton onClick={onFlip} />
      </div>
      <LabeledPokemonCombobox
        config={{
          ...comboboxProps,
          comboboxId: `${locationId}-body`,
          onBeforeClear: onBeforeBodyClear,
          onBeforeOverwrite: onBeforeBodyOverwrite,
          onChange: onBodyChange,
          ref: bodyComboboxRef,
          value: bodyPokemon,
        }}
        label="Body"
      />
    </div>
  );
}

interface LabeledPokemonComboboxProps {
  config: React.ComponentProps<typeof PokemonCombobox>["config"];
  label: string;
}

function LabeledPokemonCombobox({
  label,
  config,
}: LabeledPokemonComboboxProps) {
  return (
    <div className="relative min-w-0 max-w-full flex-1">
      <span className="absolute -top-6 left-0 text-gray-500 text-xs dark:text-gray-400">
        {label}
      </span>
      <PokemonCombobox config={config} key={config.comboboxId} />
    </div>
  );
}

function FusionFlipButton({ onClick }: { onClick: () => void }) {
  return (
    <CursorTooltip
      className="origin-top"
      content={
        <div className="flex items-center gap-2">
          <Image
            alt="DNA Reverser"
            className="image-rendering-pixelated object-contain object-center"
            height={24}
            src={DNA_REVERSER_ICON}
            width={24}
          />
          <span className="text-sm">Reverse Fusion</span>
        </div>
      }
      delay={300}
      placement="bottom"
    >
      <button
        aria-label="Flip head and body"
        className="group flex size-6 items-center justify-center rounded-md border border-gray-300 bg-white p-1 transition-colors duration-200 hover:border-blue-600 hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-600 dark:bg-gray-800"
        onClick={onClick}
        type="button"
      >
        <ArrowLeftRight className="size-4 text-gray-600 group-hover:text-white dark:text-gray-300" />
      </button>
    </CursorTooltip>
  );
}
