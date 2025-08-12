import React from 'react';
import clsx from 'clsx';
import type { TypeName } from '@/lib/typings';

const typeColors: Record<TypeName, string> = {
  normal: 'bg-[#A8A77A] text-black',
  fire: 'bg-[#EE8130] text-black',
  water: 'bg-[#6390F0] text-white',
  electric: 'bg-[#F7D02C] text-black',
  grass: 'bg-[#7AC74C] text-black',
  ice: 'bg-[#96D9D6] text-black',
  fighting: 'bg-[#C22E28] text-white',
  poison: 'bg-[#A33EA1] text-white',
  ground: 'bg-[#E2BF65] text-black',
  flying: 'bg-[#A98FF3] text-black',
  psychic: 'bg-[#F95587] text-black',
  bug: 'bg-[#A6B91A] text-black',
  rock: 'bg-[#B6A136] text-black',
  ghost: 'bg-[#735797] text-white',
  dragon: 'bg-[#6F35FC] text-white',
  dark: 'bg-[#705746] text-white',
  steel: 'bg-[#B7B7CE] text-black',
  fairy: 'bg-[#D685AD] text-black',
};

function TypeBadge({ type }: { type: TypeName }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide cursor-default select-none',
        typeColors[type]
      )}
      role='status'
      aria-label={`${type} type`}
      title={`${type.charAt(0).toUpperCase()}${type.slice(1)} type`}
    >
      {type}
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
