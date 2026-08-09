import { useCallback } from "react";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { playthroughActions } from "@/stores/playthroughs/index";
import type { EncounterSource } from "@/types/encounters";
import {
  getClearConfirmationMessage,
  getOverwriteConfirmationMessage,
} from "./encounter-confirmation-messages";
import { useConfirmationActions } from "./use-confirmation-actions";
import {
  type EncounterField,
  useConfirmationDialogState,
} from "./use-confirmation-dialog-state";

const hasValuableData = (
  pokemon: PokemonOptionType | null,
): pokemon is PokemonOptionType =>
  pokemon !== null && Boolean(pokemon.nickname || pokemon.status);

interface UseEncounterConfirmationProps {
  bodyPokemon: PokemonOptionType | null;
  getPokemonSource: (pokemonId: number) => EncounterSource | null;
  headPokemon: PokemonOptionType | null;
  locationId: string;
}

export function useEncounterConfirmation({
  bodyPokemon,
  getPokemonSource,
  headPokemon,
  locationId,
}: UseEncounterConfirmationProps) {
  const {
    closeClearConfirmation,
    closeOverwriteConfirmation,
    confirmationState,
    confirmClear,
    confirmOverwrite,
    requestClearConfirmation: requestClearDialogConfirmation,
    requestOverwriteConfirmation: requestOverwriteDialogConfirmation,
    showClearConfirmation,
    showOverwriteConfirmation,
  } = useConfirmationDialogState();

  const requestClearConfirmation = useCallback(
    (field: EncounterField, currentValue: PokemonOptionType) =>
      hasValuableData(currentValue)
        ? requestClearDialogConfirmation({ field, pokemon: currentValue })
        : Promise.resolve(true),
    [requestClearDialogConfirmation],
  );

  const requestOverwriteConfirmation = useCallback(
    (
      field: EncounterField,
      currentValue: PokemonOptionType,
      newValue: PokemonOptionType,
    ) =>
      hasValuableData(currentValue)
        ? requestOverwriteDialogConfirmation({
            currentPokemon: currentValue,
            field,
            kind: "pokemon",
            newPokemon: newValue,
          })
        : Promise.resolve(true),
    [requestOverwriteDialogConfirmation],
  );

  const handleEncounterSelect = useCallback(
    (pokemon: PokemonOptionType | null, field: EncounterField = "head") => {
      const currentPokemon = field === "head" ? headPokemon : bodyPokemon;
      if (pokemon === null && hasValuableData(currentPokemon)) {
        showClearConfirmation({ field, pokemon: currentPokemon });
        return;
      }
      playthroughActions.updateEncounter(locationId, pokemon, field, false);
    },
    [bodyPokemon, headPokemon, locationId, showClearConfirmation],
  );

  const handleSingleFusionChange = useCallback(
    (head: PokemonOptionType, body: PokemonOptionType) => {
      const existingPokemon = [headPokemon, bodyPokemon].filter(
        (pokemon): pokemon is PokemonOptionType => pokemon !== null,
      );
      if (existingPokemon.some(hasValuableData)) {
        showOverwriteConfirmation({
          body,
          currentPokemon: existingPokemon,
          head,
          kind: "fusion",
        });
        return;
      }
      playthroughActions.createFusion(locationId, head, body);
    },
    [bodyPokemon, headPokemon, locationId, showOverwriteConfirmation],
  );

  const { handleConfirmClear, handleConfirmOverwrite } = useConfirmationActions(
    {
      confirmationState,
      confirmClear,
      confirmOverwrite,
      getPokemonSource,
      locationId,
    },
  );

  const handleHeadChange = useCallback(
    (pokemon: PokemonOptionType | null) =>
      handleEncounterSelect(pokemon, "head"),
    [handleEncounterSelect],
  );
  const handleBodyChange = useCallback(
    (pokemon: PokemonOptionType | null) =>
      handleEncounterSelect(pokemon, "body"),
    [handleEncounterSelect],
  );
  const handleSingleChange = useCallback(
    (pokemon: PokemonOptionType | null) => handleEncounterSelect(pokemon),
    [handleEncounterSelect],
  );
  const requestHeadClearConfirmation = useCallback(
    (pokemon: PokemonOptionType) => requestClearConfirmation("head", pokemon),
    [requestClearConfirmation],
  );
  const requestBodyClearConfirmation = useCallback(
    (pokemon: PokemonOptionType) => requestClearConfirmation("body", pokemon),
    [requestClearConfirmation],
  );
  const requestHeadOverwriteConfirmation = useCallback(
    (currentPokemon: PokemonOptionType, nextPokemon: PokemonOptionType) =>
      requestOverwriteConfirmation("head", currentPokemon, nextPokemon),
    [requestOverwriteConfirmation],
  );
  const requestBodyOverwriteConfirmation = useCallback(
    (currentPokemon: PokemonOptionType, nextPokemon: PokemonOptionType) =>
      requestOverwriteConfirmation("body", currentPokemon, nextPokemon),
    [requestOverwriteConfirmation],
  );

  return {
    clearConfirmationMessage: confirmationState.pendingClear
      ? getClearConfirmationMessage(confirmationState.pendingClear.pokemon)
      : "",
    closeClearConfirmation,
    closeOverwriteConfirmation,
    confirmationState,
    handleBodyChange,
    handleConfirmClear,
    handleConfirmOverwrite,
    handleHeadChange,
    handleSingleChange,
    handleSingleFusionChange,
    overwriteConfirmationMessage: getOverwriteConfirmationMessage(
      confirmationState.pendingOverwrite,
    ),
    requestBodyClearConfirmation,
    requestBodyOverwriteConfirmation,
    requestHeadClearConfirmation,
    requestHeadOverwriteConfirmation,
  };
}
