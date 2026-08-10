import { ComboboxInput } from "@headlessui/react";
import clsx from "clsx";
import { Search } from "lucide-react";
import type React from "react";
import { type PokemonOptionType, PokemonStatus } from "@/loaders/pokemon";
import { DraggableComboboxSprite } from "./draggable-combobox-sprite";
import { PokemonEvolutionButton } from "./pokemon-evolution-button";

interface PokemonComboboxInputProps {
  comboboxId?: string;
  displayValue: (pokemon: PokemonOptionType | null | undefined) => string;
  dragPreview: PokemonOptionType | null;
  hasRoundedEdges: boolean;
  isCompact: boolean;
  locationId?: string;
  onChange: (value: PokemonOptionType | null) => void;
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  open: boolean;
  placeholder: string;
  placement: string;
  setInputReference: (element: HTMLInputElement | null) => void;
  shouldLoad: boolean;
  value: PokemonOptionType | null | undefined;
}

const getInputClassName = ({
  dragPreview,
  hasRoundedEdges,
  isCompact,
  open,
  placement,
  value,
}: Pick<
  PokemonComboboxInputProps,
  | "dragPreview"
  | "hasRoundedEdges"
  | "isCompact"
  | "open"
  | "placement"
  | "value"
>) =>
  clsx(
    "group/input rounded-t-md rounded-b-none border",
    "w-full bg-white py-3.5 text-gray-900 text-sm outline-none focus:outline-none focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50",
    isCompact ? "pr-14 pl-3 sm:pr-3" : "px-3",
    "border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus-visible:ring-blue-400",
    "hover:cursor-pointer focus:cursor-text",
    (value || dragPreview) && "pl-16",
    dragPreview && "border-blue-500 bg-blue-50 opacity-60 dark:bg-blue-900/20",
    {
      "rounded-md": hasRoundedEdges,
      "rounded-t-md rounded-b-none": open && placement.startsWith("bottom"),
      "rounded-t-none rounded-b-md": open && placement.startsWith("top"),
    },
  );

interface PokemonEvolutionControlProps {
  locationId: string | undefined;
  onChange: (value: PokemonOptionType | null) => void;
  open: boolean;
  shouldLoad: boolean;
  value: PokemonOptionType | null | undefined;
}

function PokemonEvolutionControl({
  locationId,
  onChange,
  open,
  shouldLoad,
  value,
}: PokemonEvolutionControlProps) {
  const isUnavailable =
    open ||
    value?.status === PokemonStatus.DECEASED ||
    value?.status === PokemonStatus.MISSED;

  if (isUnavailable) {
    return null;
  }

  return (
    <PokemonEvolutionButton
      locationId={locationId}
      onChange={onChange}
      shouldLoad={shouldLoad}
      value={value}
    />
  );
}

export function PokemonComboboxInput({
  comboboxId,
  displayValue,
  dragPreview,
  hasRoundedEdges,
  isCompact,
  locationId,
  onChange,
  onInputChange,
  open,
  placeholder,
  placement,
  setInputReference,
  shouldLoad,
  value,
}: PokemonComboboxInputProps) {
  return (
    <div className="relative">
      <ComboboxInput
        autoComplete="off"
        className={getInputClassName({
          dragPreview,
          hasRoundedEdges,
          isCompact,
          open,
          placement,
          value,
        })}
        displayValue={displayValue}
        onChange={onInputChange}
        placeholder={placeholder}
        ref={setInputReference}
        spellCheck={false}
      />
      <DraggableComboboxSprite
        comboboxId={comboboxId}
        dragPreview={dragPreview}
        locationId={locationId}
        value={value}
      />
      <PokemonEvolutionControl
        locationId={locationId}
        onChange={onChange}
        open={open}
        shouldLoad={shouldLoad}
        value={value}
      />
      {open ? (
        <Search
          aria-hidden={true}
          className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-gray-400 dark:text-gray-600"
        />
      ) : null}
    </div>
  );
}
