import { FusionSprite } from './FusionSprite';
import {
  isEggId,
  PokemonStatus,
  type PokemonOptionType,
} from '@/loaders/pokemon';
import { ContextMenu, type ContextMenuItem } from '@/components/ContextMenu';
import { Fragment } from 'react';
import clsx from 'clsx';
import { ArtworkVariantButton } from './ArtworkVariantButton';
import { useEncounter } from '@/stores/playthroughs';
import { useMemo } from 'react';
import { ArrowUpRightSquareIcon, Loader2, Replace } from 'lucide-react';
import { useSpriteVariants } from '@/hooks/useSprite';

interface SummaryCardProps {
  locationId: string;
  shouldLoad?: boolean;
}

function getNicknameText(
  head: PokemonOptionType | null,
  body: PokemonOptionType | null,
  isFusion: boolean
): string | undefined {
  if (!isFusion) {
    // Single Pokémon - show nickname if available, otherwise show name
    const pokemon = head || body;
    if (!pokemon) return '';
    return pokemon.nickname || pokemon.name;
  }

  // Fusion case
  if (!head || !body) {
    const pokemon = head || body;
    if (!pokemon) return '';
    return pokemon.nickname || pokemon.name;
  }

  return head.nickname || body.nickname || `${head.name}/${body.name}`;
}

export default function SummaryCard({
  locationId,
  shouldLoad,
}: SummaryCardProps) {
  const encounterData = useEncounter(locationId);
  const eitherPokemonIsEgg =
    isEggId(encounterData?.head?.id) || isEggId(encounterData?.body?.id);

  // Check for art variants
  const { data: variants, isLoading: isLoadingVariants } = useSpriteVariants(
    encounterData?.head?.id,
    encounterData?.body?.id,
    shouldLoad
  );
  const hasArtVariants = variants && variants.length > 1;

  const contextItems = useMemo<ContextMenuItem[]>(() => {
    const id =
      encounterData?.head?.id && encounterData?.body?.id
        ? `${encounterData.head.id}.${encounterData.body.id}`
        : encounterData?.head?.id || encounterData?.body?.id;
    const infinitefusiondexLink = `https://infinitefusiondex.com/details/${id}`;
    const fusiondexLink = `https://fusiondex.org/${id}/`;
    return [
      {
        id: 'change-variant',
        label: 'Change Preferred Variant',
        disabled: eitherPokemonIsEgg || !hasArtVariants,
        icon: isLoadingVariants ? Loader2 : Replace,
        iconClassName: isLoadingVariants ? 'animate-spin' : '',
        onClick: () => {
          console.log('change variant');
        },
      },
      {
        id: 'separate',
        separator: true,
      },
      {
        id: 'infinitedex',
        label: 'Open InfiniteDex entry',
        href: infinitefusiondexLink,
        target: '_blank',
        favicon: 'https://infinitefusiondex.com/images/favicon.ico',
        icon: ArrowUpRightSquareIcon,
        iconClassName: 'dark:text-blue-300 text-blue-400',
      },
      {
        id: 'fusiondex',
        label: 'Open FusionDex entry',
        href: fusiondexLink,
        target: '_blank',
        favicon: 'https://www.fusiondex.org/favicon.ico',
        icon: ArrowUpRightSquareIcon,
        iconClassName: 'dark:text-blue-300 text-blue-400',
      },
    ];
  }, [encounterData, eitherPokemonIsEgg, hasArtVariants, isLoadingVariants]);

  if (!encounterData?.head && !encounterData?.body) {
    return null;
  }

  const name = getNicknameText(
    encounterData?.head,
    encounterData?.body,
    encounterData?.isFusion
  );
  const isDeceased =
    encounterData?.head?.status === PokemonStatus.DECEASED ||
    encounterData?.body?.status === PokemonStatus.DECEASED;

  return (
    <ContextMenu items={contextItems} portalRootId='location-table'>
      <div className='flex flex-col items-center justify-center relative'>
        <Fragment>
          <div
            className={clsx(
              'size-22 absolute -translate-y-2 rounded-lg opacity-30 border border-gray-200 dark:border-gray-40 ',
              {
                'text-rose-200 dark:text-red-700 dark:mix-blend-color-dodge opacity-90 dark:border-red-800':
                  isDeceased,
                'dark:mix-blend-soft-light text-white': !isDeceased,
              }
            )}
            style={{
              background: `repeating-linear-gradient(currentColor 0px, currentColor 2px, rgba(154, 163, 175, 0.3) 1px, rgba(156, 163, 175, 0.3) 3px)`,
            }}
          />
          <FusionSprite
            locationId={locationId}
            size='lg'
            shouldLoad={shouldLoad}
          />
        </Fragment>
        {eitherPokemonIsEgg ? null : (
          <ArtworkVariantButton
            key={`${encounterData?.head?.id}-${encounterData?.body?.id} `}
            className='absolute bottom-0 right-1/2 -translate-x-6 z-10'
            locationId={locationId}
            shouldLoad={shouldLoad}
          />
        )}
        {name && (
          <div className='z-5 p-0.5 text-center absolute bottom-0 translate-y-8.5 rounded-sm'>
            <span className='text-md dark:font-normal font-mono truncate max-w-full block px-1 rounded text-gray-900 dark:text-white dark:pixel-shadow tracking-[0.001em]'>
              {name}
            </span>
          </div>
        )}
      </div>
    </ContextMenu>
  );
}
