import { useCallback } from "react";
import type { RouteEncounterPokemon } from "@/loaders/encounters";
import {
  isEgg,
  isPokemonEvolution,
  isPokemonPreEvolution,
  type PokemonOptionType,
} from "@/loaders/pokemon";
import {
  applyEncounterDefaultStatus,
  getPokemonSources,
} from "./encounter-selection";
import { isFusionCombinationOption } from "./pokemon-options";

interface UseComboboxSelectionProps {
  onBeforeOverwrite?: (
    currentValue: PokemonOptionType,
    newValue: PokemonOptionType,
  ) => Promise<boolean> | boolean;
  onChange: (value: PokemonOptionType | null) => void;
  onFusionChange?: (head: PokemonOptionType, body: PokemonOptionType) => void;
  routeEncounterData: RouteEncounterPokemon[];
  setQuery: (query: string) => void;
  value: PokemonOptionType | null | undefined;
}

const preservesEggHatchingData = (
  previousPokemon: PokemonOptionType,
  nextPokemon: PokemonOptionType,
) => {
  if (!isEgg(previousPokemon) || isEgg(nextPokemon)) {
    return nextPokemon;
  }

  return {
    ...nextPokemon,
    nickname: previousPokemon.nickname || nextPokemon.nickname,
    status: previousPokemon.status || nextPokemon.status,
  };
};

export function useComboboxSelection({
  onBeforeOverwrite,
  onChange,
  onFusionChange,
  routeEncounterData,
  setQuery,
  value,
}: UseComboboxSelectionProps) {
  const applyDefaultStatus = useCallback(
    (pokemon: PokemonOptionType) =>
      applyEncounterDefaultStatus(
        pokemon,
        getPokemonSources(routeEncounterData, pokemon.id),
      ),
    [routeEncounterData],
  );

  const isNaturalProgression = useCallback(
    async (
      currentPokemon: PokemonOptionType,
      nextPokemon: PokemonOptionType,
    ) => {
      try {
        const [isEvolution, isPreEvolution] = await Promise.all([
          isPokemonEvolution(currentPokemon, nextPokemon),
          isPokemonPreEvolution(currentPokemon, nextPokemon),
        ]);

        return (
          isEvolution ||
          isPreEvolution ||
          (isEgg(currentPokemon) && !isEgg(nextPokemon))
        );
      } catch (error) {
        console.error("Error checking evolution relationship:", error);
        return false;
      }
    },
    [],
  );

  const selectPokemon = useCallback(
    async (nextValue: PokemonOptionType) => {
      if (!(value && onBeforeOverwrite)) {
        onChange(applyDefaultStatus(nextValue));
        setQuery("");
        return;
      }

      const canOverwrite = await isNaturalProgression(value, nextValue);
      if (canOverwrite === false) {
        const confirmed = await onBeforeOverwrite(value, nextValue);
        if (confirmed === false) {
          return;
        }
      }

      onChange(applyDefaultStatus(preservesEggHatchingData(value, nextValue)));
      setQuery("");
    },
    [
      applyDefaultStatus,
      isNaturalProgression,
      onBeforeOverwrite,
      onChange,
      setQuery,
      value,
    ],
  );

  return useCallback(
    async (nextValue: PokemonOptionType | null | undefined) => {
      if (!nextValue) {
        onChange(null);
        setQuery("");
        return;
      }

      if (isFusionCombinationOption(nextValue)) {
        const { fusionBody, ...head } = nextValue;
        onFusionChange?.(
          applyDefaultStatus(head),
          applyDefaultStatus(fusionBody),
        );
        setQuery("");
        return;
      }

      await selectPokemon(nextValue);
    },
    [applyDefaultStatus, onChange, onFusionChange, selectPokemon, setQuery],
  );
}
