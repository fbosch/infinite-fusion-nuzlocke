"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import clsx from "clsx";
import { X } from "lucide-react";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { useActivePlaythrough } from "@/stores/playthroughs/hooks";
import { TeamMemberPreviewPanel } from "./TeamMemberPreviewPanel";
import { TeamMemberSelectionProvider } from "./TeamMemberSelectionContext";
import { TeamMemberSelectionPanel } from "./TeamMemberSelectionPanel";

interface TeamMemberPickerModalProps {
  existingTeamMember?: {
    position: number;
    isEmpty: boolean;
    location?: string;
    headPokemon?: PokemonOptionType | null;
    bodyPokemon?: PokemonOptionType | null;
    isFusion?: boolean;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (
    headPokemon: PokemonOptionType | null,
    bodyPokemon: PokemonOptionType | null,
  ) => Promise<boolean>;
  position: number;
}

export default function TeamMemberPickerModal({
  isOpen,
  onClose,
  onSelect,
  position,
  existingTeamMember,
}: TeamMemberPickerModalProps) {
  const activePlaythrough = useActivePlaythrough();

  return (
    <Dialog
      className="group relative z-[80]"
      onClose={onClose}
      open={isOpen && !!activePlaythrough}
    >
      <DialogBackdrop
        aria-hidden="true"
        className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-[2px] data-closed:opacity-0 data-enter:opacity-100 dark:bg-black/50"
        transition
      />

      <div className="fixed inset-0 z-[81] flex w-screen items-center justify-center p-2 sm:p-4">
        <DialogPanel
          aria-labelledby="team-member-picker-title"
          className={clsx(
            "flex max-h-[95vh] w-full max-w-6xl flex-col space-y-3 rounded-lg border border-gray-200 bg-white p-3 shadow-xl sm:max-h-[80vh] sm:space-y-4 sm:p-6 dark:border-gray-700 dark:bg-gray-800",
            "transition duration-150 ease-out data-closed:scale-98 data-closed:opacity-0",
          )}
          id="team-member-picker-modal"
          transition
        >
          <TeamMemberSelectionProvider
            existingTeamMember={existingTeamMember}
            key={`team-member-selection-${position}`}
            onClose={onClose}
            onSelect={onSelect}
            position={position}
          >
            <div className="flex items-center justify-between">
              <DialogTitle
                className="font-semibold text-gray-900 text-lg sm:text-2xl dark:text-white"
                id="team-member-picker-title"
              >
                Select Pokémon for Team Slot {position + 1}
              </DialogTitle>
              <button
                aria-label="Close modal"
                className={clsx(
                  "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                  "cursor-pointer rounded-md p-1 transition-colors",
                )}
                onClick={onClose}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-6 lg:flex-row">
              <TeamMemberSelectionPanel />
              <div className="hidden w-px bg-gray-200 lg:block dark:bg-gray-600" />
              <TeamMemberPreviewPanel />
            </div>
          </TeamMemberSelectionProvider>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
