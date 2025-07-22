import { EncounterData } from '@/loaders';
import { FusionSprite } from './FusionSprite';
import { type PokemonOption } from '@/loaders/pokemon';
import { Fragment } from 'react';

interface SummaryCardProps {
  encounterData: EncounterData;
}

function getNicknameText(
  head: PokemonOption | null,
  body: PokemonOption | null,
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

export default function SummaryCard({ encounterData }: SummaryCardProps) {
  const name = getNicknameText(
    encounterData.head,
    encounterData.body,
    encounterData.isFusion
  );

  return (
    <div className='flex flex-col items-center justify-center relative'>
      {encounterData.head || encounterData.body ? (
        <Fragment>
          <div
            className='size-23 absolute -translate-y-2 rounded-lg dark:mix-blend-soft-light opacity-30 border border-gray-200 dark:border-gray-400'
            style={{
              background: `repeating-linear-gradient(white 1px, white 2px, rgba(154, 163, 175, 0.3) 1px, rgba(156, 163, 175, 0.3) 3px)`,
            }}
          />
          <FusionSprite
            encounterData={encounterData}
            size='lg'
            className='scale-150 relative'
          />
        </Fragment>
      ) : null}

      {name && (
        <div className='z-5 text-center absolute bottom-0 translate-y-8'>
          <span className='text-sm font-medium font-mono truncate max-w-full block px-1 rounded text-gray-900 dark:text-white '>
            {name}
          </span>
        </div>
      )}
    </div>
  );
}
