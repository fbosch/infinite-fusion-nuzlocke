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

type PillSize = 'xs' | 'sm' | 'md';

function TypeBadge({ type, size = 'md' }: { type: TypeName; size?: PillSize }) {
  if (size === 'xs') {
    return (
      <span
        className={clsx(
          'inline-block h-3 w-3 rounded-full border border-white/20 shadow-sm/20',
          typeColors[type]
        )}
        role='status'
        aria-label={`${type} type`}
        title={`${type.charAt(0).toUpperCase()}${type.slice(1)} type`}
      />
    );
  }
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-xs uppercase cursor-default select-none border border-white/10 drop-shadow-sm/20',
        size === 'sm' ? 'px-1.5 py-0' : 'px-2 py-0.5',
        typeColors[type]
      )}
      role='status'
      aria-label={`${type} type`}
      title={`${type.charAt(0).toUpperCase()}${type.slice(1)} type`}
    >
      <span
        className={clsx(
          'text-white font-semibold text-shadow-sm/20',
          size === 'sm' ? 'text-[10px]' : 'text-xs'
        )}
      >
        {type}
      </span>
    </span>
  );
}

export function TypePills({
  primary,
  secondary,
  className,
  size = 'md',
}: {
  primary?: TypeName;
  secondary?: TypeName;
  className?: string;
  size?: PillSize;
}) {
  return (
    <div
      className={twMerge(
        clsx('flex', size === 'xs' ? 'gap-1' : 'gap-1.5'),
        className
      )}
      aria-label='pokemon types'
    >
      {primary && <TypeBadge type={primary} size={size} />}
      {secondary && <TypeBadge type={secondary} size={size} />}
    </div>
  );
}

export default TypePills;
