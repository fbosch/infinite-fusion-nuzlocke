"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import clsx from "clsx";
import { X } from "lucide-react";
import TeamMemberPickerModal from "../team/TeamMemberPickerModal";
import { useTeamMemberPicker } from "../team/useTeamMemberPicker";
import { PokemonPCSheetContent } from "./PokemonPCSheetContent";
import { usePokemonPCSheetData } from "./usePokemonPCSheetData";

export interface PokemonPCSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: "team" | "box" | "graveyard";
  onChangeTab: (tab: "team" | "box" | "graveyard") => void;
}

export default function PokemonPCSheet({
  isOpen,
  onClose,
  activeTab,
  onChangeTab,
}: PokemonPCSheetProps) {
  const { team, stored, deceased, idToName } = usePokemonPCSheetData();
  const {
    pickerModalOpen,
    selectedPosition,
    openPicker,
    closePicker,
    selectTeamMember,
  } = useTeamMemberPicker();

  return (
    <Dialog open={isOpen} onClose={onClose} className="group relative z-[70]">
      <DialogBackdrop
        transition
        className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 ease-out data-closed:opacity-0 data-enter:opacity-100 dark:bg-black/30"
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 z-[71] flex w-screen items-stretch justify-end p-0">
        <DialogPanel
          transition
          id="pokemon-pc-sheet"
          aria-labelledby="pokemon-pc-title"
          className={clsx(
            "h-full w-full max-w-lg border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800",
            "transform-gpu will-change-transform",
            "transition-all duration-200 ease-out",
            "data-closed:translate-x-full data-closed:opacity-0 data-leave:translate-x-full",
            "flex flex-col",
          )}
        >
          <div className="px-4 py-2.5">
            <div className="flex items-center justify-between">
              <DialogTitle
                id="pokemon-pc-title"
                className="text-sm font-semibold text-gray-900 dark:text-white"
              >
                Pokémon PC
              </DialogTitle>
              <button
                type="button"
                onClick={onClose}
                className={clsx(
                  "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2",
                  "rounded-md p-1 transition-colors cursor-pointer",
                )}
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-4 pt-2 pb-3">
            <PokemonPCSheetContent
              activeTab={activeTab}
              onChangeTab={onChangeTab}
              team={team}
              stored={stored}
              deceased={deceased}
              idToName={idToName}
              onClose={onClose}
              onOpenTeamMemberPicker={openPicker}
            />
          </div>
        </DialogPanel>
      </div>

      <TeamMemberPickerModal
        isOpen={pickerModalOpen}
        onClose={closePicker}
        onSelect={selectTeamMember}
        position={selectedPosition || 0}
        existingTeamMember={
          selectedPosition !== null
            ? {
                position: selectedPosition,
                isEmpty: false,
                headPokemon: team[selectedPosition]?.head || null,
                bodyPokemon: team[selectedPosition]?.body || null,
                isFusion: team[selectedPosition]?.isFusion || false,
              }
            : null
        }
      />
    </Dialog>
  );
}
