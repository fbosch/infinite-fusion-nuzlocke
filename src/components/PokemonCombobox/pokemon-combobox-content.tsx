import type React from "react";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { PokemonComboboxInput } from "./pokemon-combobox-input";
import { PokemonComboboxMenu } from "./pokemon-combobox-menu";

interface PokemonComboboxContentProps {
  comboboxId?: string;
  displayValue: (pokemon: PokemonOptionType | null | undefined) => string;
  dragPreview: PokemonOptionType | null;
  floatingStyles: React.CSSProperties;
  isCompact: boolean;
  locationId?: string;
  onChange: (value: PokemonOptionType | null) => void;
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  open: boolean;
  optionsContent: React.ReactNode;
  placeholder: string;
  placement: string;
  setInputReference: (element: HTMLInputElement | null) => void;
  setOptionsReference: (element: HTMLDivElement | null) => void;
  shouldLoad: boolean;
  shouldVirtualize: boolean;
  value: PokemonOptionType | null | undefined;
  virtualization: {
    isScrolling: boolean;
    totalSize: number;
  };
}

const hasRoundedEdge = (placement: string) =>
  !(placement.startsWith("bottom") || placement.startsWith("top"));

export function PokemonComboboxContent({
  comboboxId,
  displayValue,
  dragPreview,
  floatingStyles,
  isCompact,
  locationId,
  onChange,
  onInputChange,
  open,
  optionsContent,
  placeholder,
  placement,
  setInputReference,
  setOptionsReference,
  shouldLoad,
  shouldVirtualize,
  value,
  virtualization,
}: PokemonComboboxContentProps) {
  const hasRoundedEdges = hasRoundedEdge(placement);
  return (
    <div key={comboboxId}>
      <PokemonComboboxInput
        comboboxId={comboboxId}
        displayValue={displayValue}
        dragPreview={dragPreview}
        hasRoundedEdges={hasRoundedEdges}
        isCompact={isCompact}
        locationId={locationId}
        onChange={onChange}
        onInputChange={onInputChange}
        open={open}
        placeholder={placeholder}
        placement={placement}
        setInputReference={setInputReference}
        shouldLoad={shouldLoad}
        value={value}
      />
      {open ? (
        <PokemonComboboxMenu
          floatingStyles={floatingStyles}
          hasRoundedEdges={hasRoundedEdges}
          optionsContent={optionsContent}
          placement={placement}
          setOptionsReference={setOptionsReference}
          shouldVirtualize={shouldVirtualize}
          virtualization={virtualization}
        />
      ) : null}
    </div>
  );
}
