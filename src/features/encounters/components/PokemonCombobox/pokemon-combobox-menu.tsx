import { FloatingPortal } from "@floating-ui/react";
import { ComboboxOptions } from "@headlessui/react";
import clsx from "clsx";
import type React from "react";

interface PokemonComboboxMenuProps {
  floatingStyles: React.CSSProperties;
  hasRoundedEdges: boolean;
  optionsContent: React.ReactNode;
  placement: string;
  setOptionsReference: (element: HTMLDivElement | null) => void;
  shouldVirtualize: boolean;
  virtualization: {
    isScrolling: boolean;
    totalSize: number;
  };
}

export function PokemonComboboxMenu({
  floatingStyles,
  hasRoundedEdges,
  optionsContent,
  placement,
  setOptionsReference,
  shouldVirtualize,
  virtualization,
}: PokemonComboboxMenuProps) {
  return (
    <FloatingPortal id="location-table">
      <div
        className={clsx(
          "relative z-40 max-h-[31.25rem] overflow-y-auto",
          "px-1 text-base shadow-lg focus:outline-none sm:text-sm",
          "gap-x-2 bg-white dark:bg-gray-800",
          "scrollbar-thin border border-gray-300 dark:border-gray-600",
          {
            "rounded-md": hasRoundedEdges,
            "rounded-t-md rounded-b-none border-b-0":
              placement.startsWith("top"),
            "rounded-t-none rounded-b-md border-t-0":
              placement.startsWith("bottom"),
          },
        )}
        ref={setOptionsReference}
        style={floatingStyles}
      >
        <ComboboxOptions
          className={clsx({
            "pointer-events-none": virtualization.isScrolling,
          })}
          style={
            shouldVirtualize
              ? {
                  height: `${virtualization.totalSize}px`,
                  position: "relative",
                }
              : undefined
          }
        >
          {optionsContent}
        </ComboboxOptions>
      </div>
    </FloatingPortal>
  );
}
