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
import PokeballIcon from '@/assets/images/pokeball.svg';
import { useMemo } from 'react';
import { DnaOff } from 'lucide-react';

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
  // Get encounter data directly - only this card will rerender when this encounter changes
  const encounterData = useEncounter(locationId);

  const contextItems = useMemo<ContextMenuItem[]>(() => {
    return [
      {
        id: 'pokedex',
        label: 'Pokedex',
        icon: PokeballIcon,
        onClick: () => {
          console.log('pokedex');
        },
      },
      {
        id: 'unfuse',
        label: 'Unfuse',
        icon: DnaOff,
        onClick: () => {
          console.log('unfuse');
        },
      },
    ];
  }, []);

  if (!encounterData?.head && !encounterData?.body) {
    return null;
  }

  const name = getNicknameText(
    encounterData.head,
    encounterData.body,
    encounterData.isFusion
  );
  const isDeceased =
    encounterData.head?.status === PokemonStatus.DECEASED ||
    encounterData.body?.status === PokemonStatus.DECEASED;

  const eitherPokemonIsEgg =
    isEggId(encounterData.head?.id) || isEggId(encounterData.body?.id);

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
