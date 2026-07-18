import { useCallback, useState } from "react";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { playthroughActions } from "@/stores/playthroughs";

export function useTeamMemberPicker() {
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  const closePicker = useCallback(() => {
    setPickerModalOpen(false);
    setSelectedPosition(null);
  }, []);

  const openPicker = useCallback((position: number) => {
    setSelectedPosition(position);
    setPickerModalOpen(true);
  }, []);

  const selectTeamMember = useCallback(
    async (
      headPokemon: PokemonOptionType | null,
      bodyPokemon: PokemonOptionType | null,
    ) => {
      if (selectedPosition === null) return;

      const success = await playthroughActions.updateTeamMember(
        selectedPosition,
        headPokemon ? { uid: headPokemon.uid! } : null,
        bodyPokemon ? { uid: bodyPokemon.uid! } : null,
      );

      if (success) {
        closePicker();
        return;
      }

      console.error(
        "Failed to update team member at position:",
        selectedPosition,
      );
    },
    [closePicker, selectedPosition],
  );

  return {
    pickerModalOpen,
    selectedPosition,
    openPicker,
    closePicker,
    selectTeamMember,
  };
}
