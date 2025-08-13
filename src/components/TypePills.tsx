import React from 'react';
import clsx from 'clsx';
import type { TypeName } from '@/lib/typings';
import { twMerge } from 'tailwind-merge';
import { CursorTooltip } from './CursorTooltip';

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

export type PillSize = 'xs' | 'sm' | 'md';

export function TypeBadge({
  type,
  size = 'md',
  showTooltip = true,
}: {
  type: TypeName;
  size?: PillSize;
  showTooltip?: boolean;
}) {
  const core =
    size === 'xs' ? (
      <span
        className={clsx(
          'inline-block h-3 w-3 rounded-full border border-white/20 shadow-sm/20',
          typeColors[type]
        )}
        role='status'
        aria-label={`${type} type`}
        title={
          showTooltip
            ? `${type.charAt(0).toUpperCase()}${type.slice(1)} type`
            : undefined
        }
      />
    ) : (
      <span
        className={clsx(
          'inline-flex items-center rounded-xs uppercase cursor-default select-none border border-white/10 drop-shadow-sm/20',
          size === 'sm' ? 'px-1.5 py-0' : 'px-2 py-0.5',
          typeColors[type]
        )}
        role='status'
        aria-label={`${type} type`}
        title={
          showTooltip
            ? `${type.charAt(0).toUpperCase()}${type.slice(1)} type`
            : undefined
        }
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

  if (!showTooltip) return core;

  // Shared tooltip for single badge
  return (
    <CursorTooltip
      content={
        <div className={twMerge('flex gap-1.5')}>
          <TypeBadge type={type} size='sm' showTooltip={false} />
        </div>
      }
      placement='top-end'
    >
      {core}
    </CursorTooltip>
  );
}

export function TypeTooltip({
  primary,
  secondary,
  children,
  placement = 'top-end',
}: {
  primary?: TypeName;
  secondary?: TypeName;
  children: React.ReactElement;
  placement?: Parameters<typeof CursorTooltip>[0]['placement'];
}) {
  if (!primary && !secondary) return children;

  return (
    <CursorTooltip
      content={
        <div
          className={twMerge(clsx('flex gap-1.5'))}
          aria-label='pokemon types tooltip'
        >
          {primary && (
            <TypeBadge type={primary} size='sm' showTooltip={false} />
          )}
          {secondary && (
            <TypeBadge type={secondary} size='sm' showTooltip={false} />
          )}
        </div>
      }
      placement={placement}
    >
      {children}
    </CursorTooltip>
  );
}

export function TypePills({
  primary,
  secondary,
  className,
  size = 'md',
  showTooltip = false,
}: {
  primary?: TypeName;
  secondary?: TypeName;
  className?: string;
  size?: PillSize;
  showTooltip?: boolean;
}) {
  const pills = (
    <div
      className={twMerge(
        clsx('flex', size === 'xs' ? 'gap-1' : 'gap-1.5'),
        className
      )}
      aria-label='pokemon types'
    >
      {primary && <TypeBadge type={primary} size={size} showTooltip={false} />}
      {secondary && (
        <TypeBadge type={secondary} size={size} showTooltip={false} />
      )}
    </div>
  );

  if (showTooltip) {
    return (
      <TypeTooltip primary={primary} secondary={secondary}>
        {pills}
      </TypeTooltip>
    );
  }

  return pills;
}

export default TypePills;
