import clsx from "clsx";
import { MousePointer, Palette, SquareArrowUpRight } from "lucide-react";
import React, { useRef } from "react";
import { CursorTooltip } from "@/components/CursorTooltip";
import { useFusionTypesFromPokemon } from "@/hooks/useFusionTypes";
import { usePreferredVariantState, useSpriteCredits } from "@/hooks/useSprite";
import { getSpriteId } from "@/lib/sprites";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { formatArtistCredits } from "@/utils/formatCredits";
import { TypePills } from "../TypePills";
import { ArtworkVariantButton } from "./ArtworkVariantButton";
import { FusionSprite, type FusionSpriteHandle } from "./FusionSprite";
import { PokemonContextMenu } from "./PokemonContextMenu";
import { getSummaryCardDisplay } from "./summaryCardModel";

interface SummaryCardProps {
  bodyPokemon?: PokemonOptionType | null;
  headPokemon?: PokemonOptionType | null;
  isFusion?: boolean;
  isTeamMember?: boolean; // Whether this is for team member selection (bypasses encounter logic)
  locationId?: string;
  nickname?: string; // Optional nickname to override the Pokémon's existing nickname
  ref?: React.Ref<FusionSpriteHandle>;
  shouldLoad?: boolean;
  showStatusActions?: boolean; // Whether to show status-changing actions in context menu
}

const SummaryCard = React.forwardRef<FusionSpriteHandle, SummaryCardProps>(
  (
    {
      headPokemon,
      bodyPokemon,
      isFusion = false,
      shouldLoad = true,
      nickname,
      locationId = "preview",
      showStatusActions = true,
      isTeamMember = false,
    },
    ref,
  ) => {
    const spriteRef = useRef<FusionSpriteHandle | null>(null);

    const effectiveHeadPokemon = headPokemon;
    const effectiveBodyPokemon = bodyPokemon;
    const effectiveIsFusion = isFusion;
    const { displayPokemon, eitherPokemonIsEgg, isDeceased, link, name } =
      getSummaryCardDisplay({
        bodyPokemon: effectiveBodyPokemon,
        headPokemon: effectiveHeadPokemon,
        isFusion: effectiveIsFusion,
        isTeamMember,
        nickname,
      });

    // Preload credits for the artwork variants when they exist
    useSpriteCredits(
      displayPokemon.head?.id,
      displayPokemon.body?.id,
      shouldLoad && !eitherPokemonIsEgg,
    );

    // Get sprite credits and types for tooltip (using displayPokemon values)
    const { variant: preferredVariant } = usePreferredVariantState(
      displayPokemon.head?.id ?? null,
      displayPokemon.body?.id ?? null,
    );
    const tooltipSpriteId = getSpriteId(
      displayPokemon.head?.id,
      displayPokemon.body?.id,
    );
    const variantSpriteId =
      tooltipSpriteId == null
        ? undefined
        : tooltipSpriteId + (preferredVariant ?? "");
    const { data: tooltipCredits } = useSpriteCredits(
      displayPokemon.head?.id,
      displayPokemon.body?.id,
      shouldLoad && !eitherPokemonIsEgg,
    );
    const { primary, secondary } = useFusionTypesFromPokemon(
      displayPokemon.head,
      displayPokemon.body,
      effectiveIsFusion,
    );
    const credit =
      eitherPokemonIsEgg || variantSpriteId == null
        ? undefined
        : (() => {
            const credits = tooltipCredits?.[variantSpriteId];
            return credits && Object.keys(credits).length > 0
              ? formatArtistCredits(credits)
              : undefined;
          })();

    // If no Pokémon are provided and no encounter data exists, don't render
    if (!(effectiveHeadPokemon || effectiveBodyPokemon)) {
      return null;
    }

    const head = displayPokemon.head;
    const body = displayPokemon.body;

    const SpriteWrapper = eitherPokemonIsEgg ? "div" : "a";
    const spriteWrapperProps = eitherPokemonIsEgg
      ? {
          className: "group/fusion focus:outline-none",
          draggable: false,
        }
      : {
          className: "group/fusion focus:outline-none relative",
          draggable: false,
          href: link,
          rel: "noopener noreferrer",
          target: "_blank",
        };

    return (
      <PokemonContextMenu
        encounterData={{
          body: effectiveBodyPokemon,
          head: effectiveHeadPokemon,
          isFusion: effectiveIsFusion,
        }}
        locationId={locationId}
        shouldLoad={shouldLoad}
        showStatusActions={showStatusActions}
      >
        <div className="relative flex flex-col items-center justify-center">
          <div
            className={clsx(
              "absolute size-22 -translate-y-2 rounded-lg border border-gray-200 opacity-30 dark:border-gray-400",
              {
                "text-rose-200 opacity-90 dark:border-red-800 dark:text-red-700 dark:mix-blend-color-dodge":
                  isDeceased,
                "text-white dark:mix-blend-soft-light": !isDeceased,
              },
            )}
            style={{
              background:
                "repeating-linear-gradient(currentColor 0px, currentColor 2px, rgba(154, 163, 175, 0.3) 1px, rgba(156, 163, 175, 0.3) 3px)",
            }}
          />
          <SpriteWrapper {...spriteWrapperProps}>
            <CursorTooltip
              content={
                credit ? (
                  <div className="min-w-44 max-w-[22rem]">
                    <div className="flex py-0.5">
                      <TypePills primary={primary} secondary={secondary} />
                    </div>
                    <div className="my-2 flex">
                      <div className="inline-flex items-center gap-1.5 text-[11px] text-gray-700 dark:text-gray-400">
                        <Palette className="size-3" />
                        <span className="opacity-80">by</span>
                        <span className="max-w-[14rem] truncate" title={credit}>
                          {credit}
                        </span>
                      </div>
                    </div>
                    <div className="my-1 h-px w-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5 rounded border border-gray-200 bg-gray-50 px-1 py-px text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                          <MousePointer className="size-2.5" />
                          <span className="font-medium text-xs">L</span>
                        </div>
                        <span className="text-gray-600 text-xs dark:text-gray-300">
                          Pokédex
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5 rounded border border-gray-200 bg-gray-50 px-1 py-px text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                          <MousePointer className="size-2.5" />
                          <span className="font-medium text-xs">R</span>
                        </div>
                        <span className="text-gray-600 text-xs dark:text-gray-300">
                          Options
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="min-w-44 max-w-[22rem]">
                    <div className="my-2 flex">
                      <div className="inline-flex items-center gap-1.5 text-[11px] text-gray-700 dark:text-gray-400">
                        <span className="opacity-80">Pokémon sprite</span>
                      </div>
                    </div>
                    <div className="my-1 h-px w-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5 rounded border border-gray-200 bg-gray-50 px-1 py-px text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                          <span className="font-medium text-xs">L</span>
                        </div>
                        <span className="text-gray-600 text-xs dark:text-gray-300">
                          Pokédex
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5 rounded border border-gray-200 bg-gray-50 px-1 py-px text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                          <span className="font-medium text-xs">R</span>
                        </div>
                        <span className="text-gray-600 text-xs dark:text-gray-300">
                          Options
                        </span>
                      </div>
                    </div>
                  </div>
                )
              }
              delay={500}
            >
              <div>
                <FusionSprite
                  bodyPokemon={body}
                  headPokemon={head}
                  isFusion={effectiveIsFusion}
                  ref={ref || spriteRef}
                  shouldLoad={shouldLoad}
                />
              </div>
            </CursorTooltip>

            {!eitherPokemonIsEgg && (
              <CursorTooltip
                content={
                  <div className="flex flex-col gap-1">
                    <span className="text-sm">
                      Open Pokédex entry in new tab
                    </span>
                    <span className="text-gray-400 text-xs">{link}</span>
                  </div>
                }
                delay={1000}
              >
                <div
                  className={clsx(
                    "absolute -top-4 -right-2 z-10 rounded-sm bg-gray-200 text-blue-400 opacity-0 dark:bg-gray-800 dark:text-blue-300",
                    "transition-opacity duration-200 group-hover/fusion:opacity-100 group-focus-visible/fusion:opacity-100",
                    "group-focus-visible/fusion:ring-1 group-focus-visible/fusion:ring-blue-400",
                  )}
                >
                  <SquareArrowUpRight className="size-4" />
                </div>
              </CursorTooltip>
            )}
          </SpriteWrapper>
          {eitherPokemonIsEgg ? null : (
            <ArtworkVariantButton
              bodyId={effectiveBodyPokemon?.id}
              className="absolute right-1/2 bottom-0 z-10 -translate-x-6"
              headId={effectiveHeadPokemon?.id}
              isFusion={effectiveIsFusion}
              key={`${effectiveHeadPokemon?.id}-${effectiveBodyPokemon?.id}`}
              shouldLoad={shouldLoad}
            />
          )}
          {name && (
            <div className="absolute bottom-0 z-5 translate-y-8.5 rounded-sm p-0.5 text-center">
              <span className="dark:pixel-shadow-black pixel-shadow-gray-300 block max-w-full truncate rounded px-1 font-ds text-gray-900 text-md tracking-[0.0025em] dark:font-normal dark:text-white">
                {name}
              </span>
            </div>
          )}
        </div>
      </PokemonContextMenu>
    );
  },
);

SummaryCard.displayName = "SummaryCard";

export default SummaryCard;
