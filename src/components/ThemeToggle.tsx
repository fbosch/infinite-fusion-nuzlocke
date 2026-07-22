"use client";

import clsx from "clsx";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useRef } from "react";
import { useMounted } from "@/hooks/useMounted";

const themes = [
  { value: "system", icon: Monitor, label: "System theme" },
  { value: "light", icon: Sun, label: "Light theme" },
  { value: "dark", icon: Moon, label: "Dark theme" },
] as const;

type ThemeValue = (typeof themes)[number]["value"];

const isThemeValue = (value: string | undefined): value is ThemeValue =>
  themes.some((theme) => theme.value === value);

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const themeButtons = useRef<Array<HTMLButtonElement | null>>([]);

  if (mounted === false) {
    return (
      <div className="flex items-center rounded-[3px] border border-[#d0d7de] bg-white p-0.5 dark:border-[#30363d] dark:bg-[#1a1e23]">
        <div className="h-6 w-6 rounded-[2px] bg-gray-100 dark:bg-[#30363d]" />
        <div className="h-6 w-6 rounded-[2px]" />
        <div className="h-6 w-6 rounded-[2px]" />
      </div>
    );
  }

  const selectedTheme = isThemeValue(theme) ? theme : "system";

  return (
    <div
      className="flex items-center rounded-[3px] border border-[#d0d7de] bg-white p-0.5 content-visibility-auto contain-intrinsic-height-[195px] dark:border-[#30363d] dark:bg-[#1a1e23]"
      role="radiogroup"
      aria-label="Theme selection"
    >
      {themes.map(({ value, icon: Icon, label }, index) => (
        <button
          key={value}
          type="button"
          ref={(element) => {
            themeButtons.current[index] = element;
          }}
          onClick={() => setTheme(value)}
          onKeyDown={(event) => {
            if (
              event.key !== "ArrowDown" &&
              event.key !== "ArrowLeft" &&
              event.key !== "ArrowRight" &&
              event.key !== "ArrowUp"
            ) {
              return;
            }

            event.preventDefault();
            const direction =
              event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
            const nextIndex =
              (index + direction + themes.length) % themes.length;
            const nextTheme = themes[nextIndex];

            setTheme(nextTheme.value);
            themeButtons.current[nextIndex]?.focus();
          }}
          className={clsx(
            "flex h-6 w-6 cursor-pointer items-center justify-center rounded-[2px] transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0969da] focus-visible:ring-offset-1",
            selectedTheme === value
              ? "bg-gray-100 text-gray-900 dark:bg-[#30363d] dark:text-gray-100"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-[#22262c] dark:hover:text-gray-200",
          )}
          aria-label={label}
          title={label}
          role="radio"
          aria-checked={selectedTheme === value}
          tabIndex={selectedTheme === value ? 0 : -1}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
