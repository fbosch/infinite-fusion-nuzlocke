import clsx from "clsx";
import { getTypeWeaknesses } from "poke-types";
import type React from "react";
import { twMerge } from "tailwind-merge";
import type { TypeName } from "@/lib/typings";
import { ALL_TYPES } from "@/lib/typings";
import { CursorTooltip } from "./cursor-tooltip";

const typeColors: Record<TypeName, string> = {
  bug: "bg-gradient-to-b from-[#A4B235] to-[#C8D840] dark:from-[#849215] dark:to-[#A8B820]",
  dark: "bg-gradient-to-b from-[#6A5950] to-[#907868] dark:from-[#4A3930] dark:to-[#705848]",
  dragon:
    "bg-gradient-to-b from-[#6448E5] to-[#9058F8] dark:from-[#4428C5] dark:to-[#7038F8]",
  electric:
    "bg-gradient-to-b from-[#EBB220] to-[#FFEF90] dark:from-[#E8A800] dark:to-[#FFEC70]",
  fairy:
    "bg-gradient-to-b from-[#D27599] to-[#F8B9CC] dark:from-[#B25579] dark:to-[#EE99AC]",
  fighting:
    "bg-gradient-to-b from-[#B34240] to-[#D05048] dark:from-[#932220] dark:to-[#C03028]",
  fire: "bg-gradient-to-b from-[#E86B3C] to-[#F29050] dark:from-[#D85A1C] dark:to-[#F08030]",
  flying:
    "bg-gradient-to-b from-[#A27BE5] to-[#C8B0F0] dark:from-[#825BC5] dark:to-[#A890F0]",
  ghost:
    "bg-gradient-to-b from-[#6C5B81] to-[#9078B8] dark:from-[#4C3B61] dark:to-[#705898]",
  grass:
    "bg-gradient-to-b from-[#6CAA48] to-[#98D870] dark:from-[#4C9A28] dark:to-[#78C850]",
  ground:
    "bg-gradient-to-b from-[#D2A75E] to-[#F0D088] dark:from-[#C2973E] dark:to-[#E0C068]",
  ice: "bg-gradient-to-b from-[#65C5C2] to-[#B8E8E8] dark:from-[#45B5B2] dark:to-[#98D8D8]",
  normal:
    "bg-gradient-to-b from-[#8A8A4A] to-[#A6A66A] dark:from-[#8A8A4A] dark:to-[#A6A66A]",
  poison:
    "bg-gradient-to-b from-[#A04EA0] to-[#C060C0] dark:from-[#802E80] dark:to-[#A040A0]",
  psychic:
    "bg-gradient-to-b from-[#E44E75] to-[#F878A8] dark:from-[#D42E55] dark:to-[#F85888]",
  rock: "bg-gradient-to-b from-[#B0A145] to-[#D8C058] dark:from-[#908125] dark:to-[#B8A038]",
  steel:
    "bg-gradient-to-b from-[#B0B0CB] to-[#D8D8F0] dark:from-[#9090AB] dark:to-[#B8B8D0]",
  water:
    "bg-gradient-to-b from-[#5E7AD5] to-[#88A0F0] dark:from-[#3E5AB5] dark:to-[#6890F0]",
};

export type PillSize = "xxs" | "xs" | "sm" | "md";

function TypeEffectivenessSummary({
  primary,
  secondary,
  hideNeutral = false,
}: {
  primary?: TypeName;
  secondary?: TypeName;
  hideNeutral?: boolean;
}) {
  const mainType = (primary ?? secondary) as string | undefined;
  const secondType = primary && secondary ? (secondary as string) : undefined;
  const multiplierByType = (() => {
    if (!mainType) {
      return {} as Record<TypeName, number>;
    }
    const map = getTypeWeaknesses(mainType, secondType);
    const result: Record<TypeName, number> = {} as Record<TypeName, number>;
    for (const t of ALL_TYPES as readonly TypeName[]) {
      const v = Number(map[t]);
      result[t] = Number.isFinite(v) ? (v as number) : 1;
    }
    return result;
  })();

  const factorLabel = (v: number): string => {
    if (v === 4) {
      return "4x";
    }
    if (v === 2) {
      return "2x";
    }
    if (v === 0.5) {
      return "½x";
    }
    if (v === 0.25) {
      return "¼x";
    }
    if (v === 0) {
      return "0x";
    }
    return "";
  };

  const factorClass = (v: number): string => {
    // Reversed colors: weaknesses (2x/4x) are green, resistances are red
    if (v === 4) {
      return "bg-emerald-700 text-white";
    }
    if (v === 2) {
      return "bg-emerald-600 text-white";
    }
    if (v === 0.5) {
      return "bg-red-600 text-white";
    }
    if (v === 0.25) {
      return "bg-red-700 text-white";
    }
    if (v === 0) {
      return "bg-red-800 text-white";
    }
    return "border border-gray-200 dark:border-gray-600 text-transparent";
  };

  if (!(primary || secondary)) {
    return null;
  }

  return (
    <section aria-label="type effectiveness" className="w-full max-w-full">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] opacity-70">Defenses</span>
        <div className="inline-flex items-center gap-1.5">
          {primary ? (
            <TypeBadge showTooltip={false} size="sm" type={primary} />
          ) : null}
          {secondary ? (
            <TypeBadge showTooltip={false} size="sm" type={secondary} />
          ) : null}
        </div>
      </div>
      <div className="my-2 h-px w-full bg-gray-200 dark:bg-gray-600/60" />
      {/* Grid of all attacking types with multipliers */}
      {mainType ? (
        <div className="space-y-2">
          {(() => {
            const allVisible = (ALL_TYPES as readonly TypeName[]).filter(
              (t) => !(hideNeutral && multiplierByType[t] === 1),
            );
            const splitIndex = Math.ceil(allVisible.length / 2);
            const top = allVisible.slice(0, splitIndex);
            const bottom = allVisible.slice(splitIndex);

            const renderBlock = (types: readonly TypeName[], key: string) => (
              <div key={key}>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {types.map((t) => (
                    <div
                      aria-label={`${t} attack type`}
                      className={clsx(
                        "flex size-6 items-center justify-center rounded-xs border border-white/10 font-semibold text-[10px] text-shadow-sm/20 text-white uppercase",
                        typeColors[t],
                      )}
                      key={`head-${key}-${t}`}
                      role="img"
                      title={`${t} attack`}
                    >
                      {t.slice(0, 3)}
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5 sm:gap-2">
                  {types.map((t) => {
                    const v = multiplierByType[t];
                    const label = factorLabel(v);
                    return (
                      <div
                        aria-label={`${t} effectiveness ${label || "1x"}`}
                        className={clsx(
                          "flex size-6 items-center justify-center rounded-xs font-semibold text-[11px]",
                          factorClass(v),
                        )}
                        key={`val-${key}-${t}`}
                        role="img"
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>
              </div>
            );

            return (
              <div className="flex flex-col gap-y-4">
                {renderBlock(top, "top")}
                {bottom.length > 0 && renderBlock(bottom, "bottom")}
              </div>
            );
          })()}
        </div>
      ) : null}
    </section>
  );
}

function TypeBadge({
  type,
  size = "md",
  showTooltip = true,
}: {
  type: TypeName;
  size?: PillSize;
  showTooltip?: boolean;
}) {
  const title = showTooltip
    ? `${type.charAt(0).toUpperCase()}${type.slice(1)} type`
    : undefined;
  let core: React.ReactElement;

  if (size === "xxs" || size === "xs") {
    core = (
      <span
        aria-label={`${type} type`}
        className={clsx(
          "inline-block rounded-full border border-white/20",
          size === "xxs" ? "h-2 w-2" : "h-3 w-3",
          typeColors[type],
        )}
        role="status"
        title={title}
      />
    );
  } else {
    core = (
      <span
        aria-label={`${type} type`}
        className={clsx(
          "inline-flex cursor-default select-none items-center rounded-xs border border-white/10 uppercase",
          size === "sm" ? "px-1.5 py-0" : "px-2 py-0.5",
          typeColors[type],
        )}
        role="status"
        title={title}
      >
        <span
          className={clsx(
            "font-semibold text-shadow-sm/20 text-white",
            size === "sm" ? "text-[10px]" : "text-xs",
          )}
        >
          {type}
        </span>
      </span>
    );
  }

  if (!showTooltip) {
    return core;
  }

  // Shared tooltip for single badge with effectiveness
  return (
    <CursorTooltip
      className="max-w-none"
      content={<TypeEffectivenessSummary primary={type} />}
      delay={300}
      placement="bottom-end"
    >
      {core}
    </CursorTooltip>
  );
}

function TypeTooltip({
  primary,
  secondary,
  children,
  placement = "bottom-end",
  hideNeutral,
}: {
  primary?: TypeName;
  secondary?: TypeName;
  children: React.ReactElement;
  placement?: Parameters<typeof CursorTooltip>[0]["placement"];
  hideNeutral?: boolean;
}) {
  if (!(primary || secondary)) {
    return children;
  }

  return (
    <CursorTooltip
      className="max-w-none"
      content={
        <TypeEffectivenessSummary
          hideNeutral={hideNeutral}
          primary={primary}
          secondary={secondary}
        />
      }
      delay={300}
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
  size = "md",
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
  let gapClass = "gap-1.5";
  if (size === "xxs") {
    gapClass = "gap-0.5";
  } else if (size === "xs") {
    gapClass = "gap-1";
  }

  const pills = (
    <section className={twMerge(clsx("flex", gapClass), className)}>
      {primary ? (
        <TypeBadge showTooltip={false} size={size} type={primary} />
      ) : null}
      {secondary ? (
        <TypeBadge showTooltip={false} size={size} type={secondary} />
      ) : null}
    </section>
  );

  if (showTooltip) {
    return (
      <TypeTooltip
        hideNeutral={hideNeutral}
        primary={primary}
        secondary={secondary}
      >
        {pills}
      </TypeTooltip>
    );
  }

  return pills;
}

const DefaultTypePills = TypePills;

export default DefaultTypePills;
