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
    if (selectedPosition === null) {
      return false;
    }

    const headUid = headPokemon?.uid;
    const bodyUid = bodyPokemon?.uid;
    const selectedPokemon = [headPokemon, bodyPokemon];
    if (selectedPokemon.some((pokemon) => pokemon && !pokemon.uid)) {
      return false;
    }

    const success = await playthroughActions.updateTeamMember(
      selectedPosition,
      headUid ? { uid: headUid } : null,
      bodyUid ? { uid: bodyUid } : null,
    );

    if (success) {
      closePicker();
    } else {
      console.error(
        "Failed to update team member at position:",
        selectedPosition,
      );
    }

    return success;
  };

  return {
    closePicker,
    openPicker,
    pickerModalOpen,
    selectedPosition,
    selectTeamMember,
  };
}
