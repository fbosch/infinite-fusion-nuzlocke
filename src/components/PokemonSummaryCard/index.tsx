import clsx from "clsx";
import { MousePointer, Palette, SquareArrowUpRight } from "lucide-react";
import type React from "react";
import { useRef } from "react";
import { CursorTooltip } from "@/components/cursor-tooltip";
import { useFusionTypesFromPokemon } from "@/hooks/useFusionTypes";
import { usePreferredVariantState, useSpriteCredits } from "@/hooks/useSprite";
import { getSpriteId } from "@/lib/sprites";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { formatArtistCredits } from "@/utils/formatCredits";
import { TypePills } from "../TypePills";
import { ArtworkVariantButton } from "./ArtworkVariantButton";
import { FusionSprite, type FusionSpriteHandle } from "./fusion-sprite";
import { PokemonContextMenu } from "./pokemon-context-menu";
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

function SpriteTooltipContent({
  credit,
  primary,
  secondary,
}: {
  credit: string | undefined;
  primary: ReturnType<typeof useFusionTypesFromPokemon>["primary"];
  secondary: ReturnType<typeof useFusionTypesFromPokemon>["secondary"];
}) {
  const shortcutHint = (showMousePointer: boolean) => (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-0.5 rounded border border-gray-200 bg-gray-50 px-1 py-px text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {showMousePointer ? <MousePointer className="size-2.5" /> : null}
          <span className="font-medium text-xs">L</span>
        </div>
        <span className="text-gray-600 text-xs dark:text-gray-300">
          Pokédex
        </span>
      </div>
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-0.5 rounded border border-gray-200 bg-gray-50 px-1 py-px text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {showMousePointer ? <MousePointer className="size-2.5" /> : null}
          <span className="font-medium text-xs">R</span>
        </div>
        <span className="text-gray-600 text-xs dark:text-gray-300">
          Options
        </span>
      </div>
    </div>
  );

  if (!credit) {
    return (
      <div className="min-w-44 max-w-[22rem]">
        <div className="my-2 flex">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-gray-700 dark:text-gray-400">
            <span className="opacity-80">Pokémon sprite</span>
          </div>
        </div>
        <div className="my-1 h-px w-full bg-gray-200 dark:bg-gray-700" />
        {shortcutHint(false)}
      </div>
    );
  }

  return (
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
      {shortcutHint(true)}
    </div>
  );
}

interface SummaryCardContentProps {
  bodyPokemon: PokemonOptionType | null | undefined;
  credit: string | undefined;
  displayPokemon: ReturnType<typeof getSummaryCardDisplay>["displayPokemon"];
  eitherPokemonIsEgg: boolean;
  headPokemon: PokemonOptionType | null | undefined;
  isDeceased: boolean;
  isFusion: boolean;
  link: string;
  locationId: string;
  name: string | undefined;
  primary: ReturnType<typeof useFusionTypesFromPokemon>["primary"];
  ref: React.Ref<FusionSpriteHandle> | undefined;
  secondary: ReturnType<typeof useFusionTypesFromPokemon>["secondary"];
  shouldLoad: boolean;
  showStatusActions: boolean;
  spriteRef: React.RefObject<FusionSpriteHandle | null>;
}

function SummaryCardContent(props: SummaryCardContentProps) {
  return (
    <PokemonContextMenu
      encounterData={{
        body: props.bodyPokemon,
        head: props.headPokemon,
        isFusion: props.isFusion,
      }}
      locationId={props.locationId}
      shouldLoad={props.shouldLoad}
      showStatusActions={props.showStatusActions}
    >
      <SummaryCardSprite {...props} />
    </PokemonContextMenu>
  );
}

function SummaryCardSprite({
  bodyPokemon,
  credit,
  displayPokemon,
  eitherPokemonIsEgg,
  headPokemon,
  isDeceased,
  isFusion,
  link,
  name,
  primary,
  ref,
  secondary,
  shouldLoad,
  spriteRef,
}: SummaryCardContentProps) {
  return (
    <div className="relative flex flex-col items-center justify-center">
      <PokemonSpriteBackground isDeceased={isDeceased} />
      <PokemonSpriteLink isEgg={eitherPokemonIsEgg} link={link}>
        <SpriteDetails
          credit={credit}
          displayPokemon={displayPokemon}
          isEgg={eitherPokemonIsEgg}
          isFusion={isFusion}
          link={link}
          primary={primary}
          ref={ref || spriteRef}
          secondary={secondary}
          shouldLoad={shouldLoad}
        />
      </PokemonSpriteLink>
      {eitherPokemonIsEgg ? null : (
        <ArtworkVariantButton
          bodyId={bodyPokemon?.id}
          className="absolute right-1/2 bottom-0 z-10 -translate-x-6"
          headId={headPokemon?.id}
          isFusion={isFusion}
          key={`${headPokemon?.id}-${bodyPokemon?.id}`}
          shouldLoad={shouldLoad}
        />
      )}
      <SpriteName name={name} />
    </div>
  );
}

function PokemonSpriteBackground({ isDeceased }: { isDeceased: boolean }) {
  return (
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
  );
}

function PokemonSpriteLink({
  children,
  isEgg,
  link,
}: {
  children: React.ReactNode;
  isEgg: boolean;
  link: string;
}) {
  if (isEgg) {
    return (
      <div className="group/fusion focus:outline-none" draggable={false}>
        {children}
      </div>
    );
  }

  return (
    <a
      className="group/fusion relative focus:outline-none"
      draggable={false}
      href={link}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}

interface SpriteDetailsProps {
  credit: string | undefined;
  displayPokemon: ReturnType<typeof getSummaryCardDisplay>["displayPokemon"];
  isEgg: boolean;
  isFusion: boolean;
  link: string;
  primary: ReturnType<typeof useFusionTypesFromPokemon>["primary"];
  ref:
    | React.Ref<FusionSpriteHandle>
    | React.RefObject<FusionSpriteHandle | null>;
  secondary: ReturnType<typeof useFusionTypesFromPokemon>["secondary"];
  shouldLoad: boolean;
}

function SpriteDetails({
  credit,
  displayPokemon,
  isEgg,
  isFusion,
  link,
  primary,
  ref,
  secondary,
  shouldLoad,
}: SpriteDetailsProps) {
  return (
    <>
      <CursorTooltip
        content={
          <SpriteTooltipContent
            credit={credit}
            primary={primary}
            secondary={secondary}
          />
        }
        delay={500}
      >
        <div>
          <FusionSprite
            bodyPokemon={displayPokemon.body}
            headPokemon={displayPokemon.head}
            isFusion={isFusion}
            ref={ref}
            shouldLoad={shouldLoad}
          />
        </div>
      </CursorTooltip>
      {isEgg ? null : <PokedexLinkIndicator link={link} />}
    </>
  );
}

function PokedexLinkIndicator({ link }: { link: string }) {
  return (
    <CursorTooltip
      content={
        <div className="flex flex-col gap-1">
          <span className="text-sm">Open Pokédex entry in new tab</span>
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
  );
}

function SpriteName({ name }: { name: string | undefined }) {
  if (!name) {
    return null;
  }

  return (
    <div className="absolute bottom-0 z-5 translate-y-8.5 rounded-sm p-0.5 text-center">
      <span className="dark:pixel-shadow-black pixel-shadow-gray-300 block max-w-full truncate rounded px-1 font-ds text-gray-900 text-md tracking-[0.0025em] dark:font-normal dark:text-white">
        {name}
      </span>
    </div>
  );
}

function getSpriteCredit(
  isEgg: boolean,
  creditsBySpriteId: ReturnType<typeof useSpriteCredits>["data"],
  spriteId: string,
) {
  if (isEgg) {
    return;
  }

  const credits = creditsBySpriteId?.[spriteId];
  if (!credits || Object.keys(credits).length === 0) {
    return;
  }

  return formatArtistCredits(credits);
}

function useSummaryCardData({
  bodyPokemon,
  headPokemon,
  isFusion = false,
  isTeamMember = false,
  nickname,
  shouldLoad = true,
}: Pick<
  SummaryCardProps,
  | "bodyPokemon"
  | "headPokemon"
  | "isFusion"
  | "isTeamMember"
  | "nickname"
  | "shouldLoad"
>) {
  const { displayPokemon, eitherPokemonIsEgg, isDeceased, link, name } =
    getSummaryCardDisplay({
      bodyPokemon,
      headPokemon,
      isFusion,
      isTeamMember,
      nickname,
    });
  const headId = displayPokemon.head ? displayPokemon.head.id : null;
  const bodyId = displayPokemon.body ? displayPokemon.body.id : null;
  const shouldLoadCredits = shouldLoad && !eitherPokemonIsEgg;

  // Preload credits for the artwork variants when they exist
  useSpriteCredits(headId, bodyId, shouldLoadCredits);

  // Get sprite credits and types for tooltip (using displayPokemon values)
  const { variant: preferredVariant } = usePreferredVariantState(
    headId,
    bodyId,
  );
  const tooltipSpriteId = getSpriteId(headId, bodyId);
  const { data: tooltipCredits } = useSpriteCredits(
    headId,
    bodyId,
    shouldLoadCredits,
  );
  const { primary, secondary } = useFusionTypesFromPokemon(
    displayPokemon.head,
    displayPokemon.body,
    isFusion,
  );

  return {
    credit: getSpriteCredit(
      eitherPokemonIsEgg,
      tooltipCredits,
      tooltipSpriteId + preferredVariant,
    ),
    displayPokemon,
    eitherPokemonIsEgg,
    isDeceased,
    link,
    name,
    primary,
    secondary,
  };
}

const SummaryCard = ({
  headPokemon,
  bodyPokemon,
  isFusion = false,
  shouldLoad = true,
  nickname,
  locationId = "preview",
  showStatusActions = true,
  isTeamMember = false,
  ref,
}: SummaryCardProps) => {
  const spriteRef = useRef<FusionSpriteHandle | null>(null);
  const {
    credit,
    displayPokemon,
    eitherPokemonIsEgg,
    isDeceased,
    link,
    name,
    primary,
    secondary,
  } = useSummaryCardData({
    bodyPokemon,
    headPokemon,
    isFusion,
    isTeamMember,
    nickname,
    shouldLoad,
  });

  // If no Pokémon are provided and no encounter data exists, don't render
  if (!(headPokemon || bodyPokemon)) {
    return null;
  }

  return (
    <SummaryCardContent
      bodyPokemon={bodyPokemon}
      credit={credit}
      displayPokemon={displayPokemon}
      eitherPokemonIsEgg={eitherPokemonIsEgg}
      headPokemon={headPokemon}
      isDeceased={isDeceased}
      isFusion={isFusion}
      link={link}
      locationId={locationId}
      name={name}
      primary={primary}
      ref={ref}
      secondary={secondary}
      shouldLoad={shouldLoad}
      showStatusActions={showStatusActions}
      spriteRef={spriteRef}
    />
  );
};

SummaryCard.displayName = "SummaryCard";

export default SummaryCard;
