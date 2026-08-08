import clsx from "clsx";
import { useEffect, useState } from "react";
import BodyIcon from "@/assets/images/body.svg";
import HeadIcon from "@/assets/images/head.svg";
import { PokemonSprite } from "@/components/PokemonSprite";
import { TypePills } from "@/components/TypePills";
import {
  getPokemonById,
  type Pokemon,
  type PokemonOptionType,
} from "@/loaders/pokemon";

interface PokemonGridItemProps {
  isActiveSlot: boolean;
  isSelectedBody: boolean;
  isSelectedHead: boolean;
  locationId: string;
  onSelect: (pokemon: PokemonOptionType, locationId: string) => void;
  pokemon: PokemonOptionType;
}

export function PokemonGridItem({
  pokemon,
  locationId,
  isSelectedHead,
  isSelectedBody,
  isActiveSlot,
  onSelect,
}: PokemonGridItemProps) {
  const [pokemonData, setPokemonData] = useState<Pokemon | null>(null);
  const isSelected = isSelectedHead || isSelectedBody;

  // Fetch full Pokemon data to get types
  useEffect(() => {
    let cancelled = false;

    getPokemonById(pokemon.id)
      .then((data) => {
        if (!cancelled) {
          setPokemonData(data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Failed to fetch Pokemon data:", error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pokemon.id]);

  const getButtonStyles = () => {
    if (isSelectedHead) {
      return "border-blue-500 bg-blue-50 dark:bg-blue-900/20 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30";
    }
    if (isSelectedBody) {
      return "border-green-500 bg-green-50 dark:bg-green-900/20 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30";
    }
    if (isActiveSlot) {
      return "border-gray-200 bg-white dark:bg-gray-700 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer";
    }
    return "border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-not-allowed opacity-60";
  };

  const getStatusBadge = () => {
    if (isSelectedHead) {
      return (
        <div className="flex items-center space-x-1 rounded-full bg-blue-600 px-2 py-1 font-medium text-white text-xs">
          <HeadIcon className="h-3 w-3" />
        </div>
      );
    }
    if (isSelectedBody) {
      return (
        <div className="flex items-center space-x-1 rounded-full bg-green-600 px-2 py-1 font-medium text-white text-xs">
          <BodyIcon className="h-3 w-3" />
        </div>
      );
    }
    return null;
  };

  return (
    <button
      className={clsx(
        "relative flex h-20 flex-col items-center justify-center rounded-lg border p-2 transition-colors",
        getButtonStyles(),
      )}
      disabled={!(isActiveSlot || isSelected)}
      onClick={() => onSelect(pokemon, locationId)}
      type="button"
    >
      <div className="mb-1 flex h-12 w-12 items-center justify-center">
        <PokemonSprite
          className="h-12 w-12"
          generation="gen7"
          pokemonId={pokemon.id}
        />
      </div>

      <div className="min-w-0 text-center">
        <div className="truncate font-medium text-gray-900 text-xs dark:text-white">
          {pokemon.nickname || pokemon.name}
        </div>
        {pokemon.nickname && (
          <div className="truncate text-gray-500 text-xs dark:text-gray-400">
            ({pokemon.name})
          </div>
        )}
      </div>

      {/* Type indicators in top left corner */}
      {pokemonData && (
        <div className="absolute top-1 left-1">
          <TypePills
            primary={
              pokemonData.types[0]?.name?.toLowerCase() as
                | "grass"
                | "poison"
                | "fire"
                | "flying"
                | "water"
                | "bug"
                | "normal"
                | "electric"
                | "ground"
                | "fairy"
                | "fighting"
                | "psychic"
                | "rock"
                | "steel"
                | "ice"
                | "ghost"
                | "dragon"
                | "dark"
            }
            secondary={
              pokemonData.types[1]?.name?.toLowerCase() as
                | "grass"
                | "poison"
                | "fire"
                | "flying"
                | "water"
                | "bug"
                | "normal"
                | "electric"
                | "ground"
                | "fairy"
                | "fighting"
                | "psychic"
                | "rock"
                | "steel"
                | "ice"
                | "ghost"
                | "dragon"
                | "dark"
            }
            showTooltip={false}
            size="xxs"
          />
        </div>
      )}

      {/* Status badge in top right corner */}
      <div className="absolute top-1 right-1">{getStatusBadge()}</div>
    </button>
  );
}
