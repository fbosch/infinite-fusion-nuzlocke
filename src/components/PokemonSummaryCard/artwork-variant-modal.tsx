"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Field,
  Radio,
  RadioGroup,
} from "@headlessui/react";
import clsx from "clsx";
import { ArrowUpRight, Check, X } from "lucide-react";
import Image from "next/image";
import {
  createContext,
  type MouseEvent,
  useCallback,
  useContext,
  useState,
} from "react";
import {
  usePreferredVariantState,
  useSpriteCredits,
  useSpriteVariants,
} from "@/hooks/useSprite";
import {
  generateSpriteUrl,
  getFormattedCreditsFromResponse,
} from "@/lib/sprites";
import type { PokemonOptionType } from "@/loaders/pokemon";
import ContextMenu from "../context-menu";
import { getDisplayPokemon } from "./utils";

interface ArtworkVariantModalProps {
  bodyId?: number | null;
  headId?: number | null;
  isFusion?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

interface ArtworkVariantOptionContextValue {
  credits: Parameters<typeof getFormattedCreditsFromResponse>[0];
  effectiveBodyId: number | null;
  effectiveHeadId: number | null;
  spriteId: string | number | null;
  spriteUrl: string;
  variant: string;
}

const ArtworkVariantOptionContext =
  createContext<ArtworkVariantOptionContextValue | null>(null);

function stopContextMenuClick(event: MouseEvent<HTMLElement>) {
  event.stopPropagation();
}

function getRadioClassName({ checked }: { checked: boolean }) {
  return clsx(
    "group relative flex cursor-pointer flex-col rounded-lg border-2 p-2 transition-color duration-200",
    "hover:border-blue-500 hover:shadow-md",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
    {
      "border-blue-500 bg-blue-50 dark:bg-blue-900/20": checked,
      "border-gray-200 dark:border-gray-600": checked === false,
    },
  );
}

function ArtworkVariantOptionContent({ checked }: { checked: boolean }) {
  const option = useContext(ArtworkVariantOptionContext);

  if (option === null) {
    throw new Error("ArtworkVariantOptionContent requires option context");
  }

  const {
    credits,
    effectiveBodyId,
    effectiveHeadId,
    spriteId,
    spriteUrl,
    variant,
  } = option;

  return (
    <figure className="user-select-none group/figure relative flex flex-col items-center space-y-2">
      <div>
        <Image
          alt={`Artwork variant ${variant || "default"}`}
          className="image-render-pixelated h-24 w-24 object-fill"
          decoding="async"
          height={100}
          loading="lazy"
          src={spriteUrl}
          unoptimized
          width={100}
        />
        {checked === true ? (
          <div className="absolute top-0.5 right-0.5 rounded-full bg-blue-500 p-1.5 text-white shadow-lg">
            <Check aria-hidden="true" className="h-3 w-3" />
          </div>
        ) : null}
        <ContextMenu
          items={[
            {
              favicon: "https://www.fusiondex.org/favicon.ico",
              href: `https://www.fusiondex.org/sprite/pif/${spriteId}${variant}`,
              icon: ArrowUpRight,
              iconClassName: "dark:text-blue-300 text-blue-400",
              id: "artist",
              label: "View on FusionDex",
              onClick: stopContextMenuClick,
              target: "_blank",
            },
          ]}
        >
          <div className="absolute inset-0 bg-transparent" />
        </ContextMenu>
      </div>
      <figcaption className="w-full px-1 text-center">
        <div className="block cursor-pointer select-none break-words font-normal text-gray-500 text-xs leading-tight dark:text-gray-400">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-1 left-0.5 text-gray-500/40 text-lg uppercase transition-colors group-hover/figure:text-blue-500/80 dark:text-gray-400/30 dark:group-hover/figure:text-gray-400/30"
          >
            {variant}
          </div>
          <div className="pointer-events-none">
            {getFormattedCreditsFromResponse(
              credits,
              effectiveHeadId,
              effectiveBodyId,
              variant,
            )}
          </div>
        </div>
      </figcaption>
    </figure>
  );
}

interface ArtworkVariantOptionProps extends ArtworkVariantOptionContextValue {}

function ArtworkVariantOption({
  effectiveBodyId,
  effectiveHeadId,
  variant,
  ...option
}: ArtworkVariantOptionProps) {
  return (
    <ArtworkVariantOptionContext.Provider
      value={{ effectiveBodyId, effectiveHeadId, variant, ...option }}
    >
      <Field className="contents">
        <Radio
          className={getRadioClassName}
          id={`artwork-variant-${variant}`}
          value={variant}
        >
          {ArtworkVariantOptionContent}
        </Radio>
      </Field>
    </ArtworkVariantOptionContext.Provider>
  );
}

interface ArtworkVariantListProps {
  availableVariants: string[];
  credits: Parameters<typeof getFormattedCreditsFromResponse>[0];
  effectiveBodyId: number | null;
  effectiveHeadId: number | null;
  onChange: (variant: string) => void;
  selectedVariant: string;
  spriteId: string | number | null;
}

interface ArtworkVariantModalContentProps {
  availableVariants: string[];
  credits: Parameters<typeof getFormattedCreditsFromResponse>[0];
  effectiveBodyId: number | null;
  effectiveHeadId: number | null;
  isLoading: boolean;
  onClearVariant: () => void;
  onClose: () => void;
  onSelectVariant: (variant: string) => void;
  selectedVariant: string;
  spriteId: string | number | null;
}

function ArtworkVariantModalContent({
  availableVariants,
  credits,
  effectiveBodyId,
  effectiveHeadId,
  isLoading,
  onClearVariant,
  onClose,
  onSelectVariant,
  selectedVariant,
  spriteId,
}: ArtworkVariantModalContentProps) {
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-blue-600 border-b-2" />
        <span className="ml-3 text-gray-600 dark:text-gray-300">
          Loading variants...
        </span>
      </div>
    );
  }

  if (availableVariants.length === 0) {
    return (
      <div className="flex-1 py-8 text-center">
        <p className="text-gray-600 dark:text-gray-300">
          No artwork variants available for this Pokémon.
        </p>
      </div>
    );
  }

  return (
    <>
      <ArtworkVariantList
        availableVariants={availableVariants}
        credits={credits}
        effectiveBodyId={effectiveBodyId}
        effectiveHeadId={effectiveHeadId}
        onChange={onSelectVariant}
        selectedVariant={selectedVariant}
        spriteId={spriteId}
      />
      <div className="flex items-center justify-between border-gray-200 border-t pt-4 dark:border-gray-700">
        <button
          className={clsx(
            "rounded-md px-4 py-2 text-sm transition-colors",
            "bg-gray-100 text-gray-900 hover:bg-gray-200",
            "dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2",
          )}
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
        <button
          className={clsx(
            "rounded-md px-4 py-2 text-sm transition-colors",
            "bg-gray-100 text-gray-900 hover:bg-gray-200",
            "dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          )}
          onClick={onClearVariant}
          type="button"
        >
          Use Default
        </button>
      </div>
    </>
  );
}

function ArtworkVariantList({
  availableVariants,
  credits,
  effectiveBodyId,
  effectiveHeadId,
  onChange,
  selectedVariant,
  spriteId,
}: ArtworkVariantListProps) {
  return (
    <RadioGroup
      aria-label="Artwork variant options"
      className="scrollbar-thin relative grid min-h-0 flex-1 grid-cols-2 gap-4 overflow-y-auto overflow-x-hidden p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      data-scroll-container
      onChange={onChange}
      value={selectedVariant}
    >
      {availableVariants.map((variant) => (
        <ArtworkVariantOption
          credits={credits}
          effectiveBodyId={effectiveBodyId}
          effectiveHeadId={effectiveHeadId}
          key={variant}
          spriteId={spriteId}
          spriteUrl={generateSpriteUrl(
            effectiveHeadId,
            effectiveBodyId,
            variant,
          )}
          variant={variant}
        />
      ))}
    </RadioGroup>
  );
}

export function ArtworkVariantModal({
  isOpen,
  onClose,
  headId,
  bodyId,
  isFusion = false,
}: ArtworkVariantModalProps) {
  const displayPokemon = getDisplayPokemon(
    headId ? ({ id: headId } as PokemonOptionType) : null,
    bodyId ? ({ id: bodyId } as PokemonOptionType) : null,
    isFusion,
  );

  const effectiveHeadId = displayPokemon.head?.id || null;
  const effectiveBodyId = displayPokemon.isFusion
    ? displayPokemon.body?.id || null
    : null;
  const spriteId =
    effectiveHeadId && effectiveBodyId
      ? `${effectiveHeadId}.${effectiveBodyId}`
      : effectiveHeadId || effectiveBodyId;

  const { variant: globalPreferredVariant, updateVariant } =
    usePreferredVariantState(effectiveHeadId, effectiveBodyId);
  const [localVariant, setLocalVariant] = useState<string | null>(null);
  const { data: variants, isLoading: variantsLoading } = useSpriteVariants(
    effectiveHeadId,
    effectiveBodyId,
    isOpen,
  );
  const { data: credits, isLoading: creditsLoading } = useSpriteCredits(
    effectiveHeadId,
    effectiveBodyId,
    isOpen,
  );

  const isLoading = creditsLoading || variantsLoading;
  const availableVariants = variants && variants.length > 1 ? variants : [];
  const selectedVariant = localVariant ?? globalPreferredVariant ?? "";

  const handleClose = useCallback(() => {
    setLocalVariant(null);
    onClose();
  }, [onClose]);

  const handleSelectVariant = useCallback(
    async (variant: string) => {
      setLocalVariant(variant);
      await updateVariant(variant);
    },
    [updateVariant],
  );

  const handleClearVariant = useCallback(async () => {
    setLocalVariant("");
    await updateVariant("");
    handleClose();
  }, [handleClose, updateVariant]);

  return (
    <Dialog
      className="group relative z-[70]"
      onClose={handleClose}
      open={isOpen}
    >
      <DialogBackdrop
        aria-hidden="true"
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] data-closed:opacity-0 data-enter:opacity-100 dark:bg-black/50"
        transition
      />

      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel
          className={clsx(
            "flex max-h-[80vh] w-full max-w-5xl flex-col space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800",
            "transition duration-150 ease-out data-closed:scale-98 data-closed:opacity-0",
          )}
          id="artwork-variant-modal"
          transition
        >
          <div className="flex items-center justify-between">
            <DialogTitle className="font-semibold text-gray-900 text-xl dark:text-white">
              Select Artwork Variant
            </DialogTitle>
            <button
              aria-label="Close modal"
              className={clsx(
                "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2",
                "rounded-md p-1 transition-colors",
              )}
              onClick={handleClose}
              type="button"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>

          <ArtworkVariantModalContent
            availableVariants={availableVariants}
            credits={credits}
            effectiveBodyId={effectiveBodyId}
            effectiveHeadId={effectiveHeadId}
            isLoading={isLoading}
            onClearVariant={handleClearVariant}
            onClose={handleClose}
            onSelectVariant={handleSelectVariant}
            selectedVariant={selectedVariant}
            spriteId={spriteId}
          />
        </DialogPanel>
      </div>
    </Dialog>
  );
}
