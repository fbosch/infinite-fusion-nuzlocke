import { Combobox } from "@headlessui/react";
import type React from "react";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { PokemonComboboxContent } from "./pokemon-combobox-content";
import { PokemonComboboxDragSurface } from "./pokemon-combobox-drag-surface";
import { PokemonNicknameInput } from "./pokemon-nickname-input";
import { PokemonStatusInput } from "./pokemon-status-input";

interface PokemonComboboxShellProps {
  combobox: {
    disabled: boolean;
    handleChange: (
      value: PokemonOptionType | null | undefined,
    ) => Promise<void>;
    handleClose: () => void;
    value: PokemonOptionType | null | undefined;
  };
  content: Omit<React.ComponentProps<typeof PokemonComboboxContent>, "open">;
  details: {
    disabled: boolean;
    dragPreview: PokemonOptionType | null;
    nicknamePlaceholder: string;
    onChange: (value: PokemonOptionType | null) => void;
    value: PokemonOptionType | null | undefined;
  };
  drag: {
    onDragEnd: () => void;
    onDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  };
}

export function PokemonComboboxShell({
  combobox,
  content,
  details,
  drag,
}: PokemonComboboxShellProps) {
  return (
    <PokemonComboboxDragSurface
      className="relative"
      dataUid={details.dragPreview?.uid || details.value?.uid}
      id={details.value?.uid}
      {...drag}
    >
      <div
        className="location-highlight-overlay pointer-events-none absolute inset-0 z-10 max-w-screen rounded-lg border-2 border-blue-500/60 bg-blue-500/20 opacity-0 transition-opacity duration-200 ease-in-out"
        data-combobox-id={content.comboboxId}
      />
      <Combobox
        disabled={combobox.disabled}
        immediate
        onChange={combobox.handleChange}
        onClose={combobox.handleClose}
        value={combobox.value || null}
      >
        {({ open }) => <PokemonComboboxContent {...content} open={open} />}
      </Combobox>
      <div className="flex min-w-0 flex-col sm:flex-row">
        <PokemonNicknameInput
          disabled={details.disabled}
          dragPreview={details.dragPreview}
          key={`${details.value?.uid}-${details.value?.nickname || "no-nickname"}`}
          onChange={details.onChange}
          placeholder={details.nicknamePlaceholder}
          value={details.value}
        />
        <PokemonStatusInput
          disabled={details.disabled}
          dragPreview={details.dragPreview}
          key={`${details.value?.uid}status`}
          onChange={details.onChange}
          value={details.value}
        />
      </div>
    </PokemonComboboxDragSurface>
  );
}
