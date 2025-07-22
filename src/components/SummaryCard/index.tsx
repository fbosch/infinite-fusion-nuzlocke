import { EncounterData } from '@/loaders';
import { FusionSprite } from './FusionSprite';
import { type PokemonOption } from '@/loaders/pokemon';

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
      {name && (
        <div className=' text-center absolute top-0  -translate-y-9'>
          <span className='text-sm font-medium font-mono truncate max-w-full block px-1 rounded text-gray-900 dark:text-white '>
            {name}
          </span>
        </div>
      )}
      <div>
        <FusionSprite
          encounterData={encounterData}
          size='lg'
          className='scale-150 relative translate-y-1/8'
        />
      </div>
    </div>
  );
}
