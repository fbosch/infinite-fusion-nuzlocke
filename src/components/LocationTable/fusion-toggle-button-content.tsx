import clsx from "clsx";
import { Dna, DnaOff } from "lucide-react";
import Image from "next/image";
import type { DragEventHandler, MouseEventHandler } from "react";
import { DNA_SPLICER_ICON } from "@/constants/items";
import { CursorTooltip } from "../cursor-tooltip";

interface FusionToggleButtonContentProps {
  isDisabled: boolean;
  isDropAllowed: boolean;
  isFusion: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
  onDragEnd: DragEventHandler<HTMLButtonElement>;
  onDragOver: DragEventHandler<HTMLButtonElement>;
  onDrop: DragEventHandler<HTMLButtonElement>;
  selectedPokemonName?: string;
}

const getTooltipLabel = (isDisabled: boolean, isFusion: boolean) => {
  if (isDisabled) {
    return "Cannot fuse Eggs";
  }

  return isFusion ? "Unfuse" : "Fuse";
};

export function FusionToggleButtonContent({
  isDisabled,
  isDropAllowed,
  isFusion,
  onClick,
  onDragEnd,
  onDragOver,
  onDrop,
  selectedPokemonName,
}: FusionToggleButtonContentProps) {
  const tooltipLabel = getTooltipLabel(isDisabled, isFusion);
  const buttonLabel = isDisabled
    ? "Cannot fuse Eggs"
    : `Toggle fusion for ${selectedPokemonName || "Pokemon"}`;
  const Icon = isFusion ? DnaOff : Dna;

  return (
    <button
      aria-label={buttonLabel}
      className={clsx(
        "group",
        "flex size-10 items-center justify-center self-center",
        "rounded-md border p-2 transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        {
          "bg-blue-50 ring-2 ring-blue-500 ring-opacity-50 dark:bg-blue-900/20":
            isDropAllowed && !isDisabled,
          "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-500":
            isDisabled,
          "cursor-pointer border-gray-300 bg-white text-gray-700 hover:border-green-600 hover:bg-green-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-green-700":
            !(isFusion || isDisabled),
          "cursor-pointer border-gray-300 bg-white text-gray-700 hover:border-red-600 hover:bg-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300":
            isFusion,
        },
      )}
      disabled={isDisabled}
      onClick={onClick}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      type="button"
    >
      <CursorTooltip
        content={
          <div className="flex items-center gap-2">
            <Image
              alt="DNA Splicer"
              className="image-rendering-pixelated object-contain object-center"
              height={24}
              src={DNA_SPLICER_ICON}
              width={24}
            />
            <span className="text-sm">{tooltipLabel}</span>
          </div>
        }
        delay={300}
      >
        <Icon
          className={clsx(
            "size-6",
            isDisabled
              ? "text-gray-400 dark:text-gray-500"
              : "group-hover:text-white",
          )}
        />
      </CursorTooltip>
    </button>
  );
}
