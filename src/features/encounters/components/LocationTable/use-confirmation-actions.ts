import { useCallback } from "react";
import { playthroughActions } from "@/features/playthroughs";
import type { PokemonOptionType, PokemonStatusType } from "@/features/pokemon";
import { PokemonStatus } from "@/features/pokemon";
import { EncounterSource } from "../../model/encounters";
import type { ConfirmationState } from "./use-confirmation-dialog-state";

const applySourceDefaultStatus = (
  pokemon: PokemonOptionType,
  source: EncounterSource | null,
) => {
  let status: PokemonStatusType | undefined;
  if (source === EncounterSource.GIFT) {
    status = PokemonStatus.RECEIVED;
  } else if (source === EncounterSource.TRADE) {
    status = PokemonStatus.TRADED;
  }

  return !status || status === pokemon.status
    ? pokemon
    : { ...pokemon, status };
};

interface UseConfirmationActionsProps {
  confirmationState: ConfirmationState;
  confirmClear: () => void;
  confirmOverwrite: () => void;
  getPokemonSource: (pokemonId: number) => EncounterSource | null;
  locationId: string;
}

export function useConfirmationActions({
  confirmClear,
  confirmOverwrite,
  confirmationState,
  getPokemonSource,
  locationId,
}: UseConfirmationActionsProps) {
  const handleConfirmClear = useCallback(() => {
    const { pendingClear } = confirmationState;
    if (pendingClear) {
      playthroughActions.updateEncounter(
        locationId,
        null,
        pendingClear.field,
        false,
      );
    }
    confirmClear();
  }, [confirmationState, confirmClear, locationId]);
  const handleConfirmOverwrite = useCallback(() => {
    const { pendingOverwrite } = confirmationState;
    if (!pendingOverwrite) {
      confirmOverwrite();
      return;
    }
    if (pendingOverwrite.kind === "fusion") {
      playthroughActions.createFusion(
        locationId,
        pendingOverwrite.head,
        pendingOverwrite.body,
      );
    } else {
      const pokemon = applySourceDefaultStatus(
        pendingOverwrite.newPokemon,
        getPokemonSource(pendingOverwrite.newPokemon.id),
      );
      playthroughActions.updateEncounter(
        locationId,
        pokemon,
        pendingOverwrite.field,
        false,
      );
    }
    confirmOverwrite();
  }, [confirmationState, confirmOverwrite, getPokemonSource, locationId]);

  return { handleConfirmClear, handleConfirmOverwrite };
}
