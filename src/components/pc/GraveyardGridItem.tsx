import clsx from "clsx";
import { PokemonSprite } from "@/components/PokemonSprite";
import type { PokemonOptionType } from "@/loaders/pokemon";

interface GraveyardGridItemProps {
  entry: {
    locationId: string;
    locationName: string;
    head: PokemonOptionType | null;
    body: PokemonOptionType | null;
  };
  onLocationClick: (locationId: string) => void;
}

export function GraveyardGridItem({
  entry,
  onLocationClick,
}: GraveyardGridItemProps) {
  // Since we now create separate entries for each Pokémon, only one will be present
  const pokemon = entry.head || entry.body;

  const handleClick = () => {
    // Extract the original location ID by removing the -head or -body suffix
    const originalLocationId = entry.locationId.replace(/-head$|-body$/, "");
    onLocationClick(originalLocationId);
  };

  if (!pokemon) {
    return null;
  }

  return (
    <button
      aria-label={`View graveyard entry for ${pokemon.nickname || pokemon.name} from ${entry.locationName}`}
      className={clsx(
        "flex h-20 flex-col items-center justify-center rounded-lg border p-2 transition-colors",
        "cursor-pointer border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700",
        "hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600",
      )}
      onClick={handleClick}
      type="button"
    >
      {/* Pokémon sprite */}
      <div className="mb-1 flex h-10 w-10 items-center justify-center">
        <PokemonSprite
          className="h-10 w-10 opacity-80"
          generation="gen7"
          pokemonId={pokemon.id}
        />
      </div>

      {/* Nickname and location info */}
      <div className="min-w-0 text-center">
        <div className="truncate font-medium text-gray-900 text-xs dark:text-white">
          {pokemon.nickname || pokemon.name || "Unknown"}
        </div>
        <div className="truncate text-gray-500 text-xs dark:text-gray-400">
          {entry.locationName}
        </div>
      </div>
    </button>
  );
}
