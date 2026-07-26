import { useState } from "react";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { playthroughActions } from "@/stores/playthroughs";

export function useTeamMemberPicker() {
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  const closePicker = () => {
    setPickerModalOpen(false);
    setSelectedPosition(null);
  };

  const openPicker = (position: number) => {
    setSelectedPosition(position);
    setPickerModalOpen(true);
  };

  const selectTeamMember = async (
    headPokemon: PokemonOptionType | null,
    bodyPokemon: PokemonOptionType | null,
  ) => {
    if (selectedPosition === null) return false;

    const success = await playthroughActions.updateTeamMember(
      selectedPosition,
      headPokemon ? { uid: headPokemon.uid! } : null,
      bodyPokemon ? { uid: bodyPokemon.uid! } : null,
    );

    if (!success) {
      console.error(
        "Failed to update team member at position:",
        selectedPosition,
      );
    } else {
      closePicker();
    }

    return success;
  };

  return {
    pickerModalOpen,
    selectedPosition,
    openPicker,
    closePicker,
    selectTeamMember,
  };
}
