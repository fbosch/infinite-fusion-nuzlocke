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
  activeTab: "team" | "box" | "graveyard";
  isOpen: boolean;
  onChangeTab: (tab: "team" | "box" | "graveyard") => void;
  onClose: () => void;
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
    <Dialog className="group relative z-[70]" onClose={onClose} open={isOpen}>
      <DialogBackdrop
        aria-hidden="true"
        className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 ease-out data-closed:opacity-0 data-enter:opacity-100 dark:bg-black/30"
        transition
      />

      <div className="fixed inset-y-0 right-0 z-[71] flex w-screen items-stretch justify-end p-0">
        <DialogPanel
          aria-labelledby="pokemon-pc-title"
          className={clsx(
            "h-full w-full max-w-lg border-gray-200 border-l bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800",
            "transform-gpu will-change-transform",
            "transition-all duration-200 ease-out",
            "data-closed:translate-x-full data-leave:translate-x-full data-closed:opacity-0",
            "flex flex-col",
          )}
          id="pokemon-pc-sheet"
          transition
        >
          <div className="px-4 py-2.5">
            <div className="flex items-center justify-between">
              <DialogTitle
                className="font-semibold text-gray-900 text-sm dark:text-white"
                id="pokemon-pc-title"
              >
                Pokémon PC
              </DialogTitle>
              <button
                aria-label="Close drawer"
                className={clsx(
                  "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2",
                  "cursor-pointer rounded-md p-1 transition-colors",
                )}
                onClick={onClose}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-4 pt-2 pb-3">
            <PokemonPCSheetContent
              activeTab={activeTab}
              deceased={deceased}
              idToName={idToName}
              onChangeTab={onChangeTab}
              onClose={onClose}
              onOpenTeamMemberPicker={openPicker}
              stored={stored}
              team={team}
            />
          </div>
        </DialogPanel>
      </div>

      <TeamMemberPickerModal
        existingTeamMember={
          selectedPosition === null
            ? null
            : {
                bodyPokemon: team[selectedPosition]?.body || null,
                headPokemon: team[selectedPosition]?.head || null,
                isEmpty: false,
                isFusion: team[selectedPosition]?.isFusion,
                position: selectedPosition,
              }
        }
        isOpen={pickerModalOpen}
        onClose={closePicker}
        onSelect={selectTeamMember}
        position={selectedPosition || 0}
      />
    </Dialog>
  );
}
