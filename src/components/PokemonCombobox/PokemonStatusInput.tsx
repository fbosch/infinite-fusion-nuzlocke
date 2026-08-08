"use client";

import {
  autoUpdate,
  FloatingPortal,
  flip,
  useFloating,
} from "@floating-ui/react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import clsx from "clsx";
import { ArrowUpDown, ChevronDown, Computer, Gift, Skull } from "lucide-react";
import { startTransition } from "react";
import { match } from "ts-pattern";
import EscapeIcon from "@/assets/images/escape-cloud.svg";
import PokeballIcon from "@/assets/images/pokeball.svg";
import {
  type PokemonOptionType,
  PokemonStatus,
  type PokemonStatusType,
} from "@/loaders/pokemon";

interface PokemonStatusInputProps {
  disabled?: boolean;
  dragPreview?: PokemonOptionType | null;
  onChange: (value: PokemonOptionType | null) => void;
  value: PokemonOptionType | null | undefined;
}

const getStatusIcon = (status: PokemonStatusType) =>
  match(status)
    .with(PokemonStatus.CAPTURED, () => (
      <PokeballIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
    ))
    .with(PokemonStatus.RECEIVED, () => (
      <Gift className="h-4 w-4 text-gray-600 dark:text-gray-300" />
    ))
    .with(PokemonStatus.TRADED, () => (
      <ArrowUpDown className="h-4 w-4 text-gray-600 dark:text-gray-300" />
    ))
    .with(PokemonStatus.MISSED, () => (
      <EscapeIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
    ))
    .with(PokemonStatus.STORED, () => (
      <Computer className="h-4 w-4 text-gray-600 dark:text-gray-300" />
    ))
    .with(PokemonStatus.DECEASED, () => (
      <Skull className="h-4 w-4 text-gray-600 dark:text-gray-300" />
    ))
    .otherwise(() => null);

export const PokemonStatusInput = ({
  value,
  onChange,
  disabled = false,
  dragPreview,
}: PokemonStatusInputProps) => {
  const selectedStatus = dragPreview?.status ?? value?.status ?? null;

  // Floating UI setup
  const { refs, floatingStyles, placement } = useFloating({
    middleware: [flip()],
    placement: "bottom-end",
    whileElementsMounted: autoUpdate,
  });

  // Handle status selection
  const handleStatusSelect = (newStatus: PokemonStatusType) => {
    if (value) {
      // Use startTransition to defer the state update
      startTransition(() => {
        const updatedPokemon: PokemonOptionType = {
          ...value,
          status: newStatus,
        };
        onChange(updatedPokemon);
      });
    }
  };

  return (
    <Menu>
      {({ open }) => (
        <div className="relative">
          <MenuButton
            className={clsx(
              "border-t-0 capitalize",
              "flex items-center justify-between border bg-white px-4 py-3.5 text-sm focus:outline-none focus-visible:ring-1 dark:text-gray-400",
              "focus:outline-none",
              "focus:ring-inset focus-visible:border-blue-500 focus-visible:ring-blue-500 disabled:cursor-not-allowed",
              "border-gray-300 dark:border-gray-600 dark:bg-gray-800 enabled:dark:text-white dark:focus-visible:ring-blue-400",
              "enabled:hover:bg-gray-50 dark:enabled:hover:bg-gray-700",
              "min-w-[140px] enabled:hover:cursor-pointer",
              dragPreview && "pointer-events-none opacity-60",
              {
                "rounded-br-md": open && placement.startsWith("top"),
                "rounded-none rounded-b-none border-t-0":
                  open && placement.startsWith("bottom"),
                "rounded-t-none rounded-br-md": !open,
              },
            )}
            disabled={!value || disabled}
            ref={refs.setReference}
          >
            <div className="flex items-center gap-2">
              {selectedStatus && getStatusIcon(selectedStatus)}
              <span>{selectedStatus || "Status"}</span>
            </div>
            <ChevronDown aria-hidden="true" className="h-4 w-4 text-gray-400" />
          </MenuButton>

          {open && (
            <FloatingPortal>
              <MenuItems
                className={clsx(
                  "z-50 overflow-hidden text-base focus:outline-none sm:text-sm",
                  "bg-white dark:bg-gray-800",
                  "border-1 border-gray-300 dark:border-gray-600",
                  "min-w-[140px]",
                  {
                    "rounded-b-md border-t-0": placement.startsWith("bottom"),
                    "rounded-t-md": placement.startsWith("top"),
                  },
                )}
                ref={refs.setFloating}
                style={floatingStyles}
              >
                {Object.values(PokemonStatus).map(
                  (statusValue: PokemonStatusType) => (
                    <MenuItem key={statusValue}>
                      {({ focus }) => (
                        <button
                          className={clsx(
                            "group flex w-full cursor-pointer items-center px-4 py-2 text-sm",
                            "text-left focus:outline-none",
                            {
                              "bg-gray-100 ring-inset focus-visible:ring-1 focus-visible:ring-blue-500 dark:bg-gray-700":
                                focus,
                              "bg-gray-200 dark:bg-gray-600":
                                selectedStatus === statusValue && !focus,
                            },
                          )}
                          onClick={() => handleStatusSelect(statusValue)}
                          type="button"
                        >
                          <div className="flex items-center gap-2">
                            {getStatusIcon(statusValue)}
                            <span>
                              {statusValue.charAt(0).toUpperCase() +
                                statusValue.slice(1)}
                            </span>
                          </div>
                        </button>
                      )}
                    </MenuItem>
                  ),
                )}
              </MenuItems>
            </FloatingPortal>
          )}
        </div>
      )}
    </Menu>
  );
};
