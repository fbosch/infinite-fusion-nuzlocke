import React from 'react';
import clsx from 'clsx';
import type { TypeName } from '@/lib/typings';

const typeColors: Record<TypeName, string> = {
  normal: 'bg-[#8A8A4A]',
  fire: 'bg-[#D85A1C]',
  water: 'bg-[#3E5AB5]',
  electric: 'bg-[#E8A800]',
  grass: 'bg-[#4C9A28]',
  ice: 'bg-[#45B5B2]',
  fighting: 'bg-[#932220]',
  poison: 'bg-[#802E80]',
  ground: 'bg-[#C2973E]',
  flying: 'bg-[#825BC5]',
  psychic: 'bg-[#D42E55]',
  bug: 'bg-[#849215]',
  rock: 'bg-[#908125]',
  ghost: 'bg-[#4C3B61]',
  dragon: 'bg-[#4428C5]',
  dark: 'bg-[#4A3930]',
  steel: 'bg-[#9090AB]',
  fairy: 'bg-[#B25579]',
};

function TypeBadge({ type }: { type: TypeName }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-xs px-2 py-0.5 uppercase cursor-default select-none border border-white/10',
        typeColors[type]
      )}
      role='status'
      aria-label={`${type} type`}
      title={`${type.charAt(0).toUpperCase()}${type.slice(1)} type`}
    >
      <span className='text-white font-ds pixel-shadow-black/70 text-xs font-semibold'>
        {type}
      </span>
    </span>
  );
}

export function TypePills({
  primary,
  secondary,
  className,
}: {
  primary?: TypeName;
  secondary?: TypeName;
  className?: string;
}) {
  return (
    <div
      className={clsx('flex items-stretch gap-1.5', className)}
      aria-label='pokemon types'
    >
      {primary && <TypeBadge type={primary} />}
      {secondary && <TypeBadge type={secondary} />}
    </div>
  );
}

export default TypePills;
