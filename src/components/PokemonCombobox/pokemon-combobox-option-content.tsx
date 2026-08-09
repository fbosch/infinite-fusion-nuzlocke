import type { VirtualItem } from "@tanstack/react-virtual";
import { Loader2 } from "lucide-react";
import type { CSSProperties } from "react";
import type { PokemonOptionType } from "@/loaders/pokemon";
import type { EncounterSource } from "@/types/encounters";
import {
  FusionCombinationOption,
  type FusionCombinationOption as FusionCombinationOptionType,
  PokemonOption,
  PokemonOptions,
} from "./pokemon-options";

interface PokemonComboboxOptionContentProps {
  comboboxId?: string;
  deferredQuery: string;
  finalOptions: PokemonOptionType[];
  fusionCombinationOption: FusionCombinationOptionType | null;
  gameMode: "classic" | "remix" | "randomized";
  getPokemonSource: (pokemonId: number) => EncounterSource[];
  isDuplicatePokemon: (pokemonId: number) => boolean;
  isRoutePokemon: (pokemonId: number) => boolean;
  isShowingLoading: boolean;
  locationId?: string;
  shouldVirtualize: boolean;
  virtualization: {
    isScrolling: boolean;
    items: VirtualItem[];
  };
}

const getVirtualOptionStyle = (
  item: VirtualItem,
  isScrolling: boolean,
): CSSProperties => ({
  height: `${item.size}px`,
  left: "0.25rem",
  pointerEvents: isScrolling ? "none" : "auto",
  position: "absolute",
  top: "0",
  transform: `translateY(${item.start}px)`,
  width: "calc(100% - 8px)",
});

export function PokemonComboboxOptionContent({
  comboboxId,
  deferredQuery,
  finalOptions,
  fusionCombinationOption,
  gameMode,
  getPokemonSource,
  isDuplicatePokemon,
  isRoutePokemon,
  isShowingLoading,
  locationId,
  shouldVirtualize,
  virtualization,
}: PokemonComboboxOptionContentProps) {
  if (fusionCombinationOption) {
    return <FusionCombinationOption pokemon={fusionCombinationOption} />;
  }

  if (isShowingLoading) {
    return (
      <div className="relative cursor-default select-none px-4 py-2 text-center">
        <div className="text-gray-500 dark:text-gray-400">
          <p className="flex items-center justify-center gap-2 py-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading Pokémon...</span>
          </p>
        </div>
      </div>
    );
  }

  if (shouldVirtualize) {
    return virtualization.items.map((item) => (
      <PokemonOption
        comboboxId={comboboxId || ""}
        disabled={virtualization.isScrolling}
        gameMode={gameMode}
        getPokemonSource={getPokemonSource}
        index={item.index}
        isDuplicatePokemon={isDuplicatePokemon}
        isRoutePokemon={isRoutePokemon}
        key={item.key}
        locationId={locationId}
        pokemon={finalOptions[item.index]}
        style={getVirtualOptionStyle(item, virtualization.isScrolling)}
      />
    ));
  }

  return (
    <PokemonOptions
      comboboxId={comboboxId || ""}
      deferredQuery={deferredQuery}
      finalOptions={finalOptions}
      gameMode={gameMode}
      getPokemonSource={getPokemonSource}
      isDuplicatePokemon={isDuplicatePokemon}
      isLoading={isShowingLoading}
      isRoutePokemon={isRoutePokemon}
      locationId={locationId}
    />
  );
}
