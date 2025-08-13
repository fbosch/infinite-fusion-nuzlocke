import React, { useMemo } from 'react';
import clsx from 'clsx';
import type { TypeName } from '@/lib/typings';
import { ALL_TYPES } from '@/lib/typings';
import { twMerge } from 'tailwind-merge';
import { CursorTooltip } from './CursorTooltip';
import { getTypeWeaknesses } from 'poke-types';

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

type FactorKey = '4' | '2' | '0.5' | '0.25' | '0';

function getDefensiveEffectGroups(
  primary?: TypeName,
  secondary?: TypeName
): Record<FactorKey, TypeName[]> {
  const empty: Record<FactorKey, TypeName[]> = {
    '4': [],
    '2': [],
    '0.5': [],
    '0.25': [],
    '0': [],
  };
  if (!primary && !secondary) return empty;
  const mainType = (primary ?? secondary) as string;
  const secondType = primary && secondary ? (secondary as string) : undefined;
  const map = getTypeWeaknesses(mainType, secondType);
  const isTypeName = (t: string): t is TypeName =>
    (ALL_TYPES as readonly string[]).includes(t);
  const groups: Record<FactorKey, TypeName[]> = {
    '4': [],
    '2': [],
    '0.5': [],
    '0.25': [],
    '0': [],
  };
  Object.entries(map).forEach(([type, multValue]) => {
    if (!isTypeName(type)) return;
    const mult = Number(multValue);
    if (mult === 4) groups['4'].push(type);
    else if (mult === 2) groups['2'].push(type);
    else if (mult === 0.5) groups['0.5'].push(type);
    else if (mult === 0.25) groups['0.25'].push(type);
    else if (mult === 0) groups['0'].push(type);
  });
  const byOrder = (a: TypeName, b: TypeName) =>
    ALL_TYPES.indexOf(a) - ALL_TYPES.indexOf(b);
  (Object.keys(groups) as FactorKey[]).forEach(k => {
    groups[k] = groups[k].sort(byOrder);
  });
  return groups;
}

function TypeEffectivenessSummary({
  primary,
  secondary,
  hideNeutral = false,
}: {
  primary?: TypeName;
  secondary?: TypeName;
  hideNeutral?: boolean;
}) {
  // Keep computed groups available for future presentation tweaks (group chips)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _groups = useMemo(
    () => getDefensiveEffectGroups(primary, secondary),
    [primary, secondary]
  );

  const mainType = (primary ?? secondary) as string | undefined;
  const secondType = primary && secondary ? (secondary as string) : undefined;
  const multiplierByType = useMemo(() => {
    if (!mainType) return {} as Record<TypeName, number>;
    const map = getTypeWeaknesses(mainType, secondType);
    const result: Record<TypeName, number> = {} as Record<TypeName, number>;
    (ALL_TYPES as readonly TypeName[]).forEach(t => {
      const v = Number(map[t]);
      result[t] = Number.isFinite(v) ? (v as number) : 1;
    });
    return result;
  }, [mainType, secondType]);

  const factorLabel = (v: number): string => {
    if (v === 4) return '4x';
    if (v === 2) return '2x';
    if (v === 0.5) return '½x';
    if (v === 0.25) return '¼x';
    if (v === 0) return '0x';
    return '';
  };

  const factorClass = (v: number): string => {
    // Reversed colors: weaknesses (2x/4x) are green, resistances are red
    if (v === 4) return 'bg-emerald-700 text-white';
    if (v === 2) return 'bg-emerald-600 text-white';
    if (v === 0.5) return 'bg-red-600 text-white';
    if (v === 0.25) return 'bg-red-700 text-white';
    if (v === 0) return 'bg-red-800 text-white';
    return 'border border-gray-200 dark:border-gray-600 text-transparent';
  };

  if (!primary && !secondary) return null;

  return (
    <div className='w-full max-w-full' aria-label='type effectiveness'>
      <div className='flex items-center justify-between gap-2'>
        <span className='text-[11px] opacity-70'>Defenses</span>
        <div
          className='inline-flex items-center gap-1.5'
          role='group'
          aria-label='types'
        >
          {primary && (
            <TypeBadge type={primary} size='sm' showTooltip={false} />
          )}
          {secondary && (
            <TypeBadge type={secondary} size='sm' showTooltip={false} />
          )}
        </div>
      </div>
      <div className='w-full h-px bg-gray-200 dark:bg-gray-600/60 my-2' />
      {/* Grid of all attacking types with multipliers */}
      {mainType && (
        <div className='space-y-2'>
          {(() => {
            const allVisible = (ALL_TYPES as readonly TypeName[]).filter(
              t => !(hideNeutral && multiplierByType[t] === 1)
            );
            const splitIndex = Math.ceil(allVisible.length / 2);
            const top = allVisible.slice(0, splitIndex);
            const bottom = allVisible.slice(splitIndex);

            const renderBlock = (types: readonly TypeName[], key: string) => (
              <div key={key}>
                <div className='flex flex-wrap gap-1.5 sm:gap-2'>
                  {types.map(t => (
                    <div
                      key={`head-${key}-${t}`}
                      className={clsx(
                        'size-6 rounded-xs flex items-center justify-center text-[10px] font-semibold uppercase text-white border border-white/10',
                        typeColors[t]
                      )}
                      role='columnheader'
                      aria-label={`${t} attack type`}
                      title={`${t} attack`}
                    >
                      {t.slice(0, 3)}
                    </div>
                  ))}
                </div>
                <div className='mt-1 flex flex-wrap gap-1.5 sm:gap-2'>
                  {types.map(t => {
                    const v = multiplierByType[t];
                    const label = factorLabel(v);
                    return (
                      <div
                        key={`val-${key}-${t}`}
                        className={clsx(
                          'size-6 rounded-xs flex items-center justify-center text-[11px] font-semibold',
                          factorClass(v)
                        )}
                        role='cell'
                        aria-label={`${t} effectiveness ${label || '1x'}`}
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>
              </div>
            );

            return (
              <div className='flex flex-col gap-y-4'>
                {renderBlock(top, 'top')}
                {bottom.length > 0 && renderBlock(bottom, 'bottom')}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

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

  // Shared tooltip for single badge with effectiveness
  return (
    <CursorTooltip
      content={<TypeEffectivenessSummary primary={type} />}
      placement='bottom-end'
      className='max-w-none'
    >
      {core}
    </CursorTooltip>
  );
}

export function TypeTooltip({
  primary,
  secondary,
  children,
  placement = 'bottom-end',
  hideNeutral,
}: {
  primary?: TypeName;
  secondary?: TypeName;
  children: React.ReactElement;
  placement?: Parameters<typeof CursorTooltip>[0]['placement'];
  hideNeutral?: boolean;
}) {
  if (!primary && !secondary) return children;

  return (
    <CursorTooltip
      content={
        <TypeEffectivenessSummary
          primary={primary}
          secondary={secondary}
          hideNeutral={hideNeutral}
        />
      }
      placement={placement}
      className='max-w-none'
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
  hideNeutral = false,
}: {
  primary?: TypeName;
  secondary?: TypeName;
  className?: string;
  size?: PillSize;
  showTooltip?: boolean;
  hideNeutral?: boolean;
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
      <TypeTooltip
        primary={primary}
        secondary={secondary}
        hideNeutral={hideNeutral}
      >
        {pills}
      </TypeTooltip>
    );
  }

  return pills;
}

export default TypePills;
