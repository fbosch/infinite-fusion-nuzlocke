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
  virtualizer: {
    getTotalSize: () => number;
    isScrolling: boolean;
  };
}

export function PokemonComboboxMenu({
  floatingStyles,
  hasRoundedEdges,
  optionsContent,
  placement,
  setOptionsReference,
  shouldVirtualize,
  virtualizer,
}: PokemonComboboxMenuProps) {
  return (
    <FloatingPortal id="location-table">
      <div
        className={clsx(
          "relative z-40 h-full max-h-[31.25rem] overflow-y-auto",
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
        style={{
          ...floatingStyles,
          height: shouldVirtualize ? `${virtualizer.getTotalSize()}px` : "auto",
        }}
      >
        <ComboboxOptions
          className={clsx("h-full", {
            "pointer-events-none": virtualizer.isScrolling,
          })}
        >
          {optionsContent}
        </ComboboxOptions>
      </div>
    </FloatingPortal>
  );
}
