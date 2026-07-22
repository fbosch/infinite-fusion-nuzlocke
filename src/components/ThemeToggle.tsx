"use client";

import clsx from "clsx";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/useMounted";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  if (mounted === false) {
    return (
      <div className="flex items-center rounded-[3px] border border-[#d0d7de] bg-white p-0.5 dark:border-[#30363d] dark:bg-[#1a1e23]">
        <div className="h-6 w-6 rounded-[2px] bg-gray-100 dark:bg-[#30363d]" />
        <div className="h-6 w-6 rounded-[2px]" />
        <div className="h-6 w-6 rounded-[2px]" />
      </div>
    );
  }

  const themes = [
    { value: "system", icon: Monitor, label: "System theme" },
    { value: "light", icon: Sun, label: "Light theme" },
    { value: "dark", icon: Moon, label: "Dark theme" },
  ];

  return (
    <div
      className="flex items-center rounded-[3px] border border-[#d0d7de] bg-white p-0.5 content-visibility-auto contain-intrinsic-height-[195px] dark:border-[#30363d] dark:bg-[#1a1e23]"
      role="radiogroup"
      aria-label="Theme selection"
    >
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={clsx(
            "flex h-6 w-6 cursor-pointer items-center justify-center rounded-[2px] transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0969da] focus-visible:ring-offset-1",
            theme === value
              ? "bg-gray-100 text-gray-900 dark:bg-[#30363d] dark:text-gray-100"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-[#22262c] dark:hover:text-gray-200",
          )}
          aria-label={label}
          title={label}
          role="radio"
          aria-checked={theme === value}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
