import React from 'react';
import clsx from 'clsx';
import type { TypeName } from '@/lib/typings';
import { twMerge } from 'tailwind-merge';

const typeColors: Record<TypeName, string> = {
  normal: 'bg-gradient-to-b from-[#8A8A4A] to-[#A6A66A]',
  fire: 'bg-gradient-to-b from-[#D85A1C] to-[#F08030]',
  water: 'bg-gradient-to-b from-[#3E5AB5] to-[#6890F0]',
  electric: 'bg-gradient-to-b from-[#E8A800] to-[#FFEC70]',
  grass: 'bg-gradient-to-b from-[#4C9A28] to-[#78C850]',
  ice: 'bg-gradient-to-b from-[#45B5B2] to-[#98D8D8]',
  fighting: 'bg-gradient-to-b from-[#932220] to-[#C03028]',
  poison: 'bg-gradient-to-b from-[#802E80] to-[#A040A0]',
  ground: 'bg-gradient-to-b from-[#C2973E] to-[#E0C068]',
  flying: 'bg-gradient-to-b from-[#825BC5] to-[#A890F0]',
  psychic: 'bg-gradient-to-b from-[#D42E55] to-[#F85888]',
  bug: 'bg-gradient-to-b from-[#849215] to-[#A8B820]',
  rock: 'bg-gradient-to-b from-[#908125] to-[#B8A038]',
  ghost: 'bg-gradient-to-b from-[#4C3B61] to-[#705898]',
  dragon: 'bg-gradient-to-b from-[#4428C5] to-[#7038F8]',
  dark: 'bg-gradient-to-b from-[#4A3930] to-[#705848]',
  steel: 'bg-gradient-to-b from-[#9090AB] to-[#B8B8D0]',
  fairy: 'bg-gradient-to-b from-[#B25579] to-[#EE99AC]',
};

function TypeBadge({ type }: { type: TypeName }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-xs px-2 py-0.5 uppercase cursor-default select-none border border-white/10 drop-shadow-sm/20',
        typeColors[type]
      )}
      role='status'
      aria-label={`${type} type`}
      title={`${type.charAt(0).toUpperCase()}${type.slice(1)} type`}
    >
      <span className='text-white text-xs font-semibold text-shadow-sm/20'>
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
      className={twMerge('flex gap-1.5', className)}
      aria-label='pokemon types'
    >
      {primary && <TypeBadge type={primary} />}
      {secondary && <TypeBadge type={secondary} />}
    </div>
  );
}

export default TypePills;
