"use client";

import clsx from "clsx";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useMounted } from "@/hooks/use-mounted";

const themes = [
  { icon: Monitor, label: "System theme", value: "system" },
  { icon: Sun, label: "Light theme", value: "light" },
  { icon: Moon, label: "Dark theme", value: "dark" },
] as const;

type ThemeValue = (typeof themes)[number]["value"];

const isThemeValue = (value: string | undefined): value is ThemeValue =>
  themes.some((theme) => theme.value === value);

export default function ThemeToggle() {
  const { theme: currentTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const handleThemeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;

    if (isThemeValue(value)) {
      setTheme(value);
    }
  };

  const handleThemeKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      event.key !== "ArrowDown" &&
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "ArrowUp"
    ) {
      return;
    }

    event.preventDefault();
    const currentIndex = themes.findIndex(
      (option) => option.value === event.currentTarget.value,
    );
    const direction =
      event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
    const nextIndex =
      (currentIndex + direction + themes.length) % themes.length;
    const nextTheme = themes[nextIndex];

    setTheme(nextTheme.value);
    event.currentTarget
      .closest('[role="radiogroup"]')
      ?.querySelectorAll<HTMLInputElement>('input[type="radio"]')
      [nextIndex]?.focus();
  };

  if (mounted === false) {
    return (
      <div className="flex items-center rounded-[3px] border border-[#d0d7de] bg-white p-0.5 dark:border-[#30363d] dark:bg-[#1a1e23]">
        <div className="h-6 w-6 rounded-[2px] bg-gray-100 dark:bg-[#30363d]" />
        <div className="h-6 w-6 rounded-[2px]" />
        <div className="h-6 w-6 rounded-[2px]" />
      </div>
    );
  }

  const selectedTheme = isThemeValue(currentTheme) ? currentTheme : "system";

  return (
    <div
      aria-label="Theme selection"
      className="contain-intrinsic-height-[195px] flex items-center rounded-[3px] border border-[#d0d7de] bg-white p-0.5 content-visibility-auto dark:border-[#30363d] dark:bg-[#1a1e23]"
      role="radiogroup"
    >
      {themes.map(({ value, icon: Icon, label }) => (
        <label
          className={clsx(
            "flex h-6 w-6 cursor-pointer items-center justify-center rounded-[2px] transition-colors duration-150",
            "has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-[#0969da] has-[input:focus-visible]:ring-offset-1",
            selectedTheme === value
              ? "bg-gray-100 text-gray-900 dark:bg-[#30363d] dark:text-gray-100"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-[#22262c] dark:hover:text-gray-200",
          )}
          key={value}
          title={label}
        >
          <input
            aria-checked={selectedTheme === value}
            aria-label={label}
            checked={selectedTheme === value}
            className="sr-only"
            name="theme"
            onChange={handleThemeChange}
            onKeyDown={handleThemeKeyDown}
            tabIndex={selectedTheme === value ? 0 : -1}
            type="radio"
            value={value}
          />
          <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        </label>
      ))}
    </div>
  );
}
