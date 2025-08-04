import { ContextMenu, type ContextMenuItem } from '@/components/ContextMenu';
import { Fragment, useState, useMemo } from 'react';
import { ArrowUpRight, Loader2, Replace } from 'lucide-react';
import { useSpriteVariants } from '@/hooks/useSprite';
import { isEggId, type PokemonOptionType } from '@/loaders/pokemon';
import dynamic from 'next/dynamic';

const ArtworkVariantModal = dynamic(
  () => import('./ArtworkVariantModal').then(mod => mod.ArtworkVariantModal),
  {
    ssr: false,
  }
);

interface PokemonContextMenuProps {
  children: React.ReactNode;
  locationId: string;
  encounterData: {
    head?: PokemonOptionType | null;
    body?: PokemonOptionType | null;
    artworkVariant?: string;
  } | null;
  shouldLoad?: boolean;
}

export function PokemonContextMenu({
  children,
  locationId,
  encounterData,
  shouldLoad,
}: PokemonContextMenuProps) {
  const eitherPokemonIsEgg =
    isEggId(encounterData?.head?.id) || isEggId(encounterData?.body?.id);

  // Check for art variants
  const { data: variants, isLoading: isLoadingVariants } = useSpriteVariants(
    encounterData?.head?.id,
    encounterData?.body?.id,
    shouldLoad && !eitherPokemonIsEgg
  );
  const hasArtVariants = variants && variants.length > 1;

  const [hasContextMenuBeenOpened, setHasContextMenuBeenOpened] =
    useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);

  const contextItems = useMemo<ContextMenuItem[]>(() => {
    const id =
      encounterData?.head?.id && encounterData?.body?.id
        ? `${encounterData.head.id}.${encounterData.body.id}`
        : encounterData?.head?.id || encounterData?.body?.id;
    const infinitefusiondexLink = `https://infinitefusiondex.com/details/${id}`;
    const fusiondexLink = `https://fusiondex.org/sprite/pif/${id}${encounterData?.artworkVariant ?? ''}/`;

    return [
      {
        id: 'change-variant',
        label: 'Change Preferred Artwork',
        disabled: eitherPokemonIsEgg || !hasArtVariants,
        icon: isLoadingVariants ? Loader2 : Replace,
        tooltip:
          eitherPokemonIsEgg || !hasArtVariants
            ? isLoadingVariants
              ? 'Loading artwork variants...'
              : 'No artwork variants available'
            : undefined,
        iconClassName: isLoadingVariants ? 'animate-spin' : '',
        onClick: () => {
          setIsVariantModalOpen(true);
        },
      },
      {
        id: 'separate',
        separator: true,
      },
      {
        id: 'infinitedx',
        label: 'Open InfiniteDex entry',
        href: infinitefusiondexLink,
        target: '_blank',
        favicon: 'https://infinitefusiondex.com/images/favicon.ico',
        icon: ArrowUpRight,
        iconClassName: 'dark:text-blue-300 text-blue-400',
      },
      {
        id: 'fusiondex',
        label: 'Open FusionDex entry',
        href: fusiondexLink,
        target: '_blank',
        favicon: 'https://www.fusiondex.org/favicon.ico',
        icon: ArrowUpRight,
        iconClassName: 'dark:text-blue-300 text-blue-400',
      },
    ];
  }, [encounterData, eitherPokemonIsEgg, hasArtVariants, isLoadingVariants]);

  return (
    <>
      <ContextMenu
        disabled={eitherPokemonIsEgg}
        items={contextItems}
        portalRootId='location-table'
        onOpenChange={
          hasContextMenuBeenOpened
            ? undefined
            : () => setHasContextMenuBeenOpened(true)
        }
      >
        {children}
      </ContextMenu>

      <ArtworkVariantModal
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        locationId={locationId}
        headId={encounterData?.head?.id}
        bodyId={encounterData?.body?.id}
        currentVariant={encounterData?.artworkVariant}
      />
    </>
  );
}
