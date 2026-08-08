import { MousePointer, Palette } from "lucide-react";
import { TypePills } from "@/components/TypePills";
import { useFusionTypesFromPokemon } from "@/hooks/useFusionTypes";
import { useSpriteCredits } from "@/hooks/useSprite";
import { getSpriteId } from "@/lib/sprites";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { formatArtistCredits } from "@/utils/formatCredits";

interface TeamMemberTooltipContentProps {
  bodyPokemon: PokemonOptionType | null;
  headPokemon: PokemonOptionType | null;
  isFusion: boolean;
}

export function TeamMemberTooltipContent({
  headPokemon,
  bodyPokemon,
  isFusion,
}: TeamMemberTooltipContentProps) {
  const { primary, secondary } = useFusionTypesFromPokemon(
    headPokemon,
    bodyPokemon,
    isFusion,
  );
  const spriteId = getSpriteId(headPokemon?.id, bodyPokemon?.id);
  const { data: creditsBySpriteId } = useSpriteCredits(
    headPokemon?.id,
    bodyPokemon?.id,
    true,
  );
  const credits = spriteId == null ? undefined : creditsBySpriteId?.[spriteId];
  const credit =
    credits && Object.keys(credits).length > 0
      ? formatArtistCredits(credits)
      : undefined;

  return (
    <div className="min-w-44 max-w-[22rem]" role="tooltip">
      <div className="flex py-0.5">
        <TypePills primary={primary} secondary={secondary} />
      </div>
      {credit && (
        <>
          <div className="my-2 flex">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-gray-700 dark:text-gray-400">
              <Palette
                aria-hidden="true"
                className="h-3 w-3"
                focusable={false}
              />
              <span className="opacity-80">by</span>
              <span className="max-w-[14rem] truncate" title={credit}>
                {credit}
              </span>
            </div>
          </div>
          <div className="my-1 h-px w-full bg-gray-200 dark:bg-gray-700" />
        </>
      )}
      <div className="flex items-center gap-2 text-xs">
        {[
          ["L", "Change"],
          ["R", "Options"],
        ].map(([button, label]) => (
          <div className="flex items-center gap-1" key={button}>
            <div className="flex items-center gap-0.5 rounded border border-gray-200 bg-gray-50 px-1 py-px text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              <MousePointer
                aria-hidden="true"
                className="h-3 w-3"
                focusable={false}
              />
              <span className="font-medium text-xs">{button}</span>
            </div>
            <span className="text-gray-600 text-xs dark:text-gray-300">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
